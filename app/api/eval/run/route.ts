import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/eval/run — record an eval run result
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { project_id, agent_id, test_set_version, score, pass_count, fail_count } = body

  if (!project_id || !agent_id || test_set_version === undefined || score === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Calculate degradation delta from previous run
  const { data: previousRun } = await supabaseAdmin
    .from('eval_runs')
    .select('score')
    .eq('project_id', project_id)
    .eq('agent_id', agent_id)
    .eq('test_set_version', test_set_version)
    .order('run_at', { ascending: false })
    .limit(1)
    .single()

  const degradation_delta = previousRun ? score - previousRun.score : null
  const flagged = degradation_delta !== null && degradation_delta < -10

  const { data, error } = await supabaseAdmin
    .from('eval_runs')
    .insert({
      project_id,
      agent_id,
      test_set_version,
      score,
      pass_count: pass_count || 0,
      fail_count: fail_count || 0,
      degradation_delta,
      flagged,
    } as never)
    .select('id, run_at, score, degradation_delta, flagged')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// GET /api/eval/run?project_id=...&agent_id=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const project_id = searchParams.get('project_id')
  const agent_id = searchParams.get('agent_id')

  if (!project_id) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('eval_runs')
    .select('*')
    .eq('project_id', project_id)
    .order('run_at', { ascending: false })
    .limit(50)

  if (agent_id) query = query.eq('agent_id', agent_id)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
