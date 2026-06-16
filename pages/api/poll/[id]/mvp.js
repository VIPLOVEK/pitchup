// POST /api/poll/[id]/mvp — cast or update a Man of the Match vote
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured' })

  const { id } = req.query
  const { voterName, votedFor } = req.body
  if (!voterName?.trim() || !votedFor?.trim()) {
    return res.status(400).json({ error: 'voterName and votedFor are required' })
  }

  try {
    const db = supabaseAdmin()
    const { data: poll, error: fetchErr } = await db
      .from('polls')
      .select('mvp_votes, status, score_a, score_b')
      .eq('id', id)
      .single()
    if (fetchErr || !poll) return res.status(404).json({ error: 'Poll not found' })
    if (poll.status !== 'confirmed') return res.status(400).json({ error: 'Game must be confirmed' })
    if (poll.score_a == null || poll.score_b == null) {
      return res.status(400).json({ error: 'Score not yet entered' })
    }

    // Replace existing vote by this voter, or append new one
    const existing = (poll.mvp_votes || []).filter(
      v => v.voterName.toLowerCase() !== voterName.trim().toLowerCase()
    )
    const updated = [...existing, { voterName: voterName.trim(), votedFor: votedFor.trim() }]

    const { error } = await db.from('polls').update({ mvp_votes: updated }).eq('id', id)
    if (error) throw error
    return res.status(200).json({ mvpVotes: updated })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
