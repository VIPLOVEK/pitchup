// GET /api/cron/keepalive — writes and removes a row in Supabase so the
// project registers real database activity. Supabase free-tier projects
// auto-pause after a week of inactivity; this runs weekly via Vercel Cron
// (see vercel.json) to prevent that.
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!isSupabaseConfigured()) return res.status(200).json({ ok: false })

  const db = supabaseAdmin()

  try {
    const { error: insertError } = await db.from('keepalive').insert({})
    if (insertError) throw insertError

    const { error: deleteError } = await db
      .from('keepalive')
      .delete()
      .lt('created_at', new Date().toISOString())
    if (deleteError) throw deleteError

    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
