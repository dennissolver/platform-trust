import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabaseAdmin: SupabaseClient | null = null
let _supabase: SupabaseClient | null = null

// Service role client — bypasses RLS, use only in server-side code
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_supabaseAdmin) {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      }
      _supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    }
    return (_supabaseAdmin as unknown as Record<string, unknown>)[prop as string]
  },
})

// Anon client — respects RLS, use in client-side or scoped access
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_supabase) {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
      }
      _supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
    }
    return (_supabase as unknown as Record<string, unknown>)[prop as string]
  },
})
