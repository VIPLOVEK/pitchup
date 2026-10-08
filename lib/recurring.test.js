import { describe, it, expect } from 'vitest'
import { weekdayName, nextOccurrence, buildSlots, daysUntil } from './recurring'

describe('weekdayName', () => {
  it('maps 0-6 to day names', () => {
    expect(weekdayName(0)).toBe('Sunday')
    expect(weekdayName(6)).toBe('Saturday')
  })

  it('returns empty string for an out-of-range index', () => {
    expect(weekdayName(7)).toBe('')
  })
})

describe('nextOccurrence', () => {
  // "now" is Thursday Jan 1, 2026, noon UTC (well inside the NY calendar day)
  const now = new Date('2026-01-01T17:00:00Z')

  it('finds the next matching weekday, today included if it matches', () => {
    // template.weekday 4 = Thursday, matches "today"
    const result = nextOccurrence({ weekday: 4 }, now)
    expect(result).toEqual({ year: 2026, month: 1, day: 1 })
  })

  it('finds the next matching weekday later in the week when today doesn\'t match', () => {
    // Next Saturday (6) after Thu Jan 1 2026 is Jan 3
    const result = nextOccurrence({ weekday: 6 }, now)
    expect(result).toEqual({ year: 2026, month: 1, day: 3 })
  })

  it('skips today if last_created_for already covers it, advancing a full week', () => {
    const result = nextOccurrence({ weekday: 4, last_created_for: '2026-01-01' }, now)
    expect(result).toEqual({ year: 2026, month: 1, day: 8 })
  })

  it('returns null if no match is found in the 14-day lookahead window (invalid weekday)', () => {
    expect(nextOccurrence({ weekday: 9 }, now)).toBeNull()
  })
})

describe('buildSlots', () => {
  it('builds an ISO slot per offset, relative to the anchor date', () => {
    const template = { slot_offsets: [{ dayOffset: 0, hour: 18, minute: 0 }, { dayOffset: 1, hour: 10, minute: 30 }] }
    const anchor = { year: 2026, month: 6, day: 13 } // a Saturday, EDT (UTC-4)
    const slots = buildSlots(template, anchor)
    expect(slots).toHaveLength(2)
    expect(slots[0]).toBe('2026-06-13T22:00:00.000Z')
    expect(slots[1]).toBe('2026-06-14T14:30:00.000Z')
  })

  it('defaults dayOffset and minute when omitted', () => {
    const template = { slot_offsets: [{ hour: 18 }] }
    const anchor = { year: 2026, month: 6, day: 13 }
    expect(buildSlots(template, anchor)).toEqual(['2026-06-13T22:00:00.000Z'])
  })

  it('returns an empty array when the template has no slot_offsets', () => {
    expect(buildSlots({}, { year: 2026, month: 6, day: 13 })).toEqual([])
  })
})

describe('daysUntil', () => {
  it('returns 0 for today', () => {
    const now = new Date('2026-06-13T17:00:00Z')
    expect(daysUntil({ year: 2026, month: 6, day: 13 }, now)).toBe(0)
  })

  it('returns a positive count for a future date', () => {
    const now = new Date('2026-06-13T17:00:00Z')
    expect(daysUntil({ year: 2026, month: 6, day: 20 }, now)).toBe(7)
  })

  it('returns a negative count for a past date', () => {
    const now = new Date('2026-06-13T17:00:00Z')
    expect(daysUntil({ year: 2026, month: 6, day: 10 }, now)).toBe(-3)
  })
})
