// GET   /api/players/[id] — fetch a profile (used to restore a saved session)
// PATCH /api/players/[id] — update name/phone/positions (requires current PIN)
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'
import { verifyPin, hashPin } from '../../../lib/players'
import { POSITIONS, isValidPositionSkills, deriveSkillRating } from '../../../lib/positions'

export default async function handler(req, res) {
  const { id } = req.query
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })
  const db = supabaseAdmin()

  // Terms acceptance — no PIN required
  if (req.method === 'PATCH' && req.body?.acceptTerms === true && !req.body?.pin) {
    try {
      const { data, error } = await db
        .from('players')
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, terms_accepted_at')
        .single()
      if (error) throw error
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await db
        .from('players')
        .select('id, name, phone, year_of_birth, positions, skill_rating, skill_rating_updated_at, position_skills, avatar_url, auto_join, auto_join_until, blackout_ranges, terms_accepted_at')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'PATCH') {
    const { pin, newPin, name, phone, positions, skillRating, positionSkills, autoJoin, autoJoinUntil, blackoutRanges, yearOfBirth } = req.body
    if (!pin) return res.status(400).json({ error: 'Current PIN is required' })
    if (newPin !== undefined && !/^\d{4,6}$/.test(newPin)) return res.status(400).json({ error: 'New PIN must be 4-6 digits' })
    if (name !== undefined && !name?.trim()) return res.status(400).json({ error: 'Name cannot be empty' })
    if (name !== undefined && name.trim().length > 60) return res.status(400).json({ error: 'Name is too long' })
    if (positions && (!Array.isArray(positions) || positions.some(p => !POSITIONS.includes(p)))) {
      return res.status(400).json({ error: 'Invalid position' })
    }
    if (skillRating !== undefined && (!Number.isInteger(skillRating) || skillRating < 1 || skillRating > 5)) {
      return res.status(400).json({ error: 'Skill rating must be between 1 and 5' })
    }
    if (positionSkills !== undefined && !isValidPositionSkills(positions || [], positionSkills)) {
      return res.status(400).json({ error: 'Invalid position skills' })
    }
    if (yearOfBirth !== undefined && yearOfBirth !== null) {
      const y = parseInt(yearOfBirth, 10)
      if (isNaN(y) || y < 1940 || y > new Date().getFullYear() - 10) return res.status(400).json({ error: 'Invalid birth year' })
    }

    try {
      const { data: player, error: fetchErr } = await db.from('players').select('*').eq('id', id).maybeSingle()
      if (fetchErr) throw fetchErr
      if (!player || !verifyPin(pin, player.pin_hash)) {
        return res.status(401).json({ error: 'PIN is incorrect' })
      }

      const update = {}
      if (name !== undefined) update.name = name.trim()
      if (phone !== undefined) update.phone = phone?.trim() || null
      if (positions !== undefined) update.positions = positions
      if (positionSkills !== undefined || skillRating !== undefined) {
        update.position_skills = positionSkills !== undefined ? positionSkills : player.position_skills
        update.skill_rating = deriveSkillRating(update.position_skills, skillRating ?? player.skill_rating)
        update.skill_rating_updated_at = new Date().toISOString()
      }
      if (yearOfBirth !== undefined) update.year_of_birth = yearOfBirth ? parseInt(yearOfBirth, 10) : null
      if (newPin !== undefined) update.pin_hash = hashPin(newPin)
      if (autoJoin !== undefined) update.auto_join = autoJoin === true
      if (autoJoinUntil !== undefined) update.auto_join_until = autoJoinUntil || null
      if (blackoutRanges !== undefined) {
        if (!Array.isArray(blackoutRanges)) return res.status(400).json({ error: 'blackoutRanges must be an array' })
        update.blackout_ranges = blackoutRanges
      }

      const { data, error } = await db
        .from('players')
        .update(update)
        .eq('id', id)
        .select('id, name, phone, year_of_birth, positions, skill_rating, skill_rating_updated_at, position_skills, avatar_url, auto_join, auto_join_until, blackout_ranges, terms_accepted_at')
        .single()
      if (error) throw error

      // Cascade name change to open/confirmed polls so team displays stay consistent
      if (update.name && update.name !== player.name) {
        const { data: polls } = await db
          .from('polls')
          .select('id, players, version')
          .in('status', ['open', 'confirmed'])
        if (polls) {
          for (const poll of polls) {
            const entries = poll.players || []
            if (!entries.some(p => p.playerId === id)) continue
            const updated = entries.map(p => p.playerId === id ? { ...p, name: update.name } : p)
            await db.from('polls')
              .update({ players: updated, version: poll.version + 1 })
              .eq('id', poll.id)
              .eq('version', poll.version)
          }
        }
      }

      return res.status(200).json(data)
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
