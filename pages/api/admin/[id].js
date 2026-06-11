// PATCH /api/admin/[id] — close poll, shuffle teams
// DELETE /api/admin/[id] — delete poll
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { generateTeams, pickBestSlot } from '../../../lib/teams'
import { sendWhatsAppAnnouncement } from '../../../lib/whatsapp'

function isAdmin(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`
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
        const teams = generateTeams(poll.players)
        const { data, error } = await db
          .from('polls').update({ closed: true, teams }).eq('id', id).select().single()
        if (error) throw error

        const gameTime = pickBestSlot(poll.players, poll.slots)
        try {
          await sendWhatsAppAnnouncement({
            poll: { ...poll, players_count: poll.players.length },
            teamA: teams.teamA, teamB: teams.teamB, gameTime,
          })
        } catch (e) { console.error('WhatsApp failed:', e.message) }

        return res.status(200).json(data)
      }

      if (action === 'shuffle') {
        const teams = generateTeams(poll.players)
        const { data, error } = await db
          .from('polls').update({ teams }).eq('id', id).select().single()
        if (error) throw error
        return res.status(200).json(data)
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
