// GET /api/admin/players — list all player profiles (admin only)
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!isSupabaseConfigured()) {
    return res.status(200).json([]) // Return empty roster — DB not set up yet
  }

  try {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('players')
      .select('id, name, phone, position, created_at')
      .order('name')

    if (error) throw error
    return res.status(200).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
