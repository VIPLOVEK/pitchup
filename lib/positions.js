export const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward']

export const SKILL_LABELS = {
  1: 'Beginner',
  2: 'Casual',
  3: 'Average',
  4: 'Strong',
  5: 'Advanced',
}

export const DEFAULT_SKILL_RATING = 3

// After this many days without a self-rating update, nudge the player to
// re-rate themselves on their profile page.
export const SKILL_RATING_STALE_DAYS = 60

// True if `positionSkills` only rates positions the player has selected,
// with integer ratings from 1-5.
export function isValidPositionSkills(positions, positionSkills) {
  if (typeof positionSkills !== 'object' || positionSkills === null || Array.isArray(positionSkills)) return false
  return Object.entries(positionSkills).every(([pos, rating]) =>
    positions.includes(pos) && Number.isInteger(rating) && rating >= 1 && rating <= 5
  )
}

// A single overall rating derived from per-position ratings (the player's
// strongest position), falling back to `fallback` when there are none.
export function deriveSkillRating(positionSkills, fallback = DEFAULT_SKILL_RATING) {
  const values = Object.values(positionSkills || {})
  return values.length ? Math.max(...values) : fallback
}
