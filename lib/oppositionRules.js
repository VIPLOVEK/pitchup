// Builds the "opposition rules" consumed by applyGroupOpposition() —
// looks up which active players have oppose_group_id set, and resolves
// each target group's approved membership list. Server-side only (needs db).
export async function buildOppositionRules(db, activePlayers) {
  const ids = (activePlayers || []).map(p => p.playerId).filter(Boolean)
  if (ids.length === 0) return []

  const { data: pinned, error } = await db
    .from('players')
    .select('id, name, oppose_group_id')
    .in('id', ids)
    .not('oppose_group_id', 'is', null)
  if (error) throw error
  if (!pinned || pinned.length === 0) return []

  const groupIds = [...new Set(pinned.map(p => p.oppose_group_id))]
  const { data: members, error: memErr } = await db
    .from('group_members')
    .select('group_id, players(name)')
    .in('group_id', groupIds)
    .eq('status', 'approved')
  if (memErr) throw memErr

  const membersByGroup = {}
  for (const m of members || []) {
    if (!m.players?.name) continue
    const set = membersByGroup[m.group_id] || (membersByGroup[m.group_id] = new Set())
    set.add(m.players.name.toLowerCase())
  }

  return pinned.map(p => ({
    playerName: p.name,
    // A pinned player never counts toward their own "opposing" group
    // majority, even if they happen to also be a member of it.
    groupMemberNames: new Set([...(membersByGroup[p.oppose_group_id] || [])].filter(n => n !== p.name.toLowerCase())),
  }))
}
