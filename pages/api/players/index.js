// GET  /api/players — list profiles (id, name, position) for vote-page autocomplete
// POST /api/players — create a player profile
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { hashPin } from '../../../lib/players'
import { POSITIONS } from '../../../lib/positions'

export default async function handler(req, res) {
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  if (req.method === 'GET') {
    try {
      const db = supabaseAdmin()
      const { data, error } = await db
        .from('players')
        .select('id, name, position')
        .order('name')
      if (error) throw error
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method !== 'POST') return res.status(405).end()

  const { name, phone, position, pin } = req.body
  if (!name || !pin) return res.status(400).json({ error: 'Name and PIN are required' })
  if (!/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: 'PIN must be 4-6 digits' })
  if (position && !POSITIONS.includes(position)) return res.status(400).json({ error: 'Invalid position' })

  try {
    const db = supabaseAdmin()

    const { data: existing } = await db
      .from('players')
      .select('id')
      .ilike('name', name.trim())
      .maybeSingle()
    if (existing) return res.status(409).json({ error: 'That name is already taken' })

    const { data, error } = await db
      .from('players')
      .insert({
        name: name.trim(),
        phone: phone?.trim() || null,
        position: position || 'Any',
        pin_hash: hashPin(pin),
      })
      .select('id, name, phone, position')
      .single()
    if (error) throw error

    return res.status(201).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
