// GET /api/announcement — returns the latest active pinned announcement (public)
import { supabaseAdmin, isSupabaseConfigured } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(200).json(null)

  const db = supabaseAdmin()
  const { data } = await db
    .from('announcements')
    .select('id, message, created_at')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return res.status(200).json(data || null)
}
