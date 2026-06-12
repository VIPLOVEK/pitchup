import crypto from 'crypto'

export function hashPin(pin) {
  const salt = crypto.randomBytes(8).toString('hex')
  const hash = crypto.scryptSync(pin, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPin(pin, stored) {
  const [salt, hash] = (stored || '').split(':')
  if (!salt || !hash) return false
  const check = crypto.scryptSync(pin, salt, 32).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'))
}
