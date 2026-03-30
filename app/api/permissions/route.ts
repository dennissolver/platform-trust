import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/permissions/check — check if an operation is permitted
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { project_id, agent_id, scope, operation } = body

  if (!project_id || !agent_id || !scope || !operation) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: policy, error } = await supabaseAdmin
    .from('permission_policies')
    .select('*')
    .eq('project_id', project_id)
    .eq('agent_id', agent_id)
    .eq('scope', scope)
    .eq('operation', operation)
    .single()

  if (error || !policy) {
    return NextResponse.json({
      allowed: false,
      requires_approval: false,
      policy_id: null,
      approval_roles: [],
    })
  }

  return NextResponse.json({
    allowed: true,
    requires_approval: policy.requires_approval,
    policy_id: policy.id,
    approval_roles: policy.approval_roles,
  })
}

// GET /api/permissions?project_id=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const project_id = searchParams.get('project_id')

  if (!project_id) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('permission_policies')
    .select('*')
    .eq('project_id', project_id)
    .order('agent_id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
