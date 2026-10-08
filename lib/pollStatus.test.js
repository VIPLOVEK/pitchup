import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCutoffTime, evaluatePollUpdate, shouldSendReminder, shouldSendMvpPush,
  shouldSendConfirmedReminder, shouldSendMatchdayReminder, shouldSendVoteReminder,
} from './pollStatus'

const HOUR = 3600 * 1000
const iso = (msFromNow) => new Date(Date.now() + msFromNow).toISOString()

describe('getCutoffTime', () => {
  it('returns null when cutoffHours is null (manual-close poll)', () => {
    expect(getCutoffTime([iso(48 * HOUR)], null)).toBeNull()
  })

  it('returns null with no slots', () => {
    expect(getCutoffTime([], 1.5)).toBeNull()
  })

  it('returns the soonest upcoming cutoff across multiple slots', () => {
    const slots = [iso(48 * HOUR), iso(24 * HOUR)]
    const result = getCutoffTime(slots, 1.5)
    const expected = new Date(new Date(slots[1]).getTime() - 1.5 * HOUR)
    expect(result.getTime()).toBe(expected.getTime())
  })

  it('ignores slot cutoffs that have already passed', () => {
    const slots = [iso(-1 * HOUR), iso(24 * HOUR)]
    const result = getCutoffTime(slots, 1.5)
    const expected = new Date(new Date(slots[1]).getTime() - 1.5 * HOUR)
    expect(result.getTime()).toBe(expected.getTime())
  })
})

describe('evaluatePollUpdate', () => {
  it('is a no-op for non-open polls', () => {
    expect(evaluatePollUpdate({ status: 'confirmed' })).toBeNull()
  })

  it('is a no-op with no slots', () => {
    expect(evaluatePollUpdate({ status: 'open', slots: [] })).toBeNull()
  })

  it('never auto-confirms or auto-cancels when cutoff_hours is null, even with a full roster', () => {
    const poll = {
      status: 'open', slots: [iso(-10 * HOUR)], cutoff_hours: null,
      max_players: 2, min_players: 1,
      players: [{ name: 'A', slots: [0] }, { name: 'B', slots: [0] }],
    }
    expect(evaluatePollUpdate(poll)).toBeNull()
  })

  it('confirms immediately once the roster is full, regardless of cutoff', () => {
    const poll = {
      status: 'open', slots: [iso(48 * HOUR)], cutoff_hours: 1.5,
      max_players: 2, min_players: 1,
      players: [{ name: 'A', slots: [0] }, { name: 'B', slots: [0] }],
    }
    const result = evaluatePollUpdate(poll)
    expect(result.status).toBe('confirmed')
    expect(result.teams).toBeTruthy()
    expect(result.game_time).toBeTruthy()
  })

  it('stays open while a slot cutoff has not yet passed and roster is under min', () => {
    const poll = {
      status: 'open', slots: [iso(48 * HOUR)], cutoff_hours: 1.5,
      max_players: 10, min_players: 5,
      players: [{ name: 'A', slots: [0] }],
    }
    expect(evaluatePollUpdate(poll)).toBeNull()
  })

  it('cancels once all slot cutoffs pass without reaching min_players', () => {
    const poll = {
      status: 'open', slots: [iso(-10 * HOUR)], cutoff_hours: 1.5,
      max_players: 10, min_players: 5,
      players: [{ name: 'A', slots: [0] }],
    }
    expect(evaluatePollUpdate(poll)).toEqual({ status: 'cancelled' })
  })

  it('confirms once all slot cutoffs pass if min_players was reached', () => {
    const poll = {
      status: 'open', slots: [iso(-10 * HOUR)], cutoff_hours: 1.5,
      max_players: 10, min_players: 1,
      players: [{ name: 'A', slots: [0] }],
    }
    const result = evaluatePollUpdate(poll)
    expect(result.status).toBe('confirmed')
  })

  it('drops a player from the eligible pool once their only voted slot has expired', () => {
    // Slot 0 expired, slot 1 is still open. Player A only voted for slot 0 and should
    // no longer count; player B voted for slot 1 and still counts, keeping the poll open.
    const poll = {
      status: 'open',
      slots: [iso(-10 * HOUR), iso(48 * HOUR)],
      cutoff_hours: 1.5, max_players: 10, min_players: 5,
      players: [{ name: 'A', slots: [0] }, { name: 'B', slots: [1] }],
    }
    expect(evaluatePollUpdate(poll)).toBeNull() // still waiting on slot 1's cutoff
  })

  it('a tentative player never counts toward min/max, so a tentative-only poll cancels at cutoff', () => {
    const poll = {
      status: 'open', slots: [iso(-10 * HOUR)], cutoff_hours: 1.5,
      max_players: 2, min_players: 1,
      players: [{ name: 'A', slots: [], tentative: true }],
    }
    expect(evaluatePollUpdate(poll)).toEqual({ status: 'cancelled' })
  })
})

describe('shouldSendReminder', () => {
  it('false once cutoff_hours is null', () => {
    const poll = { status: 'open', slots: [iso(40 * HOUR)], cutoff_hours: null, players: [], min_players: 10 }
    expect(shouldSendReminder(poll)).toBe(false)
  })

  it('false if min_players already reached', () => {
    const poll = {
      status: 'open', slots: [iso(3 * HOUR)], cutoff_hours: 1.5, reminder_sent: false,
      min_players: 1, players: [{ name: 'A', guests: 0 }],
    }
    expect(shouldSendReminder(poll)).toBe(false)
  })

  it('true within the reminder window before the next cutoff, under min_players', () => {
    // cutoff = slot - 1.5h; reminder window = cutoff - 2h to cutoff
    const slot = iso(2 * HOUR) // cutoff is 0.5h from now -> inside the 2h reminder window
    const poll = {
      status: 'open', slots: [slot], cutoff_hours: 1.5, reminder_sent: false,
      min_players: 5, players: [],
    }
    expect(shouldSendReminder(poll)).toBe(true)
  })

  it('false once already sent', () => {
    const slot = iso(2 * HOUR)
    const poll = {
      status: 'open', slots: [slot], cutoff_hours: 1.5, reminder_sent: true,
      min_players: 5, players: [],
    }
    expect(shouldSendReminder(poll)).toBe(false)
  })
})

describe('shouldSendMvpPush', () => {
  it('true 55-125 minutes after kickoff', () => {
    const poll = { status: 'confirmed', mvp_push_sent: false, game_time: iso(-70 * 60 * 1000) }
    expect(shouldSendMvpPush(poll)).toBe(true)
  })

  it('false before 55 minutes have elapsed', () => {
    const poll = { status: 'confirmed', mvp_push_sent: false, game_time: iso(-30 * 60 * 1000) }
    expect(shouldSendMvpPush(poll)).toBe(false)
  })

  it('false after 125 minutes have elapsed', () => {
    const poll = { status: 'confirmed', mvp_push_sent: false, game_time: iso(-200 * 60 * 1000) }
    expect(shouldSendMvpPush(poll)).toBe(false)
  })

  it('false once already sent', () => {
    const poll = { status: 'confirmed', mvp_push_sent: true, game_time: iso(-70 * 60 * 1000) }
    expect(shouldSendMvpPush(poll)).toBe(false)
  })
})

describe('shouldSendConfirmedReminder (day-before push)', () => {
  it('true for a game 12-36h away', () => {
    const poll = { status: 'confirmed', confirmed_reminder_sent: false, game_time: iso(24 * HOUR) }
    expect(shouldSendConfirmedReminder(poll)).toBe(true)
  })

  it('false for a game only 5h away', () => {
    const poll = { status: 'confirmed', confirmed_reminder_sent: false, game_time: iso(5 * HOUR) }
    expect(shouldSendConfirmedReminder(poll)).toBe(false)
  })

  it('false once already sent', () => {
    const poll = { status: 'confirmed', confirmed_reminder_sent: true, game_time: iso(24 * HOUR) }
    expect(shouldSendConfirmedReminder(poll)).toBe(false)
  })
})

describe('shouldSendMatchdayReminder', () => {
  it('true for a game 2-9h away', () => {
    const poll = { status: 'confirmed', matchday_reminder_sent: false, game_time: iso(5 * HOUR) }
    expect(shouldSendMatchdayReminder(poll)).toBe(true)
  })

  it('false for a game 20h away', () => {
    const poll = { status: 'confirmed', matchday_reminder_sent: false, game_time: iso(20 * HOUR) }
    expect(shouldSendMatchdayReminder(poll)).toBe(false)
  })

  it('false for a game only 1h away (too close to the window)', () => {
    const poll = { status: 'confirmed', matchday_reminder_sent: false, game_time: iso(1 * HOUR) }
    expect(shouldSendMatchdayReminder(poll)).toBe(false)
  })

  it('false once already sent', () => {
    const poll = { status: 'confirmed', matchday_reminder_sent: true, game_time: iso(5 * HOUR) }
    expect(shouldSendMatchdayReminder(poll)).toBe(false)
  })
})

describe('shouldSendVoteReminder', () => {
  it('true when the earliest slot is 36-60h away', () => {
    const poll = { status: 'open', vote_reminder_sent: false, slots: [iso(40 * HOUR)] }
    expect(shouldSendVoteReminder(poll)).toBe(true)
  })

  it('false when the earliest slot is only 10h away', () => {
    const poll = { status: 'open', vote_reminder_sent: false, slots: [iso(10 * HOUR)] }
    expect(shouldSendVoteReminder(poll)).toBe(false)
  })

  it('false once already sent', () => {
    const poll = { status: 'open', vote_reminder_sent: true, slots: [iso(40 * HOUR)] }
    expect(shouldSendVoteReminder(poll)).toBe(false)
  })
})
