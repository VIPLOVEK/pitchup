import webpush from 'web-push'
import { supabaseAdmin, isSupabaseConfigured } from './supabase'

export function isPushConfigured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

function configure() {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL || 'admin@example.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// Sends a notification ({title, body, url}) to every stored subscription.
// Subscriptions that the push service reports as gone (404/410) are
// removed so the table doesn't accumulate dead endpoints.
export async function sendPushToAll(payload) {
  if (!isPushConfigured() || !isSupabaseConfigured()) return

  configure()
  const db = supabaseAdmin()
  const { data: subs, error } = await db.from('push_subscriptions').select('id, endpoint, keys')
  if (error) throw error
  if (!subs || subs.length === 0) return

  const body = JSON.stringify(payload)
  const staleIds = []

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body)
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) staleIds.push(sub.id)
      else console.error('Push send failed:', e.message)
    }
  }))

  if (staleIds.length > 0) {
    await db.from('push_subscriptions').delete().in('id', staleIds)
  }
}

// Sends a notification to a specific player's subscribed devices.
export async function sendPushToPlayer(db, playerId, payload) {
  if (!isPushConfigured() || !playerId) return
  configure()
  const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, keys').eq('player_id', playerId)
  if (!subs?.length) return
  const body = JSON.stringify(payload)
  const staleIds = []
  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body)
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) staleIds.push(sub.id)
    }
  }))
  if (staleIds.length) await db.from('push_subscriptions').delete().in('id', staleIds)
}
