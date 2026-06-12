// PATCH  /api/admin/groups/[id] — approve/reject/add/remove members (admin only)
// DELETE /api/admin/groups/[id] — delete a group (admin only)
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'

function isAdmin(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`
}

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  const { id } = req.query
  const db = supabaseAdmin()

  if (req.method === 'PATCH') {
    const { action, playerId, color } = req.body

    if (action === 'updateSettings') {
      if (!color) return res.status(400).json({ error: 'color is required' })
      try {
        const { data, error } = await db
          .from('groups')
          .update({ color })
          .eq('id', id)
          .select('id, name, color, logo_url, created_at')
          .single()
        if (error) throw error
        return res.status(200).json(data)
      } catch (e) {
        return res.status(500).json({ error: e.message })
      }
    }

    if (!playerId) return res.status(400).json({ error: 'playerId is required' })

    try {
      if (action === 'approve' || action === 'addMember') {
        const { error } = await db
          .from('group_members')
          .upsert({ group_id: id, player_id: playerId, status: 'approved' })
        if (error) throw error
        return res.status(200).json({ ok: true })
      }

      if (action === 'reject' || action === 'removeMember') {
        const { error } = await db
          .from('group_members')
          .delete()
          .eq('group_id', id)
          .eq('player_id', playerId)
        if (error) throw error
        return res.status(200).json({ ok: true })
      }

      return res.status(400).json({ error: 'Unknown action' })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await db.from('groups').delete().eq('id', id)
      if (error) throw error
      return res.status(204).end()
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
