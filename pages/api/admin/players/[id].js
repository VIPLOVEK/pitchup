// PATCH  /api/admin/players/[id] — admin actions: resetPin, setSkillRating, setPositionSkill
// DELETE /api/admin/players/[id] — delete a player profile
import { supabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase'
import { POSITIONS, deriveSkillRating } from '../../../../lib/positions'
import { hashPin } from '../../../../lib/players'

function isAdmin(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`
}

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Database not configured yet.' })

  const { id } = req.query
  const db = supabaseAdmin()

  if (req.method === 'PATCH') {
    const { action } = req.body

    if (action === 'resetPin') {
      try {
        // Clear the PIN rather than issuing a new one — the admin never learns
        // the player's PIN. The player picks a new one the next time they log in.
        const { data, error } = await db
          .from('players')
          .update({ pin_hash: null })
          .eq('id', id)
          .select('id, name')
          .single()
        if (error) throw error
        if (!data) return res.status(404).json({ error: 'Player not found' })

        return res.status(200).json({ id: data.id, name: data.name })
      } catch (e) {
        return res.status(500).json({ error: e.message })
      }
    }

    if (action === 'setSkillRating') {
      const { skillRating } = req.body
      if (!Number.isInteger(skillRating) || skillRating < 1 || skillRating > 5) {
        return res.status(400).json({ error: 'Skill rating must be between 1 and 5' })
      }

      try {
        const { data, error } = await db
          .from('players')
          .update({ skill_rating: skillRating })
          .eq('id', id)
          .select('id, name, skill_rating')
          .single()
        if (error) throw error
        if (!data) return res.status(404).json({ error: 'Player not found' })

        return res.status(200).json(data)
      } catch (e) {
        return res.status(500).json({ error: e.message })
      }
    }

    if (action === 'setPositionSkill') {
      const { position, skillRating } = req.body
      if (!POSITIONS.includes(position)) return res.status(400).json({ error: 'Invalid position' })
      if (!Number.isInteger(skillRating) || skillRating < 1 || skillRating > 5) {
        return res.status(400).json({ error: 'Skill rating must be between 1 and 5' })
      }

      try {
        const { data: player, error: fetchErr } = await db.from('players').select('position_skills').eq('id', id).maybeSingle()
        if (fetchErr) throw fetchErr
        if (!player) return res.status(404).json({ error: 'Player not found' })

        const positionSkills = { ...(player.position_skills || {}), [position]: skillRating }
        const { data, error } = await db
          .from('players')
          .update({ position_skills: positionSkills, skill_rating: deriveSkillRating(positionSkills) })
          .eq('id', id)
          .select('id, name, skill_rating, position_skills')
          .single()
        if (error) throw error

        return res.status(200).json(data)
      } catch (e) {
        return res.status(500).json({ error: e.message })
      }
    }

    if (action === 'setPositions') {
      const { positions } = req.body
      if (!Array.isArray(positions) || positions.some(p => !POSITIONS.includes(p))) {
        return res.status(400).json({ error: 'Invalid positions' })
      }
      try {
        const { data: player, error: fetchErr } = await db.from('players').select('position_skills').eq('id', id).maybeSingle()
        if (fetchErr) throw fetchErr
        if (!player) return res.status(404).json({ error: 'Player not found' })

        // Drop skill entries for removed positions
        const oldSkills = player.position_skills || {}
        const positionSkills = Object.fromEntries(positions.map(pos => [pos, oldSkills[pos] || 3]))
        const { data, error } = await db
          .from('players')
          .update({ positions, position_skills: positionSkills, skill_rating: positions.length ? deriveSkillRating(positionSkills) : (player.skill_rating || 3) })
          .eq('id', id)
          .select('id, name, positions, skill_rating, position_skills')
          .single()
        if (error) throw error
        return res.status(200).json(data)
      } catch (e) {
        return res.status(500).json({ error: e.message })
      }
    }

    if (action === 'updateProfile') {
      const { name, phone, yearOfBirth, autoJoinUntil, blackoutRanges } = req.body
      if (name !== undefined && !name?.trim()) return res.status(400).json({ error: 'Name cannot be empty' })
      if (name !== undefined && name.trim().length > 60) return res.status(400).json({ error: 'Name is too long' })
      if (yearOfBirth !== undefined && yearOfBirth !== null) {
        const y = parseInt(yearOfBirth, 10)
        if (isNaN(y) || y < 1940 || y > new Date().getFullYear() - 10) return res.status(400).json({ error: 'Invalid birth year' })
      }
      if (blackoutRanges !== undefined && !Array.isArray(blackoutRanges)) {
        return res.status(400).json({ error: 'blackoutRanges must be an array' })
      }

      try {
        const { data: player, error: fetchErr } = await db.from('players').select('*').eq('id', id).maybeSingle()
        if (fetchErr) throw fetchErr
        if (!player) return res.status(404).json({ error: 'Player not found' })

        const update = {}
        if (name !== undefined) update.name = name.trim()
        if (phone !== undefined) update.phone = phone?.trim() || null
        if (yearOfBirth !== undefined) update.year_of_birth = yearOfBirth ? parseInt(yearOfBirth, 10) : null
        if (autoJoinUntil !== undefined) update.auto_join_until = autoJoinUntil || null
        if (blackoutRanges !== undefined) update.blackout_ranges = blackoutRanges

        const { data, error } = await db
          .from('players')
          .update(update)
          .eq('id', id)
          .select('id, name, phone, year_of_birth, positions, skill_rating, position_skills, avatar_url, auto_join, auto_join_until, blackout_ranges')
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
              const updatedEntries = entries.map(p => p.playerId === id ? { ...p, name: update.name } : p)
              await db.from('polls')
                .update({ players: updatedEntries, version: poll.version + 1 })
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

    if (action === 'setPin') {
      const { newPin } = req.body
      if (!/^\d{4,6}$/.test(newPin || '')) return res.status(400).json({ error: 'PIN must be 4-6 digits' })
      try {
        const { data, error } = await db
          .from('players')
          .update({ pin_hash: hashPin(newPin) })
          .eq('id', id)
          .select('id, name')
          .single()
        if (error) throw error
        if (!data) return res.status(404).json({ error: 'Player not found' })
        return res.status(200).json({ id: data.id, name: data.name })
      } catch (e) {
        return res.status(500).json({ error: e.message })
      }
    }

    if (action === 'clearAvatar') {
      try {
        const { data, error } = await db
          .from('players')
          .update({ avatar_url: null })
          .eq('id', id)
          .select('id, name, avatar_url')
          .single()
        if (error) throw error
        if (!data) return res.status(404).json({ error: 'Player not found' })
        return res.status(200).json(data)
      } catch (e) {
        return res.status(500).json({ error: e.message })
      }
    }

    if (action === 'setOpposeGroup') {
      const { groupId } = req.body
      try {
        const { data, error } = await db
          .from('players')
          .update({ oppose_group_id: groupId || null })
          .eq('id', id)
          .select('id, name, oppose_group_id')
          .single()
        if (error) throw error
        if (!data) return res.status(404).json({ error: 'Player not found' })
        return res.status(200).json(data)
      } catch (e) {
        return res.status(500).json({ error: e.message })
      }
    }

    if (action === 'setAutoJoin') {
      const { autoJoin } = req.body
      try {
        const { data, error } = await db
          .from('players')
          // Admin override bypasses the player's own PIN — used to turn
          // auto-join off for someone (e.g. they're away) without needing
          // their PIN, or to confirm it's on.
          .update({ auto_join: autoJoin === true })
          .eq('id', id)
          .select('id, name, auto_join, auto_join_until')
          .single()
        if (error) throw error
        if (!data) return res.status(404).json({ error: 'Player not found' })
        return res.status(200).json(data)
      } catch (e) {
        return res.status(500).json({ error: e.message })
      }
    }

    return res.status(400).json({ error: 'Unknown action' })
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await db.from('players').delete().eq('id', id)
      if (error) throw error
      return res.status(204).end()
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
