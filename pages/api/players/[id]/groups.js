// GET /api/players/[id]/groups — approved group IDs for a player (no auth needed)
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(200).json({ groupIds: [] })

  const { id } = req.query
  try {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('group_members')
      .select('group_id')
      .eq('player_id', id)
      .eq('status', 'approved')
    if (error) throw error
    return res.status(200).json({ groupIds: (data || []).map(r => r.group_id) })
  } catch (e) {
    return res.status(500).json({ groupIds: [] })
  }
}
