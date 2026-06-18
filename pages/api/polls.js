// POST /api/polls — create a new poll (admin only)
import { supabaseAdmin, isSupabaseConfigured } from '../../lib/supabase'
import { sendWhatsAppPollCreated } from '../../lib/whatsapp'
import { pickTeamNames } from '../../lib/teamNames'
import { sendPushToAll } from '../../lib/push'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Database not configured yet. Add Supabase env vars in Vercel.' })
  }

  const { title, location, slots, minPlayers, maxPlayers, visibility, groupIds, notes } = req.body

  if (!title || !location || !Array.isArray(slots) || slots.length === 0 || !minPlayers || !maxPlayers) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  if (slots.some((s) => isNaN(new Date(s).getTime()))) {
    return res.status(400).json({ error: 'Slots must be valid dates/times' })
  }

  if (minPlayers < 2 || maxPlayers < minPlayers) {
    return res.status(400).json({ error: 'max players must be greater than or equal to min players' })
  }

  const pollVisibility = visibility === 'groups' ? 'groups' : 'all'
  if (pollVisibility === 'groups' && (!Array.isArray(groupIds) || groupIds.length === 0)) {
    return res.status(400).json({ error: 'Select at least one group' })
  }

  try {
    const db = supabaseAdmin()
    const { teamAName, teamBName } = pickTeamNames()
    const { data, error } = await db
      .from('polls')
      .insert({
        title,
        location,
        slots,
        min_players: minPlayers,
        max_players: maxPlayers,
        status: 'open',
        players: [],
        teams: null,
        visibility: pollVisibility,
        group_ids: pollVisibility === 'groups' ? groupIds : [],
        notes: notes || null,
        team_a_name: teamAName,
        team_b_name: teamBName,
      })
      .select()
      .single()

    if (error) throw error

    // Skip the club-wide broadcasts for group-restricted polls — it
    // would notify everyone even though only some members can vote.
    if (pollVisibility !== 'groups') {
      try {
        await sendWhatsAppPollCreated({ poll: data })
      } catch (e) {
        console.error('WhatsApp notification failed (non-fatal):', e.message)
      }
      try {
        await sendPushToAll({
          title: '⚽ New game poll',
          body: `${data.title} — vote on your time now!`,
          url: `/poll/${data.id}`,
        })
      } catch (e) {
        console.error('Push notification failed (non-fatal):', e.message)
      }
    }

    return res.status(201).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
