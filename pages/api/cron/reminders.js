// GET /api/cron/reminders — sends a WhatsApp nudge for open polls that
// are short on players and approaching their voting cutoff. Intended to
// be called periodically (e.g. by Vercel Cron, see vercel.json).
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { shouldSendReminder, shouldSendConfirmedReminder, shouldSendVoteReminder, shouldSendMvpPush } from '../../../lib/pollStatus'
import { sendWhatsAppReminder } from '../../../lib/whatsapp'
import { sendPushToAll } from '../../../lib/push'
import { formatSlot } from '../../../lib/teams'

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
        try {
          await sendPushToAll({
            title: '⏰ Voting closes soon',
            body: `${poll.title} needs more players before voting closes — tap to join!`,
            url: `/poll/${poll.id}`,
          })
        } catch (e) {
          console.error(`Push reminder failed for poll ${poll.id}:`, e.message)
        }
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

    // ~2-day-before vote reminder for open polls
    for (const poll of openPolls) {
      if (!shouldSendVoteReminder(poll)) continue
      try {
        const count = poll.players?.length ?? 0
        await sendPushToAll({
          title: '📋 Don\'t forget to vote!',
          body: `${poll.title} — ${count} player${count !== 1 ? 's' : ''} signed up so far. Pick your slot!`,
          url: `/poll/${poll.id}`,
        })
        await db.from('polls').update({ vote_reminder_sent: true, version: poll.version + 1 }).eq('id', poll.id).eq('version', poll.version)
        sent++
      } catch (e) {
        console.error(`Vote reminder failed for poll ${poll.id}:`, e.message)
      }
    }

    // Day-before push for confirmed games
    const { data: confirmedPolls, error: confErr } = await db.from('polls').select('*').eq('status', 'confirmed').eq('confirmed_reminder_sent', false)
    if (!confErr && confirmedPolls) {
      for (const poll of confirmedPolls) {
        if (!shouldSendConfirmedReminder(poll)) continue
        try {
          await sendPushToAll({
            title: '⚽ Game tomorrow!',
            body: `${poll.title} is confirmed for ${poll.game_time ? formatSlot(poll.game_time) : 'soon'} at ${poll.location}. See you there!`,
            url: `/poll/${poll.id}`,
          })
          await db.from('polls').update({ confirmed_reminder_sent: true }).eq('id', poll.id)
          sent++
        } catch (e) {
          console.error(`Confirmed reminder failed for poll ${poll.id}:`, e.message)
        }
      }
    }

    // Post-game MVP voting push — fires ~1h after kickoff
    const { data: mvpPolls, error: mvpErr } = await db
      .from('polls').select('*').eq('status', 'confirmed').eq('mvp_push_sent', false)
    if (!mvpErr && mvpPolls) {
      for (const poll of mvpPolls) {
        if (!shouldSendMvpPush(poll)) continue
        try {
          await sendPushToAll({
            title: '⭐ Man of the Match',
            body: `Who stood out in ${poll.title}? Tap to cast your vote!`,
            url: `/poll/${poll.id}`,
          })
          await db.from('polls').update({ mvp_push_sent: true }).eq('id', poll.id)
          sent++
        } catch (e) {
          console.error(`MVP push failed for poll ${poll.id}:`, e.message)
        }
      }
    }

    // Auto-lock teams when kickoff is approaching
    const { data: autoLockPolls } = await db.from('polls')
      .select('*').eq('status', 'confirmed').eq('teams_locked', false)
      .not('auto_lock_hours', 'is', null).not('game_time', 'is', null)
    if (autoLockPolls) {
      for (const poll of autoLockPolls) {
        const hoursUntil = (new Date(poll.game_time) - Date.now()) / 3600000
        if (hoursUntil > 0 && hoursUntil <= poll.auto_lock_hours) {
          try {
            await db.from('polls').update({ teams_locked: true }).eq('id', poll.id)
            await sendPushToAll({
              title: '🔐 Teams locked!',
              body: `${poll.title} — teams are set for ${formatSlot(poll.game_time)}. See you there!`,
              url: `/poll/${poll.id}`,
            })
            sent++
          } catch (e) { console.error('Auto-lock failed:', e.message) }
        }
      }
    }

    return res.status(200).json({ sent })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
