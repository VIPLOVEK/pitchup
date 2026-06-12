// POST   /api/admin/groups/[id]/logo — upload a group crest/logo (admin only)
// DELETE /api/admin/groups/[id]/logo — remove a group's logo (admin only)
import { supabaseAdmin, isSupabaseConfigured } from '../../../../../lib/supabase'

function isAdmin(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`
}

const MAX_BYTES = 1.5 * 1024 * 1024 // 1.5MB

export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } },
}

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  const { id } = req.query
  const db = supabaseAdmin()

  if (req.method === 'POST') {
    const { image } = req.body
    const match = typeof image === 'string' && image.match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/)
    if (!match) return res.status(400).json({ error: 'Image must be a PNG, JPEG or WEBP data URL' })

    const [, mime, base64] = match
    const buffer = Buffer.from(base64, 'base64')
    if (buffer.length > MAX_BYTES) return res.status(400).json({ error: 'Image must be smaller than 1.5MB' })

    const ext = mime.split('/')[1].replace('jpeg', 'jpg')
    const path = `${id}-${Date.now()}.${ext}`

    try {
      const { error: uploadErr } = await db.storage
        .from('group-logos')
        .upload(path, buffer, { contentType: mime, upsert: true })
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = db.storage.from('group-logos').getPublicUrl(path)

      const { data, error } = await db
        .from('groups')
        .update({ logo_url: publicUrl })
        .eq('id', id)
        .select('id, name, color, logo_url, created_at')
        .single()
      if (error) throw error

      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { data, error } = await db
        .from('groups')
        .update({ logo_url: null })
        .eq('id', id)
        .select('id, name, color, logo_url, created_at')
        .single()
      if (error) throw error
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
