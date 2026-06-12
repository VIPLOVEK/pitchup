// GET  /api/admin/groups — list groups with members (admin only)
// POST /api/admin/groups — create a new group (admin only)
import { supabaseAdmin, isSupabaseConfigured } from '../../../lib/supabase'

function isAdmin(req) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`
}

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (!isSupabaseConfigured()) return res.status(200).json([])

  const db = supabaseAdmin()

  if (req.method === 'GET') {
    try {
      const { data: groups, error } = await db.from('groups').select('id, name, color, logo_url, created_at').order('name')
      if (error) throw error

      const { data: members, error: memErr } = await db
        .from('group_members')
        .select('group_id, status, players(id, name)')
      if (memErr) throw memErr

      const membersByGroup = {}
      for (const m of members) {
        if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = []
        membersByGroup[m.group_id].push({ id: m.players.id, name: m.players.name, status: m.status })
      }

      return res.status(200).json(groups.map(g => ({ ...g, members: membersByGroup[g.id] || [] })))
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'POST') {
    const { name, color } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required' })

    try {
      const { data, error } = await db
        .from('groups')
        .insert({ name: name.trim(), ...(color ? { color } : {}) })
        .select('id, name, color, logo_url, created_at')
        .single()
      if (error) throw error
      return res.status(201).json({ ...data, members: [] })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).end()
}
