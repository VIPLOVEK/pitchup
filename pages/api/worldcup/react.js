import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'

const ALLOWED = ['🔥', '😱', '👏', '😂']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'DB not configured' })

  const { chatId, emoji, playerName } = req.body
  if (!chatId || !ALLOWED.includes(emoji) || !playerName?.trim())
    return res.status(400).json({ error: 'chatId, emoji, playerName required' })

  const db = supabaseAdmin()
  const { data: row, error: fetchErr } = await db.from('wc_chat').select('reactions').eq('id', chatId).single()
  if (fetchErr || !row) return res.status(404).json({ error: 'Message not found' })

  const reactions = row.reactions || {}
  const current = reactions[emoji] || []
  reactions[emoji] = current.includes(playerName)
    ? current.filter(n => n !== playerName)
    : [...current, playerName]

  const { data, error } = await db.from('wc_chat').update({ reactions }).eq('id', chatId).select().single()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
