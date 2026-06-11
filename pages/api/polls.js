// POST /api/polls  — create a new poll (admin only)
import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Simple password guard — replace with proper auth if needed
  const { authorization } = req.headers
  if (authorization !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { title, location, slots, threshold } = req.body

  if (!title || !location || !Array.isArray(slots) || slots.length === 0 || !threshold) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const db = supabaseAdmin()

  const { data, error } = await db
    .from('polls')
    .insert({
      title,
      location,
      slots,           // text[]
      threshold,       // int
      closed: false,
      players: [],     // jsonb[]
      teams: null,     // jsonb
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  return res.status(201).json(data)
}
