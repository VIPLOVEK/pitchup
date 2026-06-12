/**
 * Players beyond `max_players` (in join order) sit on the waiting list.
 * Removing an active player automatically shifts the next waitlisted
 * player into the active list, since both are derived from position.
 */
export function getActivePlayers(poll) {
  return poll.players.slice(0, poll.max_players)
}

export function getWaitlist(poll) {
  return poll.players.slice(poll.max_players)
}

/**
 * Splits an array of players into two balanced teams.
 * Pass in players array; get back { teamA, teamB }
 */
export function generateTeams(players) {
  const shuffled = [...players]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const half = Math.ceil(shuffled.length / 2)
  return {
    teamA: shuffled.slice(0, half),
    teamB: shuffled.slice(half),
  }
}

/**
 * Given an array of players (each with a `slots` array of slot indices)
 * and the poll's slots array (ISO datetime strings), returns the
 * ISO datetime string of the most-voted slot.
 */
export function pickBestSlot(players, slots) {
  if (!players.length) return slots[0]
  const counts = {}
  players.forEach((p) =>
    (p.slots || []).forEach((i) => {
      counts[i] = (counts[i] || 0) + 1
    })
  )
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return best ? slots[best[0]] : slots[0]
}

/**
 * Formats an ISO datetime string as a human-readable slot label,
 * e.g. "Sat, Jun 13, 6:00 PM".
 */
export function formatSlot(iso) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
