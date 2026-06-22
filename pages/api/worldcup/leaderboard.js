import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'DB not configured' })
  const db = supabaseAdmin()

  const { data: preds } = await db
    .from('wc_predictions')
    .select('player_name, player_id, prediction, is_correct')

  if (!preds) return res.status(200).json([])

  const map = {}
  for (const p of preds) {
    const key = p.player_name
    if (!map[key]) map[key] = { name: p.player_name, playerId: p.player_id, total: 0, correct: 0, pending: 0 }
    if (p.is_correct === null) {
      map[key].pending++
    } else {
      // Only count finished-match predictions in total/correct
      map[key].total++
      if (p.is_correct === true) map[key].correct++
    }
  }

  const board = Object.values(map)
    .filter(p => p.total > 0 || p.pending > 0)
    .sort((a, b) => b.correct - a.correct || (b.correct / (b.total || 1)) - (a.correct / (a.total || 1)) || b.pending - a.pending)

  return res.status(200).json(board)
}
