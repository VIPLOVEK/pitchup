// GET  /api/poll/[id]   — fetch poll state
// POST /api/poll/[id]   — cast a vote
import { supabase, supabaseAdmin } from '../../../lib/supabase'
import { generateTeams, pickBestSlot } from '../../../lib/teams'
import { sendWhatsAppAnnouncement } from '../../../lib/whatsapp'

export default async function handler(req, res) {
  const { id } = req.query

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return res.status(404).json({ error: 'Poll not found' })
    return res.status(200).json(data)
  }

  // ── POST (vote) ──────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, slots: votedSlots } = req.body

    if (!name || !Array.isArray(votedSlots) || votedSlots.length === 0) {
      return res.status(400).json({ error: 'name and slots are required' })
    }

    const db = supabaseAdmin()

    // Fetch current state
    const { data: poll, error: fetchErr } = await db
      .from('polls')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !poll) return res.status(404).json({ error: 'Poll not found' })
    if (poll.closed) return res.status(400).json({ error: 'Poll is already closed' })

    // Prevent duplicate names
    const players = poll.players || []
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return res.status(409).json({ error: 'Name already registered' })
    }

    const updatedPlayers = [...players, { name, slots: votedSlots }]
    const hitThreshold = updatedPlayers.length >= poll.threshold

    let teams = null
    if (hitThreshold) {
      teams = generateTeams(updatedPlayers)
    }

    const { data: updated, error: updateErr } = await db
      .from('polls')
      .update({
        players: updatedPlayers,
        closed: hitThreshold,
        teams: hitThreshold ? teams : null,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) return res.status(500).json({ error: updateErr.message })

    // Fire WhatsApp announcement when game is confirmed
    if (hitThreshold && teams) {
      const gameTime = pickBestSlot(updatedPlayers, poll.slots)
      try {
        await sendWhatsAppAnnouncement({
          poll: { ...poll, players_count: updatedPlayers.length },
          teamA: teams.teamA,
          teamB: teams.teamB,
          gameTime,
        })
      } catch (e) {
        console.error('WhatsApp notification failed (non-fatal):', e.message)
      }
    }

    return res.status(200).json(updated)
  }

  res.status(405).end()
}
