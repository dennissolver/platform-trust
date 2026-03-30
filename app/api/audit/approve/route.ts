import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/audit/approve — approve or reject a pending audit entry
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { audit_log_id, decision, decided_by, reason } = body

  if (!audit_log_id || !decision || !decided_by) {
    return NextResponse.json({ error: 'Missing required fields: audit_log_id, decision, decided_by' }, { status: 400 })
  }

  if (!['approved', 'rejected'].includes(decision)) {
    return NextResponse.json({ error: 'Decision must be "approved" or "rejected"' }, { status: 400 })
  }

  // Verify the audit entry exists and is pending
  const { data: auditEntry, error: fetchError } = await supabaseAdmin
    .from('audit_log')
    .select('id, project_id, status, created_at')
    .eq('id', audit_log_id)
    .single()

  if (fetchError || !auditEntry) {
    return NextResponse.json({ error: 'Audit entry not found' }, { status: 404 })
  }

  if (auditEntry.status !== 'pending_approval') {
    return NextResponse.json({
      error: `Cannot approve/reject: current status is "${auditEntry.status}"`,
    }, { status: 409 })
  }

  // Check timeout (24h default)
  const createdAt = new Date(auditEntry.created_at)
  const now = new Date()
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
  if (hoursSinceCreation > 24) {
    // Auto-expire
    await supabaseAdmin
      .from('audit_log')
      .update({
        status: 'failed',
        approved_by: 'system:timeout',
        approved_at: now.toISOString(),
      })
      .eq('id', audit_log_id)

    return NextResponse.json({
      error: 'Approval window expired (24h). Entry has been auto-rejected.',
    }, { status: 410 })
  }

  // Update audit_log with decision
  const newStatus = decision === 'approved' ? 'completed' : 'failed'
  const { error: updateError } = await supabaseAdmin
    .from('audit_log')
    .update({
      status: newStatus,
      approved_by: decided_by,
      approved_at: now.toISOString(),
    })
    .eq('id', audit_log_id)
    .eq('status', 'pending_approval') // optimistic lock

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Record the decision
  const { error: decisionError } = await supabaseAdmin
    .from('approval_decisions')
    .insert({
      audit_log_id,
      project_id: auditEntry.project_id,
      decision,
      decided_by,
      reason: reason || null,
    } as never)

  if (decisionError) {
    console.error('Failed to record approval decision:', decisionError)
  }

  return NextResponse.json({
    audit_log_id,
    decision,
    new_status: newStatus,
    decided_by,
    decided_at: now.toISOString(),
  })
}

// GET /api/audit/approve?project_id=... — list pending approvals
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const project_id = searchParams.get('project_id')

  let query = supabaseAdmin
    .from('audit_log')
    .select('*, projects!inner(name, slug)')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })
    .limit(50)

  if (project_id) {
    query = query.eq('project_id', project_id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Tag expired entries
  const now = new Date()
  const results = (data || []).map((entry: Record<string, unknown>) => {
    const createdAt = new Date(entry.created_at as string)
    const hoursRemaining = 24 - (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    return {
      ...entry,
      hours_remaining: Math.max(0, Math.round(hoursRemaining * 10) / 10),
      is_expired: hoursRemaining <= 0,
    }
  })

  return NextResponse.json({ data: results })
}
