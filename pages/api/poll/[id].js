// GET  /api/poll/[id] — fetch poll state
// POST /api/poll/[id] — cast a vote
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { formatSlot } from '../../../lib/teams'
import { evaluatePollUpdate } from '../../../lib/pollStatus'
import { sendWhatsAppAnnouncement, sendWhatsAppCancellation } from '../../../lib/whatsapp'

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
  } else if (update.status === 'cancelled') {
    try {
      await sendWhatsAppCancellation({ poll: updated })
    } catch (e) {
      console.error('WhatsApp cancellation failed (non-fatal):', e.message)
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
    const { name, slots: votedSlots } = req.body
    if (!name || !Array.isArray(votedSlots) || votedSlots.length === 0) {
      return res.status(400).json({ error: 'name and slots are required' })
    }

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

        const players = current.players || []
        if (players.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
          return res.status(409).json({ error: 'Name already registered' })
        }

        const updatedPlayers = [...players, { name: name.trim(), slots: votedSlots }]

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

  res.status(405).end()
}
