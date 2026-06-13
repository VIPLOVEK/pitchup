// PATCH  /api/admin/templates/[id] — toggle active, or edit full template (admin only)
// DELETE /api/admin/templates/[id] — delete a recurring poll template (admin only)
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'
import { validateTemplate } from '../../../../lib/templates'

function isAdmin(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`
}

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  const { id } = req.query
  const db = supabaseAdmin()

  if (req.method === 'PATCH') {
    const { active } = req.body

    if (Object.keys(req.body).length === 1 && typeof active === 'boolean') {
      try {
        const { data, error } = await db
          .from('poll_templates')
          .update({ active })
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return res.status(200).json(data)
      } catch (e) {
        return res.status(500).json({ error: e.message })
      }
    }

    const error = validateTemplate(req.body)
    if (error) return res.status(400).json({ error })

    const { title, location, weekday, slotOffsets, minPlayers, maxPlayers, visibility, groupIds, leadDays } = req.body
    const pollVisibility = visibility === 'groups' ? 'groups' : 'all'

    try {
      const { data, error: dbError } = await db
        .from('poll_templates')
        .update({
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
        .eq('id', id)
        .select()
        .single()
      if (dbError) throw dbError
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await db.from('poll_templates').delete().eq('id', id)
      if (error) throw error
      return res.status(204).end()
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
