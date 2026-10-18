// Builds each player's historical White (teamA) vs Colors (teamB) balance
// from past confirmed/finished games — used to bias which computed group
// gets which color instead of a blind coin flip, so a run of bad luck
// doesn't repeatedly stick the same cluster of players on the same side.
// Server-side only (needs db). Mirrors the admin roster's team-history
// display (pages/admin.js) so the two stay consistent.
export async function buildColorBias(db) {
  const { data: pastPolls, error } = await db
    .from('polls')
    .select('teams, status')
    .in('status', ['confirmed', 'finished'])
    .not('teams', 'is', null)
  if (error) throw error

  const bias = {}
  for (const poll of pastPolls || []) {
    const { teamA = [], teamB = [] } = poll.teams || {}
    for (const p of teamA) {
      if (p.isGuest || !p.name) continue
      const key = p.name.toLowerCase()
      bias[key] = (bias[key] || 0) + 1 // +1 per White appearance
    }
    for (const p of teamB) {
      if (p.isGuest || !p.name) continue
      const key = p.name.toLowerCase()
      bias[key] = (bias[key] || 0) - 1 // -1 per Colors appearance
    }
  }
  return bias
}
