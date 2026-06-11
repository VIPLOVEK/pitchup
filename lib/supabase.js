import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

// Client-side (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnon)

// Server-side only (service role)
export function supabaseAdmin() {
  return createClient(supabaseUrl, supabaseService)
}

export function isSupabaseConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== 'placeholder'
  )
}
