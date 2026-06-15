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
    const { data: players, error } = await db
      .from('players')
      .select('id, name, phone, positions, skill_rating, position_skills, created_at')
      .order('name')
    if (error) throw error

    const { data: confirmedPolls, error: pollsError } = await db
      .from('polls')
      .select('players')
      .eq('status', 'confirmed')
    if (pollsError) throw pollsError

    const gamesPlayed = {} // key: `id:<id>` or `name:<lowercase name>` -> count
    for (const poll of confirmedPolls) {
      for (const p of poll.players || []) {
        const key = p.playerId ? `id:${p.playerId}` : `name:${p.name.toLowerCase()}`
        gamesPlayed[key] = (gamesPlayed[key] || 0) + 1
      }
    }

    const withStats = players.map(p => ({
      ...p,
      gamesPlayed: (gamesPlayed[`id:${p.id}`] || 0) + (gamesPlayed[`name:${p.name.toLowerCase()}`] || 0),
    }))

    return res.status(200).json(withStats)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
