import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { flag } from '../../../lib/wcFlags'

let lastSync = 0
const DATA_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

// Parse "HH:MM UTC±N" + date string → UTC ISO string
function parseMatchDate(date, time) {
  if (!time) return `${date}T00:00:00Z`
  const m = time.match(/^(\d{2}):(\d{2})\s+UTC([+-]\d+)$/)
  if (!m) return `${date}T00:00:00Z`
  const h = parseInt(m[1]), min = parseInt(m[2]), offset = parseInt(m[3])
  let utcH = h - offset
  const d = new Date(`${date}T00:00:00Z`)
  if (utcH >= 24) { utcH -= 24; d.setUTCDate(d.getUTCDate() + 1) }
  if (utcH < 0)   { utcH += 24; d.setUTCDate(d.getUTCDate() - 1) }
  return `${d.toISOString().split('T')[0]}T${String(utcH).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`
}

const ROUND_TO_STAGE = {
  'Round of 32': 'r32',
  'Round of 16': 'r16',
  'Quarter-final': 'qf',
  'Semi-final': 'sf',
  'Third place': 'third',
  'Final': 'final',
}

// Use penalties > ET > FT to determine match winner
function getResult(score) {
  const s = score.p || score.et || score.ft
  if (!Array.isArray(s)) return null
  return s[0] > s[1] ? 'home' : s[1] > s[0] ? 'away' : 'draw'
}

async function syncFromApi(db) {
  if (Date.now() - lastSync < 30 * 60 * 1000) return null
  lastSync = Date.now()
  try {
    const res = await fetch(DATA_URL)
    if (!res.ok) return `fetch error ${res.status}`
    const body = await res.json()
    const matches = body.matches
    if (!Array.isArray(matches)) return 'unexpected format'

    // Remove stale rows from old football-data.org sync (their IDs are 5+ digit numbers)
    await db.from('wc_matches').delete().gt('match_number', 200)

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i]
      const hasScore = Array.isArray(m.score?.ft)
      const teamHome = m.team1 || 'TBD'
      const teamAway = m.team2 || 'TBD'
      // Group matches have no num; knockout matches have num starting at 73
      const matchNum = m.num != null ? m.num : (i + 1)

      await db.from('wc_matches').upsert({
        match_number: matchNum,
        stage: ROUND_TO_STAGE[m.round] || 'group',
        group_name: m.group ? m.group.replace('Group ', '') : null,
        match_date: parseMatchDate(m.date, m.time),
        team_home: teamHome,
        team_away: teamAway,
        flag_home: flag(teamHome),
        flag_away: flag(teamAway),
        score_home: hasScore ? m.score.ft[0] : null,
        score_away: hasScore ? m.score.ft[1] : null,
        status: hasScore ? 'finished' : 'upcoming',
        venue: m.ground || null,
      }, { onConflict: 'match_number', ignoreDuplicates: false })
    }

    // Update is_correct on predictions for finished matches
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i]
      if (!m.score?.ft) continue
      const result = getResult(m.score)
      if (!result) continue
      const matchNum = m.num != null ? m.num : (i + 1)
      const { data: row } = await db.from('wc_matches').select('id').eq('match_number', matchNum).single()
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

  // Force sync (admin only)
  if (req.method === 'POST') {
    const pw = (req.headers.authorization || '').replace('Bearer ', '')
    if (pw !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'Forbidden' })
    lastSync = 0
    await syncFromApi(db)
    const { data } = await db.from('wc_matches').select('*').order('match_date', { ascending: true })
    return res.status(200).json(data || [])
  }

  // Skip sync when caller just wants cached data (e.g. home page widget)
  if (!req.query.noSync) await syncFromApi(db)
  const { data, error } = await db.from('wc_matches').select('*').order('match_date', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data || [])
}
