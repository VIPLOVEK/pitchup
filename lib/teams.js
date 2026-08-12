/**
 * A player entry occupies (1 + guests) spots. Active players are those
 * whose cumulative spot count fits within max_players; the first player
 * whose group would overflow pushes everyone after them to the waitlist.
 * Tentative players are excluded from both active and waitlist counts.
 */
export function getActivePlayers(poll) {
  const max = poll.max_players
  let spots = 0
  const active = []
  for (const p of (poll.players || [])) {
    if (p.tentative) continue
    const need = 1 + (p.guests || 0)
    if (spots + need > max) break
    spots += need
    active.push(p)
  }
  return active
}

export function getWaitlist(poll) {
  const max = poll.max_players
  let spots = 0
  let overflowed = false
  const waitlist = []
  for (const p of (poll.players || [])) {
    if (p.tentative) continue
    if (overflowed) { waitlist.push(p); continue }
    const need = 1 + (p.guests || 0)
    if (spots + need > max) { overflowed = true; waitlist.push(p) }
    else spots += need
  }
  return waitlist
}

export function getTentativePlayers(poll) {
  return (poll.players || []).filter(p => p.tentative)
}

/** Total headcount (players + all guests) for a given player array. */
export function getTotalSpots(players) {
  return players.reduce((sum, p) => sum + 1 + (p.guests || 0), 0)
}

/**
 * Expands a player list so each guest becomes a named synthetic entry.
 * Guests inherit their host's skill_rating and use their recorded position
 * (if the host specified one when joining).
 */
export function expandWithGuests(players) {
  const expanded = []
  for (const p of players) {
    expanded.push(p)
    const g = p.guests || 0
    for (let i = 1; i <= g; i++) {
      const guestPos = p.guestPositions?.[i - 1]
      expanded.push({
        name: `${p.name}'s Guest ${i}`,
        isGuest: true,
        positions: guestPos && guestPos !== 'Any' ? [guestPos] : [],
        skill_rating: p.skill_rating || DEFAULT_SKILL_RATING,
      })
    }
  }
  return expanded
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
 * Returns the average birth year of players who have year_of_birth set,
 * or null if fewer than 2 players have it (not enough data to show).
 */
export function teamAvgYear(players) {
  const withYear = players.filter(p => p.year_of_birth)
  if (withYear.length < 2) return null
  return Math.round(withYear.reduce((sum, p) => sum + p.year_of_birth, 0) / withYear.length)
}

/**
 * Splits an array of players into two balanced teams. Goalkeepers are
 * spread across teams first (so one team doesn't end up with both), then
 * everyone else is distributed via a snake draft ordered by skill (each
 * player's strongest position rating, tie-broken by their next-strongest)
 * shuffled within each tier so total skill stays roughly even.
 * A final pass swaps players to narrow the average-age gap without
 * degrading skill parity.
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

  balancePositions(teamA, teamB)
  balanceAge(teamA, teamB)

  if (Math.random() < 0.5) [teamA, teamB] = [teamB, teamA]
  return { teamA, teamB }
}

/**
 * Post-draft pass: swap players across teams to narrow the average-age gap
 * without worsening skill parity by more than 1 point. Skips goalkeepers
 * and players without a year_of_birth. Repeats until no improvement found.
 */
function balanceAge(teamA, teamB) {
  const avgYear = (team) => {
    const w = team.filter(p => p.year_of_birth)
    if (w.length < 2) return null
    return w.reduce((sum, p) => sum + p.year_of_birth, 0) / w.length
  }
  const isGK = p => (p.positions || []).includes('Goalkeeper')
  const totalSkill = team => team.reduce((s, p) => s + topSkill(p), 0)

  let improved = true
  while (improved) {
    improved = false
    const ya = avgYear(teamA), yb = avgYear(teamB)
    if (!ya || !yb || Math.abs(ya - yb) < 2) break
    const skillA = totalSkill(teamA), skillB = totalSkill(teamB)
    let bestGain = 0, bestI = -1, bestJ = -1
    for (let i = 0; i < teamA.length; i++) {
      if (isGK(teamA[i]) || !teamA[i].year_of_birth) continue
      for (let j = 0; j < teamB.length; j++) {
        if (isGK(teamB[j]) || !teamB[j].year_of_birth) continue
        const newSkillA = skillA - topSkill(teamA[i]) + topSkill(teamB[j])
        const newSkillB = skillB - topSkill(teamB[j]) + topSkill(teamA[i])
        if (Math.abs(newSkillA - newSkillB) > Math.abs(skillA - skillB) + 1) continue
        const wA = teamA.filter(p => p.year_of_birth)
        const wB = teamB.filter(p => p.year_of_birth)
        const sumA = wA.reduce((s, p) => s + p.year_of_birth, 0)
        const sumB = wB.reduce((s, p) => s + p.year_of_birth, 0)
        const newAvgA = (sumA - teamA[i].year_of_birth + teamB[j].year_of_birth) / wA.length
        const newAvgB = (sumB - teamB[j].year_of_birth + teamA[i].year_of_birth) / wB.length
        const before = Math.abs(ya - yb)
        const after = Math.abs(newAvgA - newAvgB)
        if (after < before && before - after > bestGain) {
          bestGain = before - after; bestI = i; bestJ = j
        }
      }
    }
    if (bestI >= 0) { ;[teamA[bestI], teamB[bestJ]] = [teamB[bestJ], teamA[bestI]]; improved = true }
  }
}

/**
 * Post-draft pass: for each field position that's 2+ more on one side,
 * find the closest-skill swap that improves the balance without breaking
 * skill parity (only swaps players within 1 rating point of each other).
 */
function balancePositions(teamA, teamB) {
  for (const pos of ['Defender', 'Midfielder', 'Forward']) {
    const aCount = teamA.filter(p => (p.positions || []).includes(pos)).length
    const bCount = teamB.filter(p => (p.positions || []).includes(pos)).length
    if (Math.abs(aCount - bCount) < 2) continue

    const [rich, poor] = aCount > bCount ? [teamA, teamB] : [teamB, teamA]

    let bestDiff = 2  // only swap if skill diff <= 1
    let bestI = -1, bestJ = -1

    for (let i = 0; i < rich.length; i++) {
      if (!(rich[i].positions || []).includes(pos)) continue
      for (let j = 0; j < poor.length; j++) {
        if ((poor[j].positions || []).includes(pos)) continue
        if ((poor[j].positions || []).includes('Goalkeeper')) continue
        const diff = Math.abs(topSkill(rich[i]) - topSkill(poor[j]))
        if (diff < bestDiff) { bestDiff = diff; bestI = i; bestJ = j }
      }
    }

    if (bestI >= 0 && bestJ >= 0) {
      ;[rich[bestI], poor[bestJ]] = [poor[bestJ], rich[bestI]]
    }
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
 * Splits players into teams by their stored club_team field ('A' or 'B').
 * Players without a club_team default to Team A. Guests follow their host.
 */
export function generateTeamsByAffiliation(players) {
  const teamAPlayers = players.filter(p => p.club_team !== 'B')
  const teamBPlayers = players.filter(p => p.club_team === 'B')
  return {
    teamA: expandWithGuests(teamAPlayers),
    teamB: expandWithGuests(teamBPlayers),
  }
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
