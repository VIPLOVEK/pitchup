// GET /api/groups — list groups (optionally with this player's membership status)
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(200).json([])

  const { playerId } = req.query

  try {
    const db = supabaseAdmin()
    const { data: groups, error } = await db.from('groups').select('id, name, color, logo_url').order('name')
    if (error) throw error

    if (!playerId) return res.status(200).json(groups.map(g => ({ ...g, status: null })))

    const { data: memberships, error: memErr } = await db
      .from('group_members')
      .select('group_id, status')
      .eq('player_id', playerId)
    if (memErr) throw memErr

    const statusByGroup = Object.fromEntries(memberships.map(m => [m.group_id, m.status]))
    return res.status(200).json(groups.map(g => ({ ...g, status: statusByGroup[g.id] || null })))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
