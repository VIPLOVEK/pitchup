// PATCH  /api/admin/players/[id] — admin actions: resetPin
// DELETE /api/admin/players/[id] — delete a player profile
import crypto from 'crypto'
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'
import { hashPin } from '../../../../lib/players'

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
      // 6-digit PIN drawn from a CSPRNG, matching the player-chosen PIN format
      const newPin = String(crypto.randomInt(0, 1000000)).padStart(6, '0')

      const { data, error } = await db
        .from('players')
        .update({ pin_hash: hashPin(newPin) })
        .eq('id', id)
        .select('id, name')
        .single()
      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Player not found' })

      // The plaintext PIN is only ever returned here, for the admin to relay
      // to the player out-of-band. It is never stored.
      return res.status(200).json({ id: data.id, name: data.name, pin: newPin })
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
