// GET /api/cron/reminders — sends a WhatsApp nudge for open polls that
// are short on players and approaching their voting cutoff. Intended to
// be called periodically (e.g. by Vercel Cron, see vercel.json).
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { shouldSendReminder } from '../../../lib/pollStatus'
import { sendWhatsAppReminder } from '../../../lib/whatsapp'

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!isSupabaseConfigured()) return res.status(200).json({ sent: 0 })

  const db = supabaseAdmin()

  try {
    const { data: openPolls, error } = await db.from('polls').select('*').eq('status', 'open')
    if (error) throw error

    let sent = 0
    for (const poll of openPolls) {
      if (!shouldSendReminder(poll)) continue

      try {
        await sendWhatsAppReminder({ poll })
        await db
          .from('polls')
          .update({ reminder_sent: true, version: poll.version + 1 })
          .eq('id', poll.id)
          .eq('version', poll.version)
        sent++
      } catch (e) {
        console.error(`Reminder failed for poll ${poll.id}:`, e.message)
      }
    }

    return res.status(200).json({ sent })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
