import { generateTeams, pickBestSlot, getActivePlayers, getTotalSpots, expandWithGuests } from './teams'

const DEFAULT_CUTOFF_HOURS = 1.5
const REMINDER_HOURS_BEFORE = 2

/**
 * Returns the next upcoming per-slot cutoff time (the soonest deadline that
 * hasn't passed yet). Used by the UI countdown. Returns null once all slot
 * cutoffs have passed.
 */
export function getCutoffTime(slots, cutoffHours = DEFAULT_CUTOFF_HOURS) {
  if (cutoffHours === null) return null
  if (!slots || slots.length === 0) return null
  const now = new Date()
  const upcoming = slots
    .map(s => new Date(new Date(s).getTime() - cutoffHours * 3600000))
    .filter(c => !isNaN(c.getTime()) && c > now)
    .sort((a, b) => a - b)
  return upcoming[0] || null
}

/** The date a poll is "about" — its confirmed game time, or its earliest
 * proposed slot while still voting, or the far future if neither is set. */
export function effectiveDate(poll) {
  if (poll.game_time) return new Date(poll.game_time)
  if (poll.slots?.length) return new Date(Math.min(...poll.slots.map(s => new Date(s))))
  return new Date(8640000000000000)
}

/** Midnight (23:59:59.999) of the given date's day, in local time. */
export function endOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Whether a poll belongs in the homepage's "active" list. Confirmed games
 * stay active through the day they're played; open polls stay active while
 * voting is still open, or — for a "no cutoff" (manual-close-only) poll —
 * indefinitely, since that poll is never supposed to auto-expire just
 * because its proposed slot time has passed.
 */
export function isPollActive(poll, now = new Date()) {
  if (poll.status !== 'open' && poll.status !== 'confirmed') return false
  if (poll.status === 'confirmed' && !poll.game_time) return true
  if (poll.status === 'confirmed' && poll.game_time) return endOfDay(poll.game_time) > now
  if (poll.cutoff_hours === null) return true
  const cutoff = getCutoffTime(poll.slots, poll.cutoff_hours)
  if (cutoff && cutoff > now) return true
  return effectiveDate(poll) > now
}

/**
 * Whether a poll belongs in the homepage's "past" list. Mirrors
 * isPollActive's open-poll logic but is explicit that a "no cutoff" poll
 * is never considered past on account of its slot time alone — only a
 * real status change (cancelled/finished) moves it there.
 */
export function isPollPast(poll, now = new Date()) {
  if (poll.status === 'cancelled' || poll.status === 'finished') return true
  if (poll.status === 'confirmed' && poll.game_time) return endOfDay(poll.game_time) <= now
  if (poll.status === 'open' && poll.cutoff_hours !== null) {
    return !getCutoffTime(poll.slots, poll.cutoff_hours) && effectiveDate(poll) <= now
  }
  return false
}

/**
 * Given an open poll, decides whether it should now be confirmed or cancelled.
 * Uses poll.cutoff_hours if set, otherwise falls back to 1.5 h.
 *
 * For multi-slot polls each slot has its own cutoff. When a slot's cutoff
 * passes, players who only voted for that slot are dropped from the eligible
 * pool. The poll stays open as long as at least one slot's cutoff hasn't
 * passed yet — only once all slots have expired do we finalize.
 */
export function evaluatePollUpdate(poll) {
  if (poll.status !== 'open') return null
  if (!poll.slots || poll.slots.length === 0) return null
  if (poll.cutoff_hours === null) return null  // manual-close only — never auto-confirm/cancel

  const cutoffHours = poll.cutoff_hours ?? DEFAULT_CUTOFF_HOURS
  const now = new Date()

  // Compute which slot indices have had their individual cutoff pass
  const expiredSlotIndices = new Set(
    poll.slots
      .map((s, i) => ({ i, cutoff: new Date(new Date(s).getTime() - cutoffHours * 3600000) }))
      .filter(({ cutoff }) => now >= cutoff)
      .map(({ i }) => i)
  )
  const hasActiveSlots = expiredSlotIndices.size < poll.slots.length

  // Only count players who voted for at least one still-open slot.
  // Tentative players are always eligible regardless of which slots they picked.
  const eligiblePoll = hasActiveSlots
    ? {
        ...poll,
        players: (poll.players || []).filter(
          p => p.tentative || (p.slots || []).some(i => !expiredSlotIndices.has(i))
        ),
      }
    : poll

  const active = getActivePlayers(eligiblePoll)
  const totalSpots = getTotalSpots(active)

  // Roster full → confirm immediately regardless of cutoff
  if (totalSpots >= poll.max_players) return confirmPoll(eligiblePoll, active)

  // At least one slot is still live → keep the poll open
  if (hasActiveSlots) return null

  // All slot cutoffs have passed → finalize now
  if (totalSpots >= poll.min_players) return confirmPoll(eligiblePoll, active)
  return { status: 'cancelled' }
}

/**
 * True if an open poll is short on players and within REMINDER_HOURS_BEFORE
 * of its next upcoming cutoff, and hasn't already had a reminder sent.
 */
export function shouldSendReminder(poll) {
  if (poll.status !== 'open' || poll.reminder_sent) return false
  if (!poll.slots || poll.slots.length === 0) return false
  if (poll.cutoff_hours === null) return false  // no cutoff = no auto-reminder
  if (getTotalSpots(getActivePlayers(poll)) >= poll.min_players) return false

  const cutoffHours = poll.cutoff_hours ?? DEFAULT_CUTOFF_HOURS
  const now = new Date()
  // Find the next cutoff that hasn't fired yet
  const nextCutoff = poll.slots
    .map(s => new Date(new Date(s).getTime() - cutoffHours * 3600000))
    .filter(c => c > now)
    .sort((a, b) => a - b)[0]
  if (!nextCutoff) return false
  const reminderTime = new Date(nextCutoff.getTime() - REMINDER_HOURS_BEFORE * 3600000)
  return now >= reminderTime && now < nextCutoff
}

function confirmPoll(poll, activePlayers) {
  const expanded = expandWithGuests(activePlayers)
  const teams = generateTeams(expanded)
  const gameTime = pickBestSlot(activePlayers, poll.slots)
  return { status: 'confirmed', teams, game_time: gameTime }
}

// True if a confirmed game ended 55–125 min ago and the MVP push hasn't been sent.
// The 70-minute window ensures the hourly cron always catches it exactly once.
export function shouldSendMvpPush(poll) {
  if (poll.status !== 'confirmed' || poll.mvp_push_sent || !poll.game_time) return false
  const elapsed = (Date.now() - new Date(poll.game_time).getTime()) / 60000
  return elapsed >= 55 && elapsed <= 125
}

// True if a confirmed poll's game is 12–36 h away and the day-before push hasn't been sent.
export function shouldSendConfirmedReminder(poll) {
  if (poll.status !== 'confirmed' || poll.confirmed_reminder_sent || !poll.game_time) return false
  const diff = new Date(poll.game_time).getTime() - Date.now()
  return diff >= 12 * 60 * 60 * 1000 && diff <= 36 * 60 * 60 * 1000
}

// True if a confirmed game is 2–9h away and the same-day push hasn't been sent.
// The noon cron catches evening games (6-9pm) within this window.
export function shouldSendMatchdayReminder(poll) {
  if (poll.status !== 'confirmed' || poll.matchday_reminder_sent || !poll.game_time) return false
  const hoursUntil = (new Date(poll.game_time).getTime() - Date.now()) / 3600000
  return hoursUntil >= 2 && hoursUntil <= 9
}

// True if an open poll's first slot is 36–60 h away and the vote reminder hasn't been sent.
// Fires ~2 days before the game so everyone has time to respond.
export function shouldSendVoteReminder(poll) {
  if (poll.status !== 'open' || poll.vote_reminder_sent) return false
  if (!poll.slots || poll.slots.length === 0) return false
  const earliest = poll.slots.map(s => new Date(s)).sort((a, b) => a - b)[0]
  if (!earliest) return false
  const diff = earliest.getTime() - Date.now()
  return diff >= 36 * 60 * 60 * 1000 && diff <= 60 * 60 * 1000 * 60
}
