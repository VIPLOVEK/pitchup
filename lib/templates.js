export function validateTemplate(body) {
  const { title, location, weekday, slotOffsets, minPlayers, maxPlayers, visibility, groupIds, leadDays } = body

  if (!title || !location) return 'Title and location are required'
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return 'Invalid weekday'
  if (!Array.isArray(slotOffsets) || slotOffsets.length === 0) return 'At least one time slot is required'
  for (const s of slotOffsets) {
    if (!Number.isInteger(s.dayOffset) || s.dayOffset < 0) return 'Invalid slot day offset'
    if (!Number.isInteger(s.hour) || s.hour < 0 || s.hour > 23) return 'Invalid slot hour'
    if (!Number.isInteger(s.minute) || s.minute < 0 || s.minute > 59) return 'Invalid slot minute'
  }
  if (!Number.isInteger(minPlayers) || !Number.isInteger(maxPlayers) || minPlayers < 2 || maxPlayers < minPlayers) {
    return 'Max players must be greater than or equal to min players'
  }
  if (!Number.isInteger(leadDays) || leadDays < 1 || leadDays > 13) return 'Lead days must be between 1 and 13'
  if (visibility === 'groups' && (!Array.isArray(groupIds) || groupIds.length === 0)) {
    return 'Select at least one group'
  }
  return null
}
