import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkRateLimit } from '@caistech/platform-trust-middleware'

// POST /api/rate-limit/check — check rate limit for an agent
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { project_id, agent_id, token_id } = body

  if (!project_id || !agent_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const result = await checkRateLimit(supabaseAdmin, { project_id, agent_id, token_id })

  if (!result.allowed) {
    return NextResponse.json(result, {
      status: 429,
      headers: {
        'Retry-After': String(result.retry_after_seconds || 60),
      },
    })
  }

  return NextResponse.json(result)
}

// GET /api/rate-limit?project_id=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const project_id = searchParams.get('project_id')

  if (!project_id) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .select('*')
    .eq('project_id', project_id)
    .order('window_type')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
