// POST /api/admin/announce — create a broadcast announcement (with optional image)
// DELETE /api/admin/announce — clear the active announcement
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { sendPushToAll, isPushConfigured } from '../../../lib/push'

const MAX_FLYER_B64 = 1.5 * 1024 * 1024 // ~1.1 MB file

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

  const { message, sendPush, pin, imageBase64 } = req.body
  if (!message?.trim() && !imageBase64) return res.status(400).json({ error: 'Message or image is required' })
  if (!sendPush && !pin) return res.status(400).json({ error: 'Choose at least one channel' })
  if (imageBase64 && imageBase64.length > MAX_FLYER_B64) return res.status(400).json({ error: 'Image too large — max ~1 MB' })

  try {
    let imageUrl = null
    if (imageBase64) {
      const buffer = Buffer.from(imageBase64, 'base64')
      const filename = `flyer-${Date.now()}.jpg`
      const { error: uploadErr } = await db.storage
        .from('announcements')
        .upload(filename, buffer, { contentType: 'image/jpeg', upsert: false })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = db.storage.from('announcements').getPublicUrl(filename)
      imageUrl = publicUrl
    }

    // Deactivate any existing pinned announcement before pinning a new one
    if (pin) {
      await db.from('announcements').update({ active: false }).eq('active', true)
      await db.from('announcements').insert({ message: message?.trim() || null, image_url: imageUrl, active: true })
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
