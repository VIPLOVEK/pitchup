// POST /api/request-game — any player can request a game (creates a pending poll)
import { supabaseAdmin, isSupabaseConfigured } from '../../lib/supabase'
import { sendPushToAll } from '../../lib/push'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured' })

  const { title, location, slot, notes, requesterName, gameType, opponent } = req.body

  if (!title?.trim() || !location?.trim() || !slot || !requesterName?.trim()) {
    return res.status(400).json({ error: 'Name, title, location and a time slot are required' })
  }

  const slotDate = new Date(slot)
  if (isNaN(slotDate.getTime())) return res.status(400).json({ error: 'Invalid date/time' })

  try {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('polls')
      .insert({
        title: title.trim().slice(0, 80),
        location: location.trim().slice(0, 80),
        slots: [slotDate.toISOString()],
        min_players: 10,
        max_players: 22,
        status: 'pending',
        players: [],
        teams: null,
        visibility: 'all',
        group_ids: [],
        notes: [notes?.trim(), `Requested by ${requesterName.trim()}`].filter(Boolean).join('\n'),
        game_type: ['practice', 'competition'].includes(gameType) ? gameType : 'game',
        opponent: opponent?.trim().slice(0, 60) || null,
      })
      .select()
      .single()

    if (error) throw error

    try {
      await sendPushToAll({
        title: '🔔 New game request',
        body: `${requesterName.trim()} wants to schedule "${title.trim()}" — open admin panel to review.`,
        url: '/admin',
      })
    } catch (e) {
      console.error('Push notification failed (non-fatal):', e.message)
    }

    return res.status(201).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
