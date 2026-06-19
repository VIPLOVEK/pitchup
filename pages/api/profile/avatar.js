// POST /api/profile/avatar — resize-and-upload a player's profile photo
// Body: { playerId, pin, imageBase64 } (image pre-resized client-side to ≤256×256 JPEG)
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { verifyPin } from '../../../lib/players'

const MAX_B64_LEN = 200 * 1024 // ~150 KB file

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured' })

  const { playerId, pin, imageBase64 } = req.body
  if (!playerId || !pin || !imageBase64) return res.status(400).json({ error: 'Missing required fields' })
  if (imageBase64.length > MAX_B64_LEN) return res.status(400).json({ error: 'Image too large — resize before uploading' })

  const db = supabaseAdmin()
  try {
    const { data: player, error: fetchErr } = await db.from('players').select('*').eq('id', playerId).maybeSingle()
    if (fetchErr) throw fetchErr
    if (!player || !verifyPin(pin, player.pin_hash)) return res.status(401).json({ error: 'PIN is incorrect' })

    const buffer = Buffer.from(imageBase64, 'base64')
    const { error: uploadErr } = await db.storage
      .from('player-avatars')
      .upload(`${playerId}.jpg`, buffer, { contentType: 'image/jpeg', upsert: true })
    if (uploadErr) throw uploadErr

    const { data: { publicUrl } } = db.storage.from('player-avatars').getPublicUrl(`${playerId}.jpg`)
    // Append version so browser doesn't serve the cached old avatar after an update
    const avatarUrl = `${publicUrl}?v=${Date.now()}`

    await db.from('players').update({ avatar_url: avatarUrl }).eq('id', playerId)
    return res.status(200).json({ avatar_url: avatarUrl })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
