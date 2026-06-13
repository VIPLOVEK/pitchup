// GET /api/cron/recurring-polls — auto-creates polls from active recurring
// templates once their next occurrence is within `lead_days`. Intended to
// be called once a day (e.g. by Vercel Cron, see vercel.json).
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { nextOccurrence, buildSlots, daysUntil } from '../../../lib/recurring'
import { dateToKey } from '../../../lib/datetime'
import { sendWhatsAppPollCreated } from '../../../lib/whatsapp'

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!isSupabaseConfigured()) return res.status(200).json({ created: 0 })

  const db = supabaseAdmin()

  try {
    const { data: templates, error } = await db.from('poll_templates').select('*').eq('active', true)
    if (error) throw error

    let created = 0
    for (const template of templates) {
      const anchor = nextOccurrence(template)
      if (!anchor || daysUntil(anchor) > template.lead_days) continue

      const slots = buildSlots(template, anchor)

      const { data: poll, error: insertError } = await db
        .from('polls')
        .insert({
          title: template.title,
          location: template.location,
          slots,
          min_players: template.min_players,
          max_players: template.max_players,
          status: 'open',
          players: [],
          teams: null,
          visibility: template.visibility,
          group_ids: template.group_ids,
        })
        .select()
        .single()
      if (insertError) throw insertError

      await db.from('poll_templates').update({ last_created_for: dateToKey(anchor) }).eq('id', template.id)

      if (template.visibility !== 'groups') {
        try {
          await sendWhatsAppPollCreated({ poll })
        } catch (e) {
          console.error('WhatsApp notification failed (non-fatal):', e.message)
        }
      }

      created++
    }

    return res.status(200).json({ created })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
