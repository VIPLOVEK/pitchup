// POST /api/poll/[id]/comment — add a comment to a poll
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  const { id } = req.query
  const { name, text } = req.body
  if (!name?.trim() || !text?.trim()) return res.status(400).json({ error: 'name and text are required' })
  if (text.trim().length > 280) return res.status(400).json({ error: 'Comment too long (max 280 chars)' })

  try {
    const db = supabaseAdmin()
    const { data: poll, error: fetchErr } = await db.from('polls').select('comments, version').eq('id', id).single()
    if (fetchErr || !poll) return res.status(404).json({ error: 'Poll not found' })

    const newComment = { name: name.trim(), text: text.trim(), ts: new Date().toISOString() }
    const { data, error } = await db
      .from('polls')
      .update({ comments: [...(poll.comments || []), newComment], version: poll.version + 1 })
      .eq('id', id)
      .select('comments')
      .single()
    if (error) throw error
    return res.status(200).json(data.comments)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
