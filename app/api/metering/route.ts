import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateCost } from '@/lib/pricing'

// POST /api/metering — record a metering event
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { project_id, session_id, agent_id, model, input_tokens, output_tokens } = body

  if (!project_id || !agent_id || !model) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const cost_usd = calculateCost(model, input_tokens || 0, output_tokens || 0)

  const { data, error } = await supabaseAdmin
    .from('metering_events')
    .insert({
      project_id,
      session_id: session_id || null,
      agent_id,
      model,
      input_tokens: input_tokens || 0,
      output_tokens: output_tokens || 0,
      cost_usd,
    } as never)
    .select('id, cost_usd, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// GET /api/metering?project_id=...&view=daily|monthly|agent
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const project_id = searchParams.get('project_id')
  const view = searchParams.get('view') || 'daily'

  if (!project_id) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  }

  const viewMap: Record<string, string> = {
    daily: 'daily_cost_by_project',
    monthly: 'monthly_cost_by_project',
    agent: 'cost_by_agent',
  }

  const viewName = viewMap[view]
  if (!viewName) {
    return NextResponse.json({ error: 'Invalid view. Use: daily, monthly, agent' }, { status: 400 })
  }

  const orderColumn = view === 'agent' ? 'total_cost' : view === 'daily' ? 'day' : 'month'

  const { data, error } = await supabaseAdmin
    .from(viewName)
    .select('*')
    .eq('project_id', project_id)
    .order(orderColumn, { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
