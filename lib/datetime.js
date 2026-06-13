// Date helpers for working with America/New_York wall-clock times,
// used by recurring poll templates.
const TZ = 'America/New_York'

// Returns today's {year, month, day} as seen in the New York timezone.
export function nyTodayParts(now = new Date()) {
  return partsOf(now)
}

function partsOf(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const map = {}
  parts.forEach(p => { map[p.type] = p.value })
  return { year: +map.year, month: +map.month, day: +map.day }
}

// Converts a New York wall-clock date/time to a UTC Date, handling DST.
export function nyToUTC(year, month, day, hour, minute) {
  const naiveUTC = Date.UTC(year, month - 1, day, hour, minute)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(naiveUTC))
  const map = {}
  parts.forEach(p => { map[p.type] = p.value })
  const hour24 = map.hour === '24' ? 0 : +map.hour
  const asNY = Date.UTC(+map.year, +map.month - 1, +map.day, hour24, +map.minute)
  return new Date(naiveUTC + (naiveUTC - asNY))
}

// Day of week (0=Sun..6=Sat) for a calendar date.
export function weekdayOf(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

// Adds `days` to a {year, month, day} object.
export function addDaysToDate(year, month, day, days) {
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + days)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

// Formats {year, month, day} as "YYYY-MM-DD" for storage/comparison.
export function dateToKey({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
