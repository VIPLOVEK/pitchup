// PATCH  /api/admin/players/[id] — admin actions: resetPin
// DELETE /api/admin/players/[id] — delete a player profile
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
    const { action } = req.body
    if (action !== 'resetPin') return res.status(400).json({ error: 'Unknown action' })

    try {
      // Clear the PIN rather than issuing a new one — the admin never learns
      // the player's PIN. The player picks a new one the next time they log in.
      const { data, error } = await db
        .from('players')
        .update({ pin_hash: null })
        .eq('id', id)
        .select('id, name')
        .single()
      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Player not found' })

      return res.status(200).json({ id: data.id, name: data.name })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await db.from('players').delete().eq('id', id)
      if (error) throw error
      return res.status(204).end()
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
