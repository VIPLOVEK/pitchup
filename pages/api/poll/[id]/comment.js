// POST /api/poll/[id]/comment — add a comment to a poll
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'
import { sendPushToPlayer, isPushConfigured } from '../../../../lib/push'

// Extract @word tokens and match against poll players (first-name or full-name, case-insensitive)
function findMentionedPlayers(text, players) {
  const tokens = (text.match(/@(\w+)/g) || []).map(m => m.slice(1).toLowerCase())
  if (!tokens.length) return []

  const mentioned = []
  for (const player of players) {
    if (!player.playerId) continue
    const firstName = player.name.split(' ')[0].toLowerCase()
    const compacted = player.name.toLowerCase().replace(/\s+/g, '')
    if (tokens.some(t => t === firstName || t === compacted)) {
      mentioned.push(player)
    }
  }
  return mentioned
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  const { id } = req.query
  const { name, text } = req.body
  if (!name?.trim() || !text?.trim()) return res.status(400).json({ error: 'name and text are required' })
  if (text.trim().length > 280) return res.status(400).json({ error: 'Comment too long (max 280 chars)' })

  try {
    const db = supabaseAdmin()
    const { data: poll, error: fetchErr } = await db
      .from('polls')
      .select('comments, version, players, title')
      .eq('id', id)
      .single()
    if (fetchErr || !poll) return res.status(404).json({ error: 'Poll not found' })

    const newComment = { name: name.trim(), text: text.trim(), ts: new Date().toISOString() }
    const { data, error } = await db
      .from('polls')
      .update({ comments: [...(poll.comments || []), newComment], version: poll.version + 1 })
      .eq('id', id)
      .select('comments')
      .single()
    if (error) throw error

    // Send push notifications to @mentioned players (fire-and-forget)
    if (isPushConfigured()) {
      const mentioned = findMentionedPlayers(text.trim(), poll.players || [])
      for (const player of mentioned) {
        // Don't notify someone who mentioned themselves
        if (player.name.toLowerCase() === name.trim().toLowerCase()) continue
        sendPushToPlayer(db, player.playerId, {
          title: `💬 ${name.trim()} mentioned you`,
          body: `${poll.title}: ${text.trim().slice(0, 100)}`,
          url: `/poll/${id}`,
        }).catch(e => console.error('Mention push failed:', e.message))
      }
    }

    return res.status(200).json(data.comments)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
