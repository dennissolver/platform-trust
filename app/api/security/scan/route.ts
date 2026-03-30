import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/security/scan — record a security scan result
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { project_id, repo_url, scan_type, triggered_by, findings, severity_summary, compliance_status, report_url } = body

  if (!project_id || !scan_type || !triggered_by || !compliance_status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('security_scans')
    .insert({
      project_id,
      repo_url: repo_url || null,
      scan_type,
      triggered_by,
      findings: findings || [],
      severity_summary: severity_summary || { critical: 0, high: 0, medium: 0, low: 0 },
      compliance_status,
      report_url: report_url || null,
    } as never)
    .select('id, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// GET /api/security/scan?project_id=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const project_id = searchParams.get('project_id')

  if (!project_id) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('security_scans')
    .select('*')
    .eq('project_id', project_id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
