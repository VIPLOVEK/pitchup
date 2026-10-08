import { describe, it, expect } from 'vitest'
import { hashPin, verifyPin } from './players'

describe('hashPin / verifyPin', () => {
  it('a hashed PIN verifies successfully against the original PIN', () => {
    const hash = hashPin('4321')
    expect(verifyPin('4321', hash)).toBe(true)
  })

  it('rejects an incorrect PIN', () => {
    const hash = hashPin('4321')
    expect(verifyPin('9999', hash)).toBe(false)
  })

  it('never stores the PIN in plaintext within the hash', () => {
    const hash = hashPin('4321')
    expect(hash).not.toContain('4321')
  })

  it('produces a different hash each time (random salt)', () => {
    expect(hashPin('4321')).not.toBe(hashPin('4321'))
  })

  it('gracefully rejects malformed/missing stored hashes instead of throwing', () => {
    expect(verifyPin('4321', null)).toBe(false)
    expect(verifyPin('4321', undefined)).toBe(false)
    expect(verifyPin('4321', '')).toBe(false)
    expect(verifyPin('4321', 'not-a-valid-hash')).toBe(false)
  })
})
