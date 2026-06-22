import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { flag } from '../../../lib/wcFlags'

let lastSync = 0

async function syncFromApi(db) {
  const key = process.env.FOOTBALL_DATA_API_KEY
  if (!key) return 'no API key'
  if (Date.now() - lastSync < 30 * 60 * 1000) return null
  lastSync = Date.now()
  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches?limit=200', {
      headers: { 'X-Auth-Token': key },
    })
    if (!res.ok) return `API error ${res.status}: ${await res.text()}`
    const body = await res.json()
    const matches = body.matches
    if (!Array.isArray(matches)) return `unexpected API response: ${JSON.stringify(body).slice(0, 200)}`
    for (const m of matches) {
      const teamHome = m.homeTeam?.name || 'TBD'
      const teamAway = m.awayTeam?.name || 'TBD'
      const stage = m.stage === 'GROUP_STAGE' ? 'group'
        : m.stage === 'ROUND_OF_32' ? 'r32'
        : m.stage === 'ROUND_OF_16' ? 'r16'
        : m.stage === 'QUARTER_FINALS' ? 'qf'
        : m.stage === 'SEMI_FINALS' ? 'sf'
        : m.stage === 'FINAL' ? 'final' : 'group'
      const status = m.status === 'FINISHED' ? 'finished'
        : m.status === 'IN_PLAY' || m.status === 'PAUSED' ? 'live' : 'upcoming'
      const upsert = {
        match_number: m.id,
        stage,
        group_name: m.group ? m.group.replace('GROUP_', '') : null,
        match_date: m.utcDate,
        team_home: teamHome,
        team_away: teamAway,
        flag_home: flag(teamHome),
        flag_away: flag(teamAway),
        score_home: m.score?.fullTime?.home ?? null,
        score_away: m.score?.fullTime?.away ?? null,
        status,
        venue: m.venue,
      }
      await db.from('wc_matches').upsert(upsert, { onConflict: 'match_number', ignoreDuplicates: false })
    }
    // After syncing scores, update is_correct on predictions
    const finished = matches.filter(m => m.status === 'FINISHED')
    for (const m of finished) {
      const sh = m.score?.fullTime?.home, sa = m.score?.fullTime?.away
      if (sh == null || sa == null) continue
      const result = sh > sa ? 'home' : sa > sh ? 'away' : 'draw'
      const { data: row } = await db.from('wc_matches').select('id').eq('match_number', m.id).single()
      if (!row) continue
      await db.from('wc_predictions').update({ is_correct: true  }).eq('match_id', row.id).eq('prediction', result)
      await db.from('wc_predictions').update({ is_correct: false }).eq('match_id', row.id).neq('prediction', result).not('is_correct', 'is', true)
    }
    return null
  } catch (e) {
    return `sync exception: ${e.message}`
  }
}

export default async function handler(req, res) {
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'DB not configured' })
  const db = supabaseAdmin()

  // Force sync if requested by admin
  if (req.method === 'POST') {
    const pw = (req.headers.authorization || '').replace('Bearer ', '')
    if (pw !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Forbidden' })
    lastSync = 0 // reset throttle
    await syncFromApi(db)
    const { data } = await db.from('wc_matches').select('*').order('match_date', { ascending: true })
    return res.status(200).json(data || [])
  }

  // Blocking sync on GET — keeps data fresh, adds ~1s on cold sync
  await syncFromApi(db)
  const { data, error } = await db.from('wc_matches').select('*').order('match_date', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data || [])
}
