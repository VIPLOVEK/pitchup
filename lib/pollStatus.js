import { generateTeams, pickBestSlot, getActivePlayers, getTotalSpots, expandWithGuests } from './teams'

const CUTOFF_HOURS = 1.5  // publish teams / call off game 1.5 h before kickoff
const REMINDER_HOURS_BEFORE = 2

/**
 * Voting must close this many hours before the earliest proposed slot.
 */
export function getCutoffTime(slots) {
  const earliest = slots
    .map((s) => new Date(s))
    .sort((a, b) => a - b)[0]
  return new Date(earliest.getTime() - CUTOFF_HOURS * 60 * 60 * 1000)
}

/**
 * Given an open poll, decides whether it should now be confirmed or cancelled:
 *
 *  • Max players reached at any time → confirm immediately, stop voting.
 *  • 1.5 h before kickoff, ≥ min_players → confirm + publish teams.
 *  • 1.5 h before kickoff, < min_players → cancel.
 *
 * Returns null if no change is needed, or a partial poll object with
 * the fields to persist (status, teams, game_time).
 */
export function evaluatePollUpdate(poll) {
  if (poll.status !== 'open') return null

  const active = getActivePlayers(poll)
  const totalSpots = getTotalSpots(active)

  // Roster is full — confirm immediately regardless of time
  if (totalSpots >= poll.max_players) return confirmPoll(poll, active)

  // Time cutoff reached — confirm if enough players, otherwise cancel
  if (new Date() >= getCutoffTime(poll.slots)) {
    if (totalSpots >= poll.min_players) return confirmPoll(poll, active)
    return { status: 'cancelled' }
  }

  return null
}

/**
 * True if an open poll is short on players and within REMINDER_HOURS_BEFORE
 * of its cutoff, and hasn't already had a reminder sent.
 */
export function shouldSendReminder(poll) {
  if (poll.status !== 'open' || poll.reminder_sent) return false
  if (getTotalSpots(getActivePlayers(poll)) >= poll.min_players) return false

  const cutoff = getCutoffTime(poll.slots)
  const reminderTime = new Date(cutoff.getTime() - REMINDER_HOURS_BEFORE * 60 * 60 * 1000)
  const now = new Date()
  return now >= reminderTime && now < cutoff
}

function confirmPoll(poll, activePlayers) {
  const expanded = expandWithGuests(activePlayers)
  const teams = generateTeams(expanded)
  const gameTime = pickBestSlot(activePlayers, poll.slots)
  return { status: 'confirmed', teams, game_time: gameTime }
}

// True if a confirmed poll's game is 12–36 h away and the day-before push hasn't been sent.
export function shouldSendConfirmedReminder(poll) {
  if (poll.status !== 'confirmed' || poll.confirmed_reminder_sent || !poll.game_time) return false
  const diff = new Date(poll.game_time).getTime() - Date.now()
  return diff >= 12 * 60 * 60 * 1000 && diff <= 36 * 60 * 60 * 1000
}
