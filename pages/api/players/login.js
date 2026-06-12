// POST /api/players/login — log in to an existing profile with name + PIN
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { verifyPin } from '../../../lib/players'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  const { name, pin } = req.body
  if (!name || !pin) return res.status(400).json({ error: 'Name and PIN are required' })

  try {
    const db = supabaseAdmin()
    const { data: player, error } = await db
      .from('players')
      .select('*')
      .ilike('name', name.trim())
      .maybeSingle()
    if (error) throw error

    if (!player || !verifyPin(pin, player.pin_hash)) {
      return res.status(401).json({ error: 'Name or PIN is incorrect' })
    }

    const { pin_hash, ...profile } = player
    return res.status(200).json(profile)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
