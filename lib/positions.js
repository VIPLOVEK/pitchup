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
