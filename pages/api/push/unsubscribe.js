// POST /api/push/unsubscribe — remove a Web Push subscription
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  const { endpoint } = req.body
  if (!endpoint) return res.status(400).json({ error: 'endpoint is required' })

  try {
    const db = supabaseAdmin()
    const { error } = await db.from('push_subscriptions').delete().eq('endpoint', endpoint)
    if (error) throw error

    return res.status(204).end()
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
