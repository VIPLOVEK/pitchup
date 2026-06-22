// PATCH /api/admin/[id] — close poll, shuffle teams
// DELETE /api/admin/[id] — delete poll
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { generateTeams, pickBestSlot, formatSlot, getActivePlayers, expandWithGuests, getWaitlist } from '../../../lib/teams'
import { sendWhatsAppAnnouncement } from '../../../lib/whatsapp'
import { sendPushToAll, sendPushToPlayer } from '../../../lib/push'
import { pickTeamNames } from '../../../lib/teamNames'

function isAdmin(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`
}

// Attaches each player's self-reported/admin-set skill_rating (looked up by
// playerId) so generateTeams can balance teams by skill.
async function withSkillRatings(db, players) {
  const ids = players.map(p => p.playerId).filter(Boolean)
  if (ids.length === 0) return players

  const { data, error } = await db.from('players').select('id, skill_rating, position_skills').in('id', ids)
  if (error) throw error

  const ratings = Object.fromEntries(data.map(p => [p.id, { skill_rating: p.skill_rating, position_skills: p.position_skills }]))
  return players.map(p => p.playerId && ratings[p.playerId]
    ? { ...p, ...ratings[p.playerId] }
    : p)
}

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  const { id } = req.query
  const db = supabaseAdmin()

  if (req.method === 'PATCH') {
    const { action } = req.body
    try {
      const { data: poll } = await db.from('polls').select('*').eq('id', id).single()
      if (!poll) return res.status(404).json({ error: 'Not found' })

      if (action === 'close') {
        const activePlayers = await withSkillRatings(db, getActivePlayers(poll))
        const expanded = expandWithGuests(activePlayers)
        const teams = generateTeams(expanded)
        const gameTime = pickBestSlot(activePlayers, poll.slots)
        const { data, error } = await db
          .from('polls').update({ status: 'confirmed', teams, game_time: gameTime, version: poll.version + 1 }).eq('id', id).select().single()
        if (error) throw error

        try {
          await sendWhatsAppAnnouncement({
            poll: { ...poll, players_count: activePlayers.length },
            teamA: teams.teamA, teamB: teams.teamB, gameTime: formatSlot(gameTime),
          })
        } catch (e) { console.error('WhatsApp failed:', e.message) }

        try {
          await sendPushToAll({
            title: '⚽ Game on!',
            body: `${data.title} is confirmed for ${formatSlot(gameTime)} at ${data.location}.`,
            url: `/poll/${data.id}`,
          })
        } catch (e) { console.error('Push notification failed:', e.message) }

        return res.status(200).json(data)
      }

      if (action === 'reopen') {
        const { data, error } = await db
          .from('polls').update({ status: 'open', version: poll.version + 1 }).eq('id', id).select().single()
        if (error) throw error
        return res.status(200).json(data)
      }

      if (action === 'shuffle') {
        const teams = generateTeams(await withSkillRatings(db, getActivePlayers(poll)))
        const { teamAName, teamBName } = pickTeamNames()
        const { data, error } = await db
          .from('polls').update({ teams, team_a_name: teamAName, team_b_name: teamBName, version: poll.version + 1 }).eq('id', id).select().single()
        if (error) throw error
        return res.status(200).json(data)
      }

      if (action === 'randomizeNames') {
        const { teamAName, teamBName } = pickTeamNames()
        const { data, error } = await db
          .from('polls').update({ team_a_name: teamAName, team_b_name: teamBName, version: poll.version + 1 }).eq('id', id).select().single()
        if (error) throw error
        return res.status(200).json(data)
      }

      if (action === 'setScore') {
        const { scoreA, scoreB } = req.body
        if (poll.status !== 'confirmed') return res.status(400).json({ error: 'Game must be confirmed first' })
        if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
          return res.status(400).json({ error: 'Scores must be non-negative numbers' })
        }
        const { data, error } = await db
          .from('polls').update({ score_a: scoreA, score_b: scoreB, version: poll.version + 1 }).eq('id', id).select().single()
        if (error) throw error
        try {
          const result = scoreA === scoreB ? 'Draw' : scoreA > scoreB ? '🟦 Team A win' : '🟥 Team B win'
          await sendPushToAll({
            title: `⚽ Final score: ${scoreA} – ${scoreB}`,
            body: `${data.title}: ${result}. Check it out!`,
            url: `/poll/${data.id}`,
          })
        } catch (e) { console.error('Score push failed:', e.message) }
        return res.status(200).json(data)
      }

      if (action === 'setTeams') {
        if (poll.status !== 'confirmed') return res.status(400).json({ error: 'Game must be confirmed first' })
        const { teamA, teamB, noShows } = req.body
        if (!Array.isArray(teamA) || !Array.isArray(teamB)) return res.status(400).json({ error: 'teamA and teamB are required' })
        const { data, error } = await db
          .from('polls')
          .update({ teams: { teamA, teamB }, no_shows: noShows || [], version: poll.version + 1 })
          .eq('id', id).select().single()
        if (error) throw error
        return res.status(200).json(data)
      }

      if (action === 'setGoals') {
        const { goals } = req.body
        if (poll.status !== 'confirmed') return res.status(400).json({ error: 'Game must be confirmed first' })
        if (!Array.isArray(goals)) return res.status(400).json({ error: 'goals must be an array' })
        const { data, error } = await db
          .from('polls').update({ goals, version: poll.version + 1 }).eq('id', id).select().single()
        if (error) throw error
        return res.status(200).json(data)
      }

      if (action === 'setAudience') {
        const { visibility, groupIds } = req.body
        if (poll.status !== 'open') return res.status(400).json({ error: 'Poll is no longer open' })

        const newVisibility = visibility === 'groups' ? 'groups' : 'all'
        if (newVisibility === 'groups' && (!Array.isArray(groupIds) || groupIds.length === 0)) {
          return res.status(400).json({ error: 'Select at least one group' })
        }

        const { data, error } = await db
          .from('polls')
          .update({
            visibility: newVisibility,
            group_ids: newVisibility === 'groups' ? groupIds : [],
            version: poll.version + 1,
          })
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return res.status(200).json(data)
      }

      if (action === 'updateDetails') {
        const { title, location, slots, minPlayers, maxPlayers, notes, gameType, opponent } = req.body
        if (poll.status !== 'open') return res.status(400).json({ error: 'Poll is no longer open' })
        if (!title || !location) return res.status(400).json({ error: 'Title and location are required' })
        if (!Array.isArray(slots) || slots.length === 0) return res.status(400).json({ error: 'At least one time slot is required' })
        if (!Number.isInteger(minPlayers) || !Number.isInteger(maxPlayers) || minPlayers < 2 || maxPlayers < minPlayers) {
          return res.status(400).json({ error: 'Max players must be greater than or equal to min players' })
        }

        // Keep existing players/votes, but drop any slot-vote indices that
        // no longer exist if slots were removed.
        const updatedPlayers = (poll.players || []).map(p => ({
          ...p,
          slots: (p.slots || []).filter(i => i < slots.length),
        }))

        const { data, error } = await db
          .from('polls')
          .update({ title, location, slots, min_players: minPlayers, max_players: maxPlayers, players: updatedPlayers, notes: notes !== undefined ? notes : poll.notes, game_type: ['practice', 'competition'].includes(gameType) ? gameType : (gameType === 'game' ? 'game' : poll.game_type ?? 'game'), opponent: opponent !== undefined ? (opponent?.trim() || null) : poll.opponent ?? null, version: poll.version + 1 })
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return res.status(200).json(data)
      }

      if (action === 'removePlayer') {
        const { name } = req.body
        if (!name) return res.status(400).json({ error: 'name is required' })

        const wasWaitlist = getWaitlist(poll)
        const updatedPlayers = (poll.players || []).filter(p => p.name !== name)
        const { data: updatedPoll, error } = await db
          .from('polls').update({ players: updatedPlayers, version: poll.version + 1 }).eq('id', id).select().single()
        if (error) throw error

        // Notify the first player who moved from waitlist to active
        try {
          const nowActive = getActivePlayers(updatedPoll)
          const movedUp = wasWaitlist.find(w => nowActive.some(a => a.name === w.name && a.playerId))
          if (movedUp?.playerId) {
            await sendPushToPlayer(db, movedUp.playerId, {
              title: '⚽ You\'re in!',
              body: `A spot opened up in ${poll.title} — you've moved from the waitlist to active!`,
              url: `/poll/${poll.id}`,
            })
          }
        } catch (e) { console.error('Waitlist push failed:', e.message) }

        if (poll.status === 'confirmed' && getActivePlayers(poll).some(p => p.name === name)) {
          const gameTime = poll.game_time ? new Date(poll.game_time) : null
          const hoursUntil = gameTime ? (gameTime - new Date()) / (1000 * 60 * 60) : Infinity
          if (hoursUntil < 2) {
            try {
              await sendPushToAll({
                title: '⚠️ Player dropped out',
                body: `${name} just dropped out of ${poll.title} — less than 2h to kickoff!`,
                url: `/poll/${poll.id}`,
              })
            } catch (e) { console.error('Dropout alert push failed:', e.message) }
          }
        }

        // For confirmed polls, regenerate teams if an active player was removed
        if (poll.status === 'confirmed' && getActivePlayers(poll).some(p => p.name === name)) {
          try {
            const nowActive = getActivePlayers(updatedPoll)
            const newTeams = generateTeams(expandWithGuests(nowActive))
            const { data: reteamed, error: teamErr } = await db
              .from('polls').update({ teams: newTeams, version: updatedPoll.version + 1 }).eq('id', id).select().single()
            if (!teamErr && reteamed) return res.status(200).json(reteamed)
          } catch (e) { console.error('Team regeneration failed:', e.message) }
        }

        return res.status(200).json(updatedPoll)
      }

      return res.status(400).json({ error: 'Unknown action' })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await db.from('polls').delete().eq('id', id)
      if (error) throw error
      return res.status(204).end()
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
