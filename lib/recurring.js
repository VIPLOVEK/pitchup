import { nyTodayParts, nyToUTC, weekdayOf, addDaysToDate, dateToKey } from './datetime'

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function weekdayName(weekday) {
  return WEEKDAY_NAMES[weekday] || ''
}

// Finds the next date matching template.weekday that's after last_created_for
// (so each weekly occurrence only generates one poll). Returns {year, month, day}.
export function nextOccurrence(template, now = new Date()) {
  let cursor = nyTodayParts(now)
  for (let i = 0; i < 14; i++) {
    if (weekdayOf(cursor.year, cursor.month, cursor.day) === template.weekday) {
      const key = dateToKey(cursor)
      if (!template.last_created_for || key > template.last_created_for) {
        return cursor
      }
    }
    cursor = addDaysToDate(cursor.year, cursor.month, cursor.day, 1)
  }
  return null
}

// Builds ISO datetime strings for a poll's slots from the template's
// slot_offsets, relative to the anchor date.
export function buildSlots(template, anchor) {
  return (template.slot_offsets || []).map(({ dayOffset = 0, hour, minute = 0 }) => {
    const d = addDaysToDate(anchor.year, anchor.month, anchor.day, dayOffset)
    return nyToUTC(d.year, d.month, d.day, hour, minute).toISOString()
  })
}

// Number of days between today (NY) and the anchor date.
export function daysUntil(anchor, now = new Date()) {
  const today = nyTodayParts(now)
  const todayUTC = Date.UTC(today.year, today.month - 1, today.day)
  const anchorUTC = Date.UTC(anchor.year, anchor.month - 1, anchor.day)
  return Math.round((anchorUTC - todayUTC) / 86400000)
}
