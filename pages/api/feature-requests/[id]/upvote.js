// POST /api/feature-requests/[id]/upvote — toggle an upvote for `voterId`
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  const { id } = req.query
  const { voterId } = req.body
  if (!voterId) return res.status(400).json({ error: 'voterId is required' })

  const db = supabaseAdmin()

  try {
    const { data: request, error: fetchErr } = await db.from('feature_requests').select('upvotes').eq('id', id).maybeSingle()
    if (fetchErr) throw fetchErr
    if (!request) return res.status(404).json({ error: 'Not found' })

    const upvotes = request.upvotes || []
    const updatedUpvotes = upvotes.includes(voterId)
      ? upvotes.filter(v => v !== voterId)
      : [...upvotes, voterId]

    const { data, error } = await db
      .from('feature_requests')
      .update({ upvotes: updatedUpvotes })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return res.status(200).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
