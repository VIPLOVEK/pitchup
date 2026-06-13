// PATCH  /api/admin/templates/[id] — toggle active (admin only)
// DELETE /api/admin/templates/[id] — delete a recurring poll template (admin only)
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'

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
    if (typeof active !== 'boolean') return res.status(400).json({ error: 'active must be a boolean' })

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
