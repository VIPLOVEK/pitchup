// POST /api/groups/[id]/join — request to join a group (status starts as 'pending')
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  const { id } = req.query
  const { playerId } = req.body
  if (!playerId) return res.status(400).json({ error: 'playerId is required' })

  try {
    const db = supabaseAdmin()
    const { data: group, error: groupErr } = await db.from('groups').select('id').eq('id', id).maybeSingle()
    if (groupErr) throw groupErr
    if (!group) return res.status(404).json({ error: 'Group not found' })

    const { data: existing, error: existingErr } = await db
      .from('group_members')
      .select('status')
      .eq('group_id', id)
      .eq('player_id', playerId)
      .maybeSingle()
    if (existingErr) throw existingErr
    if (existing) return res.status(200).json({ status: existing.status })

    const { error } = await db
      .from('group_members')
      .insert({ group_id: id, player_id: playerId, status: 'pending' })
    if (error) throw error

    return res.status(200).json({ status: 'pending' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
