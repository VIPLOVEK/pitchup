// POST /api/polls — create a new poll (admin only)
import { supabaseAdmin, isSupabaseConfigured } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Database not configured yet. Add Supabase env vars in Vercel.' })
  }

  const { title, location, slots, threshold } = req.body

  if (!title || !location || !Array.isArray(slots) || slots.length === 0 || !threshold) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('polls')
      .insert({ title, location, slots, threshold, closed: false, players: [], teams: null })
      .select()
      .single()

    if (error) throw error
    return res.status(201).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
