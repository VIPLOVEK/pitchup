// GET  /api/admin/templates — list recurring poll templates (admin only)
// POST /api/admin/templates — create a recurring poll template (admin only)
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'
import { validateTemplate } from '../../../../lib/templates'

function isAdmin(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`
}

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (!isSupabaseConfigured()) return res.status(200).json([])

  const db = supabaseAdmin()

  if (req.method === 'GET') {
    try {
      const { data, error } = await db.from('poll_templates').select('*').order('created_at')
      if (error) throw error
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'POST') {
    const error = validateTemplate(req.body)
    if (error) return res.status(400).json({ error })

    const { title, location, weekday, slotOffsets, minPlayers, maxPlayers, visibility, groupIds, leadDays } = req.body
    const pollVisibility = visibility === 'groups' ? 'groups' : 'all'

    try {
      const { data, error: dbError } = await db
        .from('poll_templates')
        .insert({
          title,
          location,
          weekday,
          slot_offsets: slotOffsets,
          min_players: minPlayers,
          max_players: maxPlayers,
          visibility: pollVisibility,
          group_ids: pollVisibility === 'groups' ? groupIds : [],
          lead_days: leadDays,
        })
        .select()
        .single()
      if (dbError) throw dbError
      return res.status(201).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
