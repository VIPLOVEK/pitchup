// GET  /api/admin/penalties — list penalties (default: pending only)
// PATCH /api/admin/penalties/[id] — mark complete / update reason
// DELETE /api/admin/penalties/[id] — remove
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'

function isAdmin(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`
}

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  const db = supabaseAdmin()

  try {
    if (req.method === 'GET') {
      const onlyPending = req.query.pending !== 'false'
      let query = db.from('penalties').select('*').order('created_at', { ascending: false })
      if (onlyPending) query = query.eq('completed', false)
      const { data, error } = await query
      if (error) throw error
      return res.status(200).json(data)
    }

    if (req.method === 'PATCH') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'id is required' })
      const { completed, reason } = req.body
      const update = {}
      if (completed !== undefined) {
        update.completed = !!completed
        update.completed_at = completed ? new Date().toISOString() : null
      }
      if (reason !== undefined) update.reason = reason?.trim() || null
      const { data, error } = await db.from('penalties').update(update).eq('id', id).select().single()
      if (error) throw error
      return res.status(200).json(data)
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'id is required' })
      const { error } = await db.from('penalties').delete().eq('id', id)
      if (error) throw error
      return res.status(204).end()
    }

    res.status(405).end()
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
