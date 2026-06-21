import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'DB not configured' })
  const db = supabaseAdmin()
  const { data } = await db.from('wc_predictions').select('match_id, player_name, prediction, is_correct')
  const grouped = {}
  for (const p of (data || [])) {
    if (!grouped[p.match_id]) grouped[p.match_id] = []
    grouped[p.match_id].push(p)
  }
  return res.status(200).json(grouped)
}
