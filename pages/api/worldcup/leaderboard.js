import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'DB not configured' })
  const db = supabaseAdmin()

  const { data: preds } = await db
    .from('wc_predictions')
    .select('player_name, player_id, prediction, is_correct, match_id, wc_matches(match_date)')

  if (!preds) return res.status(200).json([])

  const map = {}
  for (const p of preds) {
    const key = p.player_name
    if (!map[key]) map[key] = { name: p.player_name, playerId: p.player_id, total: 0, correct: 0, pending: 0, finishedPreds: [] }
    if (p.is_correct === null) {
      map[key].pending++
    } else {
      map[key].total++
      if (p.is_correct === true) map[key].correct++
      map[key].finishedPreds.push({ is_correct: p.is_correct, match_date: p.wc_matches?.match_date || null })
    }
  }

  const board = Object.values(map)
    .filter(p => p.total > 0 || p.pending > 0)
    .map(p => {
      // Calculate streak: consecutive correct from most recent finished
      const sorted = [...p.finishedPreds].sort((a, b) => {
        if (!a.match_date) return 1
        if (!b.match_date) return -1
        return new Date(b.match_date) - new Date(a.match_date)
      })
      let streak = 0
      for (const pred of sorted) {
        if (pred.is_correct === true) streak++
        else break
      }
      const { finishedPreds, ...rest } = p
      return { ...rest, streak }
    })
    .sort((a, b) => b.correct - a.correct || (b.correct / (b.total || 1)) - (a.correct / (a.total || 1)) || b.pending - a.pending)

  return res.status(200).json(board)
}
