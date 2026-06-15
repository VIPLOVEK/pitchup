// PATCH  /api/admin/feature-requests/[id] — set status
// DELETE /api/admin/feature-requests/[id] — remove a request
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'

const STATUSES = ['open', 'planned', 'in_progress', 'done', 'declined']

function isAdmin(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`
}

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  const { id } = req.query
  const db = supabaseAdmin()

  if (req.method === 'PATCH') {
    const { status } = req.body
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' })

    try {
      const { data, error } = await db
        .from('feature_requests')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await db.from('feature_requests').delete().eq('id', id)
      if (error) throw error
      return res.status(204).end()
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
