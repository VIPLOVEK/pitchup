// POST /api/poll/[id]/react — toggle an emoji reaction on a comment
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'

const ALLOWED = ['⚽', '🔥', '👏', '😂', '💪']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured' })

  const { id } = req.query
  const { name, commentIndex, emoji } = req.body

  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
  if (!ALLOWED.includes(emoji)) return res.status(400).json({ error: 'Invalid emoji' })
  if (typeof commentIndex !== 'number') return res.status(400).json({ error: 'commentIndex required' })

  try {
    const db = supabaseAdmin()
    const { data: poll, error } = await db
      .from('polls').select('comments, version').eq('id', id).single()
    if (error || !poll) return res.status(404).json({ error: 'Poll not found' })

    const comments = [...(poll.comments || [])]
    if (commentIndex < 0 || commentIndex >= comments.length) {
      return res.status(400).json({ error: 'Invalid comment index' })
    }

    const comment = { ...comments[commentIndex] }
    const reactions = { ...(comment.reactions || {}) }
    const reactors = reactions[emoji] || []
    const nameLc = name.trim().toLowerCase()
    const already = reactors.some(r => r.toLowerCase() === nameLc)

    reactions[emoji] = already
      ? reactors.filter(r => r.toLowerCase() !== nameLc)
      : [...reactors, name.trim()]

    if (reactions[emoji].length === 0) delete reactions[emoji]
    comment.reactions = reactions
    comments[commentIndex] = comment

    const { data: updated, error: updateErr } = await db
      .from('polls')
      .update({ comments, version: poll.version + 1 })
      .eq('id', id).select('comments').single()
    if (updateErr) throw updateErr

    return res.status(200).json(updated.comments)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
