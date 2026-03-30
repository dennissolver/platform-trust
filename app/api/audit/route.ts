import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/audit — write an audit log entry
export async function POST(request: NextRequest) {
  const body = await request.json()

  const { project_id, session_id, agent_id, tool_name, operation_type, input_hash, output_hash, status, duration_ms, requires_human_approval, approved_by } = body

  if (!project_id || !agent_id || !tool_name || !operation_type || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .insert({
      project_id,
      session_id: session_id || null,
      agent_id,
      tool_name,
      operation_type,
      input_hash: input_hash || null,
      output_hash: output_hash || null,
      status,
      duration_ms: duration_ms || null,
      requires_human_approval: requires_human_approval || false,
      approved_by: approved_by || null,
      approved_at: approved_by ? new Date().toISOString() : null,
    } as never)
    .select('id, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// GET /api/audit?project_id=...&limit=50&offset=0
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const project_id = searchParams.get('project_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const status = searchParams.get('status')
  const agent_id = searchParams.get('agent_id')

  if (!project_id) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('project_id', project_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (agent_id) query = query.eq('agent_id', agent_id)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, total: count })
}
