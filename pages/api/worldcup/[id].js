import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { flag } from '../../../lib/wcFlags'

export default async function handler(req, res) {
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'DB not configured' })
  const db = supabaseAdmin()
  const { id } = req.query

  if (req.method === 'GET') {
    const [matchRes, predsRes, chatRes] = await Promise.all([
      db.from('wc_matches').select('*').eq('id', id).single(),
      db.from('wc_predictions').select('*').eq('match_id', id).order('created_at'),
      db.from('wc_chat').select('*').eq('match_id', id).order('created_at'),
    ])
    if (matchRes.error || !matchRes.data) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json({ match: matchRes.data, predictions: predsRes.data || [], chat: chatRes.data || [] })
  }

  if (req.method === 'POST') {
    // Submit / update prediction
    const { playerName, playerId, prediction } = req.body
    if (!playerName || !['home','draw','away'].includes(prediction))
      return res.status(400).json({ error: 'playerName and valid prediction required' })

    const { data: match } = await db.from('wc_matches').select('match_date,status').eq('id', id).single()
    if (!match) return res.status(404).json({ error: 'Match not found' })
    if (match.status !== 'upcoming' || new Date(match.match_date) <= new Date())
      return res.status(400).json({ error: 'Predictions are locked for this match' })

    const { error } = await db.from('wc_predictions').upsert(
      { match_id: id, player_name: playerName, player_id: playerId || null, prediction },
      { onConflict: 'match_id,player_name' }
    )
    if (error) return res.status(500).json({ error: error.message })
    const { data: preds } = await db.from('wc_predictions').select('*').eq('match_id', id)
    return res.status(200).json(preds || [])
  }

  if (req.method === 'PATCH') {
    // Admin: update score
    const pw = (req.headers.authorization || '').replace('Bearer ', '')
    if (pw !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Forbidden' })
    const { scoreHome, scoreAway, status } = req.body

    const update = {}
    if (scoreHome != null) update.score_home = scoreHome
    if (scoreAway != null) update.score_away = scoreAway
    if (status) update.status = status

    const { data: updated, error } = await db.from('wc_matches').update(update).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })

    // If finished, mark correct predictions
    if (status === 'finished' && scoreHome != null && scoreAway != null) {
      const result = scoreHome > scoreAway ? 'home' : scoreAway > scoreHome ? 'away' : 'draw'
      await db.from('wc_predictions').update({ is_correct: true  }).eq('match_id', id).eq('prediction', result)
      await db.from('wc_predictions').update({ is_correct: false }).eq('match_id', id).neq('prediction', result)
    }
    return res.status(200).json(updated)
  }

  res.status(405).end()
}
