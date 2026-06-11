// GET /api/admin/polls — list all polls (admin only)
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!isSupabaseConfigured()) {
    return res.status(200).json([]) // Return empty polls — DB not set up yet
  }

  try {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return res.status(200).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
