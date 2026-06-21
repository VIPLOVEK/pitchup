import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'DB not configured' })
  const db = supabaseAdmin()
  const { matchId } = req.query

  if (req.method === 'GET') {
    const { data } = await db.from('wc_chat').select('*').eq('match_id', matchId).order('created_at')
    return res.status(200).json(data || [])
  }

  if (req.method === 'POST') {
    const { author, message } = req.body
    if (!author?.trim() || !message?.trim()) return res.status(400).json({ error: 'author and message required' })
    const { data, error } = await db.from('wc_chat').insert({ match_id: matchId, author: author.trim(), message: message.trim().slice(0, 300) }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  res.status(405).end()
}
