import { describe, it, expect } from 'vitest'
import { nyTodayParts, nyToUTC, weekdayOf, addDaysToDate, dateToKey } from './datetime'

describe('nyToUTC', () => {
  it('converts a New York wall-clock time to the correct UTC instant in EST (winter, UTC-5)', () => {
    // Jan 15 2026, 6:00 PM EST -> 23:00 UTC
    const d = nyToUTC(2026, 1, 15, 18, 0)
    expect(d.toISOString()).toBe('2026-01-15T23:00:00.000Z')
  })

  it('converts correctly in EDT (summer, UTC-4)', () => {
    // Jul 15 2026, 6:00 PM EDT -> 22:00 UTC
    const d = nyToUTC(2026, 7, 15, 18, 0)
    expect(d.toISOString()).toBe('2026-07-15T22:00:00.000Z')
  })

  it('handles the DST spring-forward transition correctly (around March 8, 2026)', () => {
    // 7pm NY time the day after DST starts should still be a clean 7pm local -> UTC conversion
    const d = nyToUTC(2026, 3, 9, 19, 0)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(d)
    const map = {}
    parts.forEach(p => { map[p.type] = p.value })
    expect(`${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}`).toBe('2026-03-09 19:00')
  })

  it('handles the DST fall-back transition correctly (around Nov 1, 2026)', () => {
    const d = nyToUTC(2026, 11, 2, 19, 0)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(d)
    const map = {}
    parts.forEach(p => { map[p.type] = p.value })
    expect(`${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}`).toBe('2026-11-02 19:00')
  })
})

describe('weekdayOf', () => {
  it('returns the correct day of week for a known date', () => {
    // Jan 1 2026 is a Thursday
    expect(weekdayOf(2026, 1, 1)).toBe(4)
  })
})

describe('addDaysToDate', () => {
  it('adds days within a month', () => {
    expect(addDaysToDate(2026, 1, 1, 5)).toEqual({ year: 2026, month: 1, day: 6 })
  })

  it('rolls over a month boundary', () => {
    expect(addDaysToDate(2026, 1, 30, 5)).toEqual({ year: 2026, month: 2, day: 4 })
  })

  it('rolls over a year boundary', () => {
    expect(addDaysToDate(2026, 12, 30, 5)).toEqual({ year: 2027, month: 1, day: 4 })
  })

  it('handles leap-day correctly in a leap year', () => {
    // 2028 is a leap year
    expect(addDaysToDate(2028, 2, 28, 1)).toEqual({ year: 2028, month: 2, day: 29 })
  })
})

describe('dateToKey', () => {
  it('formats and zero-pads as YYYY-MM-DD', () => {
    expect(dateToKey({ year: 2026, month: 3, day: 7 })).toBe('2026-03-07')
  })
})

describe('nyTodayParts', () => {
  it('returns a plausible {year, month, day} shape', () => {
    const parts = nyTodayParts(new Date('2026-06-15T12:00:00Z'))
    expect(parts).toEqual({ year: 2026, month: 6, day: 15 })
  })
})
