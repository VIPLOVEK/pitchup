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

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const DEFAULT_SKILL_RATING = 3

/**
 * A player's skill values across their preferred positions, sorted from
 * strongest to weakest (e.g. Forward 4 / Defender 2 -> [4, 2]). Players
 * with no preferred positions ("Any") use their single overall rating.
 */
function skillVector(p) {
  const positions = p.positions || []
  if (positions.length === 0) return [p.skill_rating || DEFAULT_SKILL_RATING]
  const skills = p.position_skills || {}
  return positions
    .map((pos) => skills[pos] || DEFAULT_SKILL_RATING)
    .sort((a, b) => b - a)
}

/** A single scalar for team-total balancing: the player's strongest skill. */
function topSkill(p) {
  return skillVector(p)[0]
}

/**
 * Compares two players by their strongest skill; ties are broken by their
 * next-strongest skill, and so on — "strongest feature wins, then the
 * next one".
 */
function compareBySkill(a, b) {
  const va = skillVector(a)
  const vb = skillVector(b)
  const len = Math.max(va.length, vb.length)
  for (let i = 0; i < len; i++) {
    const diff = (vb[i] ?? 0) - (va[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * Splits an array of players into two balanced teams. Goalkeepers are
 * spread across teams first (so one team doesn't end up with both), then
 * everyone else is distributed via a snake draft ordered by skill (each
 * player's strongest position rating, tie-broken by their next-strongest)
 * shuffled within each tier so total skill stays roughly even.
 * Pass in players array; get back { teamA, teamB }
 */
export function generateTeams(players) {
  const isGoalkeeper = (p) => (p.positions || []).includes('Goalkeeper')
  const rating = (p) => topSkill(p)
  const goalkeepers = shuffle(players.filter(isGoalkeeper))
  const others = shuffle(players.filter((p) => !isGoalkeeper(p)))
    .sort(compareBySkill)

  let teamA = []
  let teamB = []
  let teamARating = 0
  let teamBRating = 0

  for (const p of goalkeepers) {
    if (teamA.length <= teamB.length) teamA.push(p)
    else teamB.push(p)
  }

  for (const p of others) {
    let addToA
    if (teamA.length < teamB.length) addToA = true
    else if (teamB.length < teamA.length) addToA = false
    else addToA = teamARating <= teamBRating

    if (addToA) { teamA.push(p); teamARating += rating(p) }
    else { teamB.push(p); teamBRating += rating(p) }
  }

  if (Math.random() < 0.5) [teamA, teamB] = [teamB, teamA]
  return { teamA, teamB }
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
    timeZone: 'America/New_York',
  })
}
