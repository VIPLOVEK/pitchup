// GET /api/player-stats?name=John — full game history for a player
import { supabaseAdmin, isSupabaseConfigured } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { name } = req.query
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
  if (!isSupabaseConfigured()) return res.status(200).json({ name, wins: 0, losses: 0, draws: 0, goals: 0, games: [] })

  try {
    const db = supabaseAdmin()
    const [{ data: polls, error }, { data: allConfirmed, error: allErr }] = await Promise.all([
      db.from('polls')
        .select('id, title, game_time, location, teams, score_a, score_b, goals, mvp_votes')
        .eq('status', 'confirmed')
        .not('score_a', 'is', null)
        .not('score_b', 'is', null)
        .order('game_time', { ascending: false }),
      db.from('polls')
        .select('teams, game_time')
        .eq('status', 'confirmed')
        .order('game_time', { ascending: false }),
    ])
    if (error) throw error
    if (allErr) throw allErr

    const nameLower = name.trim().toLowerCase()
    let wins = 0, losses = 0, draws = 0, totalGoals = 0
    const games = []

    for (const poll of (polls || [])) {
      const { teamA = [], teamB = [] } = poll.teams || {}
      const inA = teamA.some(p => p.name.toLowerCase() === nameLower)
      const inB = teamB.some(p => p.name.toLowerCase() === nameLower)
      if (!inA && !inB) continue

      const myScore = inA ? poll.score_a : poll.score_b
      const oppScore = inA ? poll.score_b : poll.score_a
      const result = myScore > oppScore ? 'win' : myScore < oppScore ? 'loss' : 'draw'
      const playerGoals = (poll.goals || []).filter(g => g.name.toLowerCase() === nameLower).length
      const playerAssists = (poll.goals || []).filter(g => g.assist?.toLowerCase() === nameLower).length

      // MVP: player wins if they have the joint-highest vote count (≥1)
      const mvpVotes = poll.mvp_votes || []
      const voteCounts = {}
      mvpVotes.forEach(v => { voteCounts[v.votedFor?.toLowerCase()] = (voteCounts[v.votedFor?.toLowerCase()] || 0) + 1 })
      const maxVotes = Math.max(0, ...Object.values(voteCounts))
      const wonMvp = maxVotes > 0 && voteCounts[nameLower] === maxVotes

      if (result === 'win') wins++
      else if (result === 'loss') losses++
      else draws++
      totalGoals += playerGoals

      games.push({
        pollId: poll.id,
        title: poll.title,
        location: poll.location,
        date: poll.game_time,
        team: inA ? 'A' : 'B',
        result,
        scoreA: poll.score_a,
        scoreB: poll.score_b,
        goals: playerGoals,
        assists: playerAssists,
        mvp: wonMvp,
      })
    }

    // Consecutive attendance streak + total attended count (from all confirmed, including unscored)
    let streak = 0, gamesAttended = 0
    for (const poll of (allConfirmed || [])) {
      const { teamA = [], teamB = [] } = poll.teams || {}
      const attended = [...teamA, ...teamB].some(p => p.name.toLowerCase() === nameLower)
      if (attended) {
        gamesAttended++
        if (streak === gamesAttended - 1) streak++ // still consecutive from the top
      }
    }

    const totalAssists = games.reduce((sum, g) => sum + (g.assists || 0), 0)
    const mvpWins = games.filter(g => g.mvp).length
    const totalConfirmed = (allConfirmed || []).length

    return res.status(200).json({
      name: name.trim(), wins, losses, draws,
      goals: totalGoals, assists: totalAssists,
      mvpWins, streak, gamesAttended, totalConfirmed,
      games,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
