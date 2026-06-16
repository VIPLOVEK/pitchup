// GET  /api/poll/[id] — fetch poll state
// POST /api/poll/[id] — cast a vote
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { formatSlot } from '../../../lib/teams'
import { evaluatePollUpdate } from '../../../lib/pollStatus'
import { sendWhatsAppAnnouncement, sendWhatsAppCancellation } from '../../../lib/whatsapp'
import { sendPushToAll } from '../../../lib/push'
import { verifyPin } from '../../../lib/players'

// Applies any status change (confirm/cancel) triggered by the cutoff or
// player count, persists it, and fires the matching WhatsApp message.
// Uses the `version` column for optimistic locking: if another request
// already wrote the same change first, just return the fresh row.
async function applyPollUpdate(db, poll) {
  const update = evaluatePollUpdate(poll)
  if (!update) return poll

  const { data: updated, error } = await db
    .from('polls')
    .update({ ...update, version: poll.version + 1 })
    .eq('id', poll.id)
    .eq('version', poll.version)
    .select()
    .maybeSingle()
  if (error) throw error

  if (!updated) {
    const { data: fresh, error: fetchErr } = await db.from('polls').select('*').eq('id', poll.id).single()
    if (fetchErr) throw fetchErr
    return fresh
  }

  if (update.status === 'confirmed') {
    try {
      await sendWhatsAppAnnouncement({
        poll: { ...updated, players_count: updated.players.length },
        teamA: updated.teams.teamA,
        teamB: updated.teams.teamB,
        gameTime: formatSlot(updated.game_time),
      })
    } catch (e) {
      console.error('WhatsApp notification failed (non-fatal):', e.message)
    }
    try {
      await sendPushToAll({
        title: '⚽ Game on!',
        body: `${updated.title} is confirmed for ${formatSlot(updated.game_time)} at ${updated.location}.`,
        url: `/poll/${updated.id}`,
      })
    } catch (e) {
      console.error('Push notification failed (non-fatal):', e.message)
    }
  } else if (update.status === 'cancelled') {
    try {
      await sendWhatsAppCancellation({ poll: updated })
    } catch (e) {
      console.error('WhatsApp cancellation failed (non-fatal):', e.message)
    }
    try {
      await sendPushToAll({
        title: '❌ Game cancelled',
        body: `${updated.title} at ${updated.location} has been cancelled — not enough players joined.`,
        url: `/poll/${updated.id}`,
      })
    } catch (e) {
      console.error('Push notification failed (non-fatal):', e.message)
    }
  }

  return updated
}

export default async function handler(req, res) {
  const { id } = req.query

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Database not configured yet.' })
  }

  const db = supabaseAdmin()

  if (req.method === 'GET') {
    try {
      const { data, error } = await db.from('polls').select('*').eq('id', id).single()
      if (error || !data) return res.status(404).json({ error: 'Poll not found' })
      const poll = await applyPollUpdate(db, data)
      return res.status(200).json(poll)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'POST') {
    const { name, slots: votedSlots, playerId, positions, guests } = req.body
    if (!name || !Array.isArray(votedSlots) || votedSlots.length === 0) {
      return res.status(400).json({ error: 'name and slots are required' })
    }
    const guestCount = Math.min(Math.max(0, parseInt(guests, 10) || 0), 2)

    const MAX_RETRIES = 5
    try {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const { data: poll, error: fetchErr } = await db.from('polls').select('*').eq('id', id).single()
        if (fetchErr || !poll) return res.status(404).json({ error: 'Poll not found' })

        // Lazy-evaluate the cutoff before accepting a new vote
        const current = await applyPollUpdate(db, poll)
        if (current.status !== 'open') {
          return res.status(400).json({ error: 'Poll is no longer open' })
        }

        if (current.visibility === 'groups') {
          if (!playerId) {
            return res.status(403).json({ error: 'This game is restricted to specific groups. Create a profile and request to join one to vote.' })
          }
          const { data: membership, error: memErr } = await db
            .from('group_members')
            .select('group_id')
            .eq('player_id', playerId)
            .eq('status', 'approved')
            .in('group_id', current.group_ids)
            .maybeSingle()
          if (memErr) throw memErr
          if (!membership) {
            return res.status(403).json({ error: 'This game is restricted to specific groups you are not a member of.' })
          }
        }

        const players = current.players || []
        if (players.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
          return res.status(409).json({ error: 'Name already registered' })
        }

        const updatedPlayers = [
          ...players,
          { name: name.trim(), slots: votedSlots, playerId: playerId || null, positions: positions || [], guests: guestCount },
        ]

        const { data: updated, error: updateErr } = await db
          .from('polls')
          .update({ players: updatedPlayers, version: current.version + 1 })
          .eq('id', id)
          .eq('version', current.version)
          .select()
          .maybeSingle()
        if (updateErr) throw updateErr

        // Someone else wrote to this poll in between — retry from a fresh read
        if (!updated) continue

        const final = await applyPollUpdate(db, updated)
        return res.status(200).json(final)
      }

      return res.status(409).json({ error: 'Poll is busy, please try again' })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'DELETE') {
    const { name, pin } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })

    try {
      const { data: poll, error: fetchErr } = await db.from('polls').select('*').eq('id', id).single()
      if (fetchErr || !poll) return res.status(404).json({ error: 'Poll not found' })
      if (poll.status !== 'open') return res.status(400).json({ error: 'Voting is closed for this poll' })

      const entry = (poll.players || []).find(p => p.name.toLowerCase() === name.trim().toLowerCase())
      if (!entry) return res.status(404).json({ error: 'You are not in this poll' })

      if (entry.playerId) {
        if (!pin) return res.status(400).json({ error: 'PIN is required' })
        const { data: player, error: playerErr } = await db.from('players').select('pin_hash').eq('id', entry.playerId).maybeSingle()
        if (playerErr) throw playerErr
        if (!player || !verifyPin(pin, player.pin_hash)) {
          return res.status(401).json({ error: 'PIN is incorrect' })
        }
      }

      const updatedPlayers = poll.players.filter(p => p.name.toLowerCase() !== name.trim().toLowerCase())
      const { data: updated, error } = await db
        .from('polls')
        .update({ players: updatedPlayers, version: poll.version + 1 })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      return res.status(200).json(updated)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
