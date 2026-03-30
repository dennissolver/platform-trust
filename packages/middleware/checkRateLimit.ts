import { SupabaseClient } from '@supabase/supabase-js'

export interface RateLimitInput {
  project_id: string
  agent_id: string
  token_id?: string
}

export interface RateLimitResult {
  allowed: boolean
  window_type?: string
  current_count?: number
  max_requests?: number
  retry_after_seconds?: number
}

const WINDOW_SECONDS: Record<string, number> = {
  minute: 60,
  hour: 3600,
  day: 86400,
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  input: RateLimitInput
): Promise<RateLimitResult> {
  const { project_id, agent_id, token_id } = input

  // Fetch applicable rate limits (agent-specific or wildcard)
  const { data: limits, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('project_id', project_id)
    .in('agent_id', [agent_id, '*'])
    .order('window_type')

  if (error) {
    console.error('Rate limit check failed:', error)
    // Fail open on DB error — log but don't block
    return { allowed: true }
  }

  if (!limits || limits.length === 0) {
    return { allowed: true }
  }

  const now = new Date()

  for (const limit of limits) {
    const windowSeconds = WINDOW_SECONDS[limit.window_type]
    const windowStart = new Date(limit.window_start)
    const windowEnd = new Date(windowStart.getTime() + windowSeconds * 1000)

    if (now >= windowEnd) {
      // Window expired — reset counter atomically
      const { error: resetError } = await supabase
        .from('rate_limits')
        .update({
          current_count: 1,
          window_start: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', limit.id)

      if (resetError) {
        console.error('Rate limit reset failed:', resetError)
      }
      continue
    }

    // Window active — check if at limit
    if (limit.current_count >= limit.max_requests) {
      const retryAfter = Math.ceil((windowEnd.getTime() - now.getTime()) / 1000)
      return {
        allowed: false,
        window_type: limit.window_type,
        current_count: limit.current_count,
        max_requests: limit.max_requests,
        retry_after_seconds: retryAfter,
      }
    }

    // Increment counter atomically
    const { error: incError } = await supabase.rpc('increment_rate_limit', {
      limit_id: limit.id,
    })

    // Fallback if RPC not set up yet
    if (incError) {
      await supabase
        .from('rate_limits')
        .update({
          current_count: limit.current_count + 1,
          updated_at: now.toISOString(),
        })
        .eq('id', limit.id)
        .eq('current_count', limit.current_count) // optimistic lock
    }
  }

  return { allowed: true }
}
