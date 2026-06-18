// POST /api/admin/announce — create a broadcast announcement
// DELETE /api/admin/announce — clear the active announcement
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { sendPushToAll, isPushConfigured } from '../../../lib/push'

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured' })

  const db = supabaseAdmin()

  if (req.method === 'DELETE') {
    await db.from('announcements').update({ active: false }).eq('active', true)
    return res.status(200).json({ cleared: true })
  }

  if (req.method !== 'POST') return res.status(405).end()

  const { message, sendPush, pin } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' })
  if (!sendPush && !pin) return res.status(400).json({ error: 'Choose at least one channel' })

  try {
    // Deactivate any existing pinned announcement before pinning a new one
    if (pin) {
      await db.from('announcements').update({ active: false }).eq('active', true)
      await db.from('announcements').insert({ message: message.trim(), active: true })
    }

    if (sendPush && isPushConfigured()) {
      await sendPushToAll({
        title: '📣 PitchUp announcement',
        body: message.trim().slice(0, 120),
        url: '/',
      })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
