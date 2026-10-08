import { describe, it, expect } from 'vitest'
import { isValidPositionSkills, deriveSkillRating, POSITIONS, SKILL_LABELS, DEFAULT_SKILL_RATING } from './positions'

describe('isValidPositionSkills', () => {
  it('accepts ratings 1-5 for positions the player actually selected', () => {
    expect(isValidPositionSkills(['Forward', 'Midfielder'], { Forward: 5, Midfielder: 1 })).toBe(true)
  })

  it('rejects a rating for a position not in the player\'s selected list', () => {
    expect(isValidPositionSkills(['Forward'], { Midfielder: 3 })).toBe(false)
  })

  it('rejects non-integer or out-of-range ratings', () => {
    expect(isValidPositionSkills(['Forward'], { Forward: 0 })).toBe(false)
    expect(isValidPositionSkills(['Forward'], { Forward: 6 })).toBe(false)
    expect(isValidPositionSkills(['Forward'], { Forward: 3.5 })).toBe(false)
  })

  it('rejects non-object input', () => {
    expect(isValidPositionSkills(['Forward'], null)).toBe(false)
    expect(isValidPositionSkills(['Forward'], [1, 2, 3])).toBe(false)
  })

  it('accepts an empty ratings object', () => {
    expect(isValidPositionSkills(['Forward'], {})).toBe(true)
  })
})

describe('deriveSkillRating', () => {
  it('returns the strongest position rating', () => {
    expect(deriveSkillRating({ Forward: 2, Defender: 5, Midfielder: 3 })).toBe(5)
  })

  it('falls back to the given default with no position ratings', () => {
    expect(deriveSkillRating({}, 4)).toBe(4)
    expect(deriveSkillRating(null, 2)).toBe(2)
  })

  it('uses DEFAULT_SKILL_RATING when no fallback is given', () => {
    expect(deriveSkillRating({})).toBe(DEFAULT_SKILL_RATING)
  })
})

describe('constants', () => {
  it('POSITIONS has exactly the four field positions', () => {
    expect(POSITIONS).toEqual(['Goalkeeper', 'Defender', 'Midfielder', 'Forward'])
  })

  it('SKILL_LABELS covers all 5 levels', () => {
    expect(Object.keys(SKILL_LABELS).sort()).toEqual(['1', '2', '3', '4', '5'])
  })
})
