/**
 * Splits an array of players into two balanced teams.
 * Pass in players array; get back { teamA, teamB }
 */
export function generateTeams(players) {
  const shuffled = [...players].sort(() => Math.random() - 0.5)
  const half = Math.ceil(shuffled.length / 2)
  return {
    teamA: shuffled.slice(0, half),
    teamB: shuffled.slice(half),
  }
}

/**
 * Given an array of players (each with a `slots` array of slot indices)
 * and the poll's slots array, returns the most-voted slot label.
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
