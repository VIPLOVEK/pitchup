import { generateTeams, pickBestSlot, getActivePlayers } from './teams'

const CUTOFF_HOURS = 4
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
 * Given an open poll, decides whether it should now be confirmed or
 * cancelled, based on the player count vs. min_players and the time cutoff.
 * Players beyond max_players sit on the waiting list and don't affect this.
 *
 * Returns null if no change is needed, or a partial poll object with
 * the fields to persist (status, teams, game_time).
 */
export function evaluatePollUpdate(poll) {
  if (poll.status !== 'open') return null

  if (new Date() >= getCutoffTime(poll.slots)) {
    if (poll.players.length >= poll.min_players) return confirmPoll(poll)
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
  if (poll.players.length >= poll.min_players) return false

  const cutoff = getCutoffTime(poll.slots)
  const reminderTime = new Date(cutoff.getTime() - REMINDER_HOURS_BEFORE * 60 * 60 * 1000)
  const now = new Date()
  return now >= reminderTime && now < cutoff
}

function confirmPoll(poll) {
  const activePlayers = getActivePlayers(poll)
  const teams = generateTeams(activePlayers)
  const gameTime = pickBestSlot(activePlayers, poll.slots)
  return { status: 'confirmed', teams, game_time: gameTime }
}
