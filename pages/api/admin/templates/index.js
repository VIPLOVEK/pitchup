// GET  /api/admin/templates — list recurring poll templates (admin only)
// POST /api/admin/templates — create a recurring poll template (admin only)
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'

function isAdmin(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`
}

function validate(body) {
  const { title, location, weekday, slotOffsets, minPlayers, maxPlayers, visibility, groupIds, leadDays } = body

  if (!title || !location) return 'Title and location are required'
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return 'Invalid weekday'
  if (!Array.isArray(slotOffsets) || slotOffsets.length === 0) return 'At least one time slot is required'
  for (const s of slotOffsets) {
    if (!Number.isInteger(s.dayOffset) || s.dayOffset < 0) return 'Invalid slot day offset'
    if (!Number.isInteger(s.hour) || s.hour < 0 || s.hour > 23) return 'Invalid slot hour'
    if (!Number.isInteger(s.minute) || s.minute < 0 || s.minute > 59) return 'Invalid slot minute'
  }
  if (!Number.isInteger(minPlayers) || !Number.isInteger(maxPlayers) || minPlayers < 2 || maxPlayers < minPlayers) {
    return 'Max players must be greater than or equal to min players'
  }
  if (!Number.isInteger(leadDays) || leadDays < 1 || leadDays > 13) return 'Lead days must be between 1 and 13'
  if (visibility === 'groups' && (!Array.isArray(groupIds) || groupIds.length === 0)) {
    return 'Select at least one group'
  }
  return null
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
    const error = validate(req.body)
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
