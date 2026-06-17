// GET /api/leaderboard — public win/loss/draw record per player, derived
// from confirmed polls that have a final score recorded.
import { supabaseAdmin, isSupabaseConfigured } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(200).json([])

  try {
    const db = supabaseAdmin()

    const { data: players, error: playersError } = await db
      .from('players')
      .select('id, name')
    if (playersError) throw playersError

    const { data: polls, error: pollsError } = await db
      .from('polls')
      .select('teams, score_a, score_b, goals')
      .eq('status', 'confirmed')
      .not('score_a', 'is', null)
      .not('score_b', 'is', null)
    if (pollsError) throw pollsError

    const { data: allConfirmed, error: allErr } = await db
      .from('polls')
      .select('teams')
      .eq('status', 'confirmed')
    if (allErr) throw allErr

    const records = {} // key -> { name, wins, losses, draws }
    const keyFor = (p) => p.playerId ? `id:${p.playerId}` : `name:${p.name.toLowerCase()}`
    const record = (p, outcome) => {
      const key = keyFor(p)
      if (!records[key]) records[key] = { name: p.name, wins: 0, losses: 0, draws: 0 }
      records[key][outcome]++
    }

    for (const poll of polls) {
      const { teamA = [], teamB = [] } = poll.teams || {}
      const outcomeA = poll.score_a > poll.score_b ? 'wins' : poll.score_a < poll.score_b ? 'losses' : 'draws'
      const outcomeB = poll.score_a > poll.score_b ? 'losses' : poll.score_a < poll.score_b ? 'wins' : 'draws'
      teamA.forEach(p => record(p, outcomeA))
      teamB.forEach(p => record(p, outcomeB))
    }

    const goalCounts = {}
    for (const poll of polls) {
      ;(poll.goals || []).forEach(g => {
        goalCounts[g.name.toLowerCase()] = (goalCounts[g.name.toLowerCase()] || 0) + 1
      })
    }

    const committed = {}
    for (const poll of allConfirmed) {
      const { teamA = [], teamB = [] } = poll.teams || {}
      ;[...teamA, ...teamB].forEach(p => {
        const key = keyFor(p)
        committed[key] = (committed[key] || 0) + 1
      })
    }

    // Prefer the profile's current name (in case a player renamed themselves).
    for (const player of players) {
      const key = `id:${player.id}`
      if (records[key]) records[key].name = player.name
    }

    const leaderboard = Object.entries(records)
      .map(([key, r]) => {
        const gamesPlayed = r.wins + r.losses + r.draws
        const gamesCommitted = committed[key] || gamesPlayed
        return { ...r, gamesPlayed, gamesCommitted, winPct: gamesPlayed ? r.wins / gamesPlayed : 0, goals: goalCounts[r.name.toLowerCase()] || 0 }
      })
      .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins || b.gamesPlayed - a.gamesPlayed)

    return res.status(200).json(leaderboard)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
