// GET  /api/feature-requests — list all requests, most-upvoted first
// POST /api/feature-requests — submit a new request
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })
  const db = supabaseAdmin()

  if (req.method === 'GET') {
    try {
      const { data, error } = await db.from('feature_requests').select('*')
      if (error) throw error
      data.sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0) || new Date(b.created_at) - new Date(a.created_at))
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'POST') {
    const { title, description, authorName } = req.body
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })

    try {
      const { data, error } = await db
        .from('feature_requests')
        .insert({
          title: title.trim(),
          description: description?.trim() || null,
          author_name: authorName?.trim() || null,
        })
        .select()
        .single()
      if (error) throw error
      return res.status(201).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
