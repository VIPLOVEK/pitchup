// GET   /api/players/[id] — fetch a profile (used to restore a saved session)
// PATCH /api/players/[id] — update phone/positions (requires current PIN)
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { verifyPin } from '../../../lib/players'
import { POSITIONS } from '../../../lib/positions'

export default async function handler(req, res) {
  const { id } = req.query
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })
  const db = supabaseAdmin()

  if (req.method === 'GET') {
    try {
      const { data, error } = await db
        .from('players')
        .select('id, name, phone, positions, skill_rating, skill_rating_updated_at')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'PATCH') {
    const { pin, phone, positions, skillRating } = req.body
    if (!pin) return res.status(400).json({ error: 'Current PIN is required' })
    if (positions && (!Array.isArray(positions) || positions.some(p => !POSITIONS.includes(p)))) {
      return res.status(400).json({ error: 'Invalid position' })
    }
    if (skillRating !== undefined && (!Number.isInteger(skillRating) || skillRating < 1 || skillRating > 5)) {
      return res.status(400).json({ error: 'Skill rating must be between 1 and 5' })
    }

    try {
      const { data: player, error: fetchErr } = await db.from('players').select('*').eq('id', id).maybeSingle()
      if (fetchErr) throw fetchErr
      if (!player || !verifyPin(pin, player.pin_hash)) {
        return res.status(401).json({ error: 'PIN is incorrect' })
      }

      const update = {}
      if (phone !== undefined) update.phone = phone?.trim() || null
      if (positions !== undefined) update.positions = positions
      if (skillRating !== undefined) {
        update.skill_rating = skillRating
        update.skill_rating_updated_at = new Date().toISOString()
      }

      const { data, error } = await db
        .from('players')
        .update(update)
        .eq('id', id)
        .select('id, name, phone, positions, skill_rating, skill_rating_updated_at')
        .single()
      if (error) throw error

      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
