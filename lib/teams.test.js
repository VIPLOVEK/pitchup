import { describe, it, expect } from 'vitest'
import {
  getActivePlayers, getWaitlist, getTentativePlayers, getTotalSpots,
  expandWithGuests, teamAvgYear, generateTeams, pickBestSlot,
  removePlayerFromTeams, syncPlayerInTeams, generateTeamsByAffiliation,
  formatSlot, applyGroupOpposition, remapSlotVotes,
} from './teams'

describe('getActivePlayers / getWaitlist / getTentativePlayers', () => {
  it('splits players into active vs waitlist at max_players', () => {
    const poll = {
      max_players: 3,
      players: [
        { name: 'A', guests: 0 },
        { name: 'B', guests: 0 },
        { name: 'C', guests: 0 },
        { name: 'D', guests: 0 },
      ],
    }
    expect(getActivePlayers(poll).map(p => p.name)).toEqual(['A', 'B', 'C'])
    expect(getWaitlist(poll).map(p => p.name)).toEqual(['D'])
  })

  it('a guest-heavy entry that would overflow pushes IT (not earlier players) to the waitlist', () => {
    const poll = {
      max_players: 3,
      players: [
        { name: 'A', guests: 0 },
        { name: 'B', guests: 2 }, // needs 3 spots, only 2 left -> overflows
        { name: 'C', guests: 0 },
      ],
    }
    expect(getActivePlayers(poll).map(p => p.name)).toEqual(['A'])
    expect(getWaitlist(poll).map(p => p.name)).toEqual(['B', 'C'])
  })

  it('excludes tentative players from both active and waitlist', () => {
    const poll = {
      max_players: 2,
      players: [
        { name: 'A', guests: 0, tentative: true },
        { name: 'B', guests: 0 },
        { name: 'C', guests: 0 },
      ],
    }
    expect(getActivePlayers(poll).map(p => p.name)).toEqual(['B', 'C'])
    expect(getWaitlist(poll).map(p => p.name)).toEqual([])
    expect(getTentativePlayers(poll).map(p => p.name)).toEqual(['A'])
  })

  it('getTotalSpots counts players plus their guests', () => {
    expect(getTotalSpots([{ guests: 2 }, { guests: 0 }, { guests: 1 }])).toBe(6)
  })
})

describe('expandWithGuests', () => {
  it('gives every guest a neutral baseline skill, never the host\'s rating', () => {
    const expanded = expandWithGuests([{ name: 'Ahmed', skill_rating: 5, guests: 2 }])
    const guests = expanded.filter(p => p.isGuest)
    expect(guests).toHaveLength(2)
    expect(guests.every(g => g.skill_rating === 3)).toBe(true)
  })

  it('names guests sequentially after their host', () => {
    const expanded = expandWithGuests([{ name: 'Ahmed', guests: 2 }])
    expect(expanded.map(p => p.name)).toEqual(['Ahmed', "Ahmed's Guest 1", "Ahmed's Guest 2"])
  })

  it('assigns a guest their recorded position when provided', () => {
    const expanded = expandWithGuests([{ name: 'Ahmed', guests: 1, guestPositions: ['Forward'] }])
    expect(expanded[1].positions).toEqual(['Forward'])
  })

  it('treats "Any" guest position as no preference', () => {
    const expanded = expandWithGuests([{ name: 'Ahmed', guests: 1, guestPositions: ['Any'] }])
    expect(expanded[1].positions).toEqual([])
  })

  it('players without guests pass through unchanged', () => {
    const expanded = expandWithGuests([{ name: 'Ahmed' }])
    expect(expanded).toEqual([{ name: 'Ahmed' }])
  })
})

describe('teamAvgYear', () => {
  it('returns null with fewer than 2 players having a birth year', () => {
    expect(teamAvgYear([{ year_of_birth: 1990 }])).toBeNull()
    expect(teamAvgYear([])).toBeNull()
  })

  it('averages and rounds birth years, ignoring players without one', () => {
    expect(teamAvgYear([{ year_of_birth: 1990 }, { year_of_birth: 1991 }, {}])).toBe(1991)
  })
})

describe('removePlayerFromTeams', () => {
  const teams = {
    teamA: [{ name: 'Kachan' }, { name: 'Ahmed' }, { name: "Ahmed's Guest 1", isGuest: true }],
    teamB: [{ name: 'Somendra' }],
  }

  it('removes the named player and any of their guests, leaves everyone else', () => {
    const result = removePlayerFromTeams(teams, 'Ahmed')
    expect(result.teamA.map(p => p.name)).toEqual(['Kachan'])
    expect(result.teamB.map(p => p.name)).toEqual(['Somendra'])
  })

  it('is case-insensitive on the player name', () => {
    const result = removePlayerFromTeams(teams, 'kachan')
    expect(result.teamA.some(p => p.name === 'Kachan')).toBe(false)
  })

  it('does not remove a guest whose name merely contains the departing name as a substring', () => {
    // "Ahmed" should not match "Ahmed Jr" or similar unrelated names
    const t = { teamA: [{ name: 'Ahmed' }, { name: 'Ahmed Jr' }], teamB: [] }
    const result = removePlayerFromTeams(t, 'Ahmed')
    expect(result.teamA.map(p => p.name)).toEqual(['Ahmed Jr'])
  })

  it('leaves teams untouched when the named player is not present', () => {
    const result = removePlayerFromTeams(teams, 'Nobody')
    expect(result).toEqual(teams)
  })

  it('works on squad layout (teamB always empty)', () => {
    const squad = { teamA: [{ name: 'A' }, { name: 'B' }], teamB: [] }
    const result = removePlayerFromTeams(squad, 'A')
    expect(result.teamA.map(p => p.name)).toEqual(['B'])
    expect(result.teamB).toEqual([])
  })
})

describe('syncPlayerInTeams', () => {
  it('a brand-new player goes to whichever side has fewer real players', () => {
    const teams = { teamA: [{ name: 'Kachan' }], teamB: [{ name: 'Somendra' }, { name: 'Viplove' }] }
    const result = syncPlayerInTeams(teams, { name: 'Rafi' })
    expect(result.teamA.some(p => p.name === 'Rafi')).toBe(true)
    expect(result.teamB.some(p => p.name === 'Rafi')).toBe(false)
  })

  it('an existing member is updated IN PLACE on their current side, never moved', () => {
    // teamB has more players, but Somendra is already on teamB — must stay there
    const teams = { teamA: [{ name: 'Kachan' }], teamB: [{ name: 'Somendra', guests: 0 }, { name: 'Viplove' }] }
    const result = syncPlayerInTeams(teams, { name: 'Somendra', guests: 2 })
    expect(result.teamB.some(p => p.name === 'Somendra')).toBe(true)
    expect(result.teamA.some(p => p.name === 'Somendra')).toBe(false)
  })

  it('updating an existing member refreshes their guest chips', () => {
    const teams = { teamA: [{ name: 'Kachan', guests: 0 }], teamB: [] }
    const result = syncPlayerInTeams(teams, { name: 'Kachan', guests: 2 })
    const guestNames = result.teamA.filter(p => p.isGuest).map(p => p.name)
    expect(guestNames).toEqual(["Kachan's Guest 1", "Kachan's Guest 2"])
  })

  it('squad mode always places a new player in teamA, never teamB', () => {
    const teams = { teamA: [{ name: 'Kachan' }], teamB: [] }
    const result = syncPlayerInTeams(teams, { name: 'Rafi' }, { squad: true })
    expect(result.teamA.some(p => p.name === 'Rafi')).toBe(true)
    expect(result.teamB).toEqual([])
  })

  it('ties in team size go to teamA', () => {
    const teams = { teamA: [{ name: 'Kachan' }], teamB: [{ name: 'Somendra' }] }
    const result = syncPlayerInTeams(teams, { name: 'Rafi' })
    expect(result.teamA.some(p => p.name === 'Rafi')).toBe(true)
  })
})

describe('generateTeams', () => {
  it('splits all players between the two teams with none lost or duplicated', () => {
    const players = Array.from({ length: 10 }, (_, i) => ({ name: `P${i}`, skill_rating: 3 }))
    const { teamA, teamB } = generateTeams(players)
    expect(teamA.length + teamB.length).toBe(10)
    const allNames = [...teamA, ...teamB].map(p => p.name).sort()
    expect(allNames).toEqual(players.map(p => p.name).sort())
  })

  it('keeps team sizes within 1 of each other for an odd roster', () => {
    const players = Array.from({ length: 11 }, (_, i) => ({ name: `P${i}`, skill_rating: 3 }))
    const { teamA, teamB } = generateTeams(players)
    expect(Math.abs(teamA.length - teamB.length)).toBeLessThanOrEqual(1)
  })

  it('spreads goalkeepers across both teams rather than stacking one side', () => {
    const gks = Array.from({ length: 4 }, (_, i) => ({ name: `GK${i}`, positions: ['Goalkeeper'], skill_rating: 3 }))
    const { teamA, teamB } = generateTeams(gks)
    const gkCount = (team) => team.filter(p => (p.positions || []).includes('Goalkeeper')).length
    expect(Math.abs(gkCount(teamA) - gkCount(teamB))).toBeLessThanOrEqual(1)
  })

  it('keeps total skill roughly balanced between teams', () => {
    const players = [
      ...Array.from({ length: 4 }, (_, i) => ({ name: `Strong${i}`, skill_rating: 5 })),
      ...Array.from({ length: 4 }, (_, i) => ({ name: `Weak${i}`, skill_rating: 1 })),
    ]
    const { teamA, teamB } = generateTeams(players)
    const totalSkill = (team) => team.reduce((s, p) => s + (p.skill_rating || 3), 0)
    // 4x5 + 4x1 = 24 total; a reasonable balance keeps each side within a few points of 12
    expect(Math.abs(totalSkill(teamA) - totalSkill(teamB))).toBeLessThanOrEqual(6)
  })

  describe('colorBias (White/Colors rotation fairness)', () => {
    // Two players with clearly distinct skill (5 vs 1, no goalkeepers) draft
    // deterministically: Alice always lands in the pre-swap "first" group,
    // Bob in the "second" — so these tests aren't at the mercy of the
    // internal tie-breaking shuffle, and isolate just the swap decision.

    it('puts a White-heavy player on Colors this time, correcting the imbalance', () => {
      const players = [{ name: 'Alice', skill_rating: 5 }, { name: 'Bob', skill_rating: 1 }]
      // Alice has a net +5 (been on White 5 more times than Colors); Bob has no history.
      const { teamA, teamB } = generateTeams(players, { colorBias: { alice: 5 } })
      expect(teamB.some(p => p.name === 'Alice')).toBe(true) // Colors
      expect(teamA.some(p => p.name === 'Bob')).toBe(true) // White
    })

    it('puts a Colors-heavy player on White this time', () => {
      const players = [{ name: 'Alice', skill_rating: 5 }, { name: 'Bob', skill_rating: 1 }]
      // Alice has a net -5 (been on Colors 5 more times than White).
      const { teamA, teamB } = generateTeams(players, { colorBias: { alice: -5 } })
      expect(teamA.some(p => p.name === 'Alice')).toBe(true) // White
      expect(teamB.some(p => p.name === 'Bob')).toBe(true) // Colors
    })

    it('treats a player missing from the bias map as neutral (0), not as a crash', () => {
      const players = [{ name: 'Alice', skill_rating: 5 }, { name: 'Bob', skill_rating: 1 }]
      expect(() => generateTeams(players, { colorBias: {} })).not.toThrow()
    })

    it('with no colorBias option at all, behaves like the original coin-flip (no crash, both teams populated)', () => {
      const players = [{ name: 'Alice', skill_rating: 5 }, { name: 'Bob', skill_rating: 1 }]
      const { teamA, teamB } = generateTeams(players)
      expect(teamA.length + teamB.length).toBe(2)
    })
  })
})

describe('generateTeamsByAffiliation', () => {
  it('splits players by their club_team field, defaulting unset to A', () => {
    const players = [
      { name: 'A1', club_team: 'A' },
      { name: 'B1', club_team: 'B' },
      { name: 'NoClub' },
    ]
    const { teamA, teamB } = generateTeamsByAffiliation(players)
    expect(teamA.map(p => p.name)).toEqual(['A1', 'NoClub'])
    expect(teamB.map(p => p.name)).toEqual(['B1'])
  })

  it('expands guests within each club side', () => {
    const players = [{ name: 'A1', club_team: 'A', guests: 1 }]
    const { teamA } = generateTeamsByAffiliation(players)
    expect(teamA.map(p => p.name)).toEqual(['A1', "A1's Guest 1"])
  })
})

describe('pickBestSlot', () => {
  const slots = ['2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z', '2026-01-03T00:00:00Z']

  it('returns the slot with the most votes', () => {
    const players = [
      { slots: [1] }, { slots: [1] }, { slots: [0] },
    ]
    expect(pickBestSlot(players, slots)).toBe(slots[1])
  })

  it('falls back to the first slot when nobody has voted', () => {
    expect(pickBestSlot([], slots)).toBe(slots[0])
  })

  it('counts a player who voted for multiple slots toward each one', () => {
    const players = [{ slots: [0, 2] }, { slots: [2] }]
    expect(pickBestSlot(players, slots)).toBe(slots[2])
  })
})

describe('formatSlot', () => {
  it('formats a valid ISO string into a readable label', () => {
    const label = formatSlot('2026-06-13T22:00:00Z')
    expect(label).toMatch(/\w{3}, \w{3} \d{1,2}, \d{1,2}:\d{2} (AM|PM)/)
  })

  it('returns the input unchanged for an invalid date string', () => {
    expect(formatSlot('not-a-date')).toBe('not-a-date')
  })
})

describe('applyGroupOpposition', () => {
  const rule = (playerName, groupMemberNames) => ({ playerName, groupMemberNames: new Set(groupMemberNames) })

  it('is a no-op with no rules', () => {
    const teams = { teamA: [{ name: 'A' }], teamB: [{ name: 'B' }] }
    expect(applyGroupOpposition(teams, [])).toEqual(teams)
  })

  it('reunites a host and guest who ended up split across teams', () => {
    const teams = {
      teamA: [{ name: 'Filler1', skill_rating: 3 }, { name: "Ahmed's Guest 1", isGuest: true, skill_rating: 3 }],
      teamB: [{ name: 'Ahmed', skill_rating: 3 }, { name: 'Filler2', skill_rating: 3 }],
    }
    const result = applyGroupOpposition(teams, [rule('Ahmed', [])])
    const sideOf = (name) => result.teamA.some(p => p.name === name) ? 'A' : 'B'
    expect(sideOf('Ahmed')).toBe(sideOf("Ahmed's Guest 1"))
  })

  it('reproduces the real reported scenario: split host lands on the group-majority side, gets reunited AND moved to the minority side', () => {
    // Mirrors "The Shinpads" (4 Purple Pack) vs "The Megs" (5 Purple Pack):
    // Ahmed on the majority team, his guest alone on the minority team.
    const teams = {
      teamA: [ // minority team (fewer Purple Pack members)
        { name: 'Benhur', skill_rating: 3 }, { name: 'Vishnu N', skill_rating: 3 },
        { name: "Ahmed's Guest 1", isGuest: true, skill_rating: 3 }, { name: 'Abhi', skill_rating: 3 },
        { name: 'Dheeraj R', skill_rating: 3 }, { name: 'Rohith', skill_rating: 3 }, { name: 'Arun C', skill_rating: 3 },
      ],
      teamB: [ // majority team (fewer Purple Pack members)
        { name: 'Safat-L', skill_rating: 3 }, { name: 'Viplove', skill_rating: 3 }, { name: 'Yahit', skill_rating: 3 },
        { name: 'Ahmed', skill_rating: 3 }, { name: 'Vipin', skill_rating: 3 }, { name: 'Kachan', skill_rating: 3 }, { name: 'Godfrey', skill_rating: 3 },
      ],
    }
    const purplePack = ['benhur', 'vishnu n', 'abhi', 'dheeraj r', 'safat-l', 'viplove', 'yahit', 'vipin', 'kachan']
    const result = applyGroupOpposition(teams, [rule('Ahmed', purplePack)])

    const sideOf = (name) => result.teamA.some(p => p.name === name) ? 'A' : 'B'
    expect(sideOf('Ahmed')).toBe(sideOf("Ahmed's Guest 1")) // reunited
    expect(sideOf('Ahmed')).toBe('A') // moved to the Purple-Pack-minority side
  })

  it('leaves an already-correctly-placed pair untouched', () => {
    const teams = {
      teamA: [{ name: 'Ahmed', skill_rating: 3 }, { name: "Ahmed's Guest 1", isGuest: true, skill_rating: 3 }, { name: 'Filler', skill_rating: 3 }],
      teamB: [{ name: 'GroupMember', skill_rating: 3 }],
    }
    const result = applyGroupOpposition(teams, [rule('Ahmed', ['groupmember'])])
    expect(result).toEqual(teams)
  })

  it('does not touch teams for a rule whose player is not present', () => {
    const teams = { teamA: [{ name: 'X' }], teamB: [{ name: 'Y' }] }
    expect(applyGroupOpposition(teams, [rule('Nobody', ['x'])])).toEqual(teams)
  })

  it('refuses a nudge swap that would blow the skill tolerance, leaving the pair on the majority side', () => {
    // Ahmed (skill 1) is the weak link holding his already-balanced,
    // group-majority team together — swapping him for either skill-5
    // player on the other side would blow a tight 1-point gap out to 9,
    // far past tolerance, so the rule should back off rather than force it.
    const teams = {
      teamA: [{ name: 'Strong1', skill_rating: 5 }, { name: 'Strong2', skill_rating: 5 }], // total 10
      teamB: [{ name: 'Ahmed', skill_rating: 1 }, { name: 'GroupMember', skill_rating: 5 }, { name: 'GroupMember2', skill_rating: 5 }], // total 11
    }
    const result = applyGroupOpposition(teams, [rule('Ahmed', ['groupmember', 'groupmember2'])])
    const sideOf = (name) => result.teamA.some(p => p.name === name) ? 'A' : 'B'
    expect(sideOf('Ahmed')).toBe('B') // stayed put — no acceptable swap existed
  })
})

describe('remapSlotVotes', () => {
  // Regression coverage for a real report: a player who voted for the
  // evening slot showed up as having voted for the morning slot after
  // the admin edited the poll's time slots. Root cause: votes are stored
  // as indices into poll.slots, and the old remap logic only dropped
  // indices past the new array's length — it never accounted for an
  // earlier slot being removed or reordered, which shifts every later
  // index to point at a different slot's content.

  it('keeps a vote pointing at the same slot content after an earlier slot is removed', () => {
    const oldSlots = ['2026-10-18T12:30:00Z', '2026-10-18T22:00:00Z'] // morning, evening
    const newSlots = ['2026-10-18T22:00:00Z'] // morning removed
    const players = [{ name: 'Kachan', slots: [1] }] // voted for the evening slot (old index 1)
    const result = remapSlotVotes(players, oldSlots, newSlots)
    // Evening is now index 0 — the vote must follow the content, not stay "1"
    expect(result[0].slots).toEqual([0])
  })

  it('drops a vote for a slot that was actually removed, keeps votes for slots that remain', () => {
    const oldSlots = ['2026-10-18T12:30:00Z', '2026-10-18T22:00:00Z']
    const newSlots = ['2026-10-18T22:00:00Z']
    const players = [{ name: 'Yahit', slots: [0, 1] }] // voted for both
    const result = remapSlotVotes(players, oldSlots, newSlots)
    expect(result[0].slots).toEqual([0]) // only the surviving (evening) vote remains
  })

  it('remaps correctly when a new slot is inserted before existing ones', () => {
    const oldSlots = ['2026-10-18T22:00:00Z'] // evening, was index 0
    const newSlots = ['2026-10-18T12:30:00Z', '2026-10-18T22:00:00Z'] // morning inserted first
    const players = [{ name: 'Kachan', slots: [0] }] // voted for evening
    const result = remapSlotVotes(players, oldSlots, newSlots)
    expect(result[0].slots).toEqual([1]) // evening is now index 1
  })

  it('leaves votes untouched when slots are not reordered at all', () => {
    const slots = ['2026-10-18T12:30:00Z', '2026-10-18T22:00:00Z']
    const players = [{ name: 'A', slots: [0, 1] }, { name: 'B', slots: [1] }]
    const result = remapSlotVotes(players, slots, slots)
    expect(result[0].slots).toEqual([0, 1])
    expect(result[1].slots).toEqual([1])
  })

  it('preserves every other field on the player entry untouched', () => {
    const slots = ['2026-10-18T22:00:00Z']
    const players = [{ name: 'Kachan', slots: [0], guests: 2, note: 'bringing cleats', playerId: 'p1' }]
    const result = remapSlotVotes(players, slots, slots)
    expect(result[0]).toMatchObject({ name: 'Kachan', guests: 2, note: 'bringing cleats', playerId: 'p1' })
  })
})
