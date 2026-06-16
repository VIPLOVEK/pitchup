import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import { Card, Label, ProgressBar, Btn, Input, Pill, PlayerChip, Toast, CopyBtn, Spinner } from '../components/UI'
import { colors, radius, groupColorPalette } from '../lib/tokens'
import { getActivePlayers, getWaitlist } from '../lib/teams'
import { LOCATIONS } from '../lib/locations'
import { SKILL_LABELS, DEFAULT_SKILL_RATING, POSITIONS } from '../lib/positions'

const selectStyle = {
  width: '100%',
  background: colors.pitchMid,
  border: `1px solid ${colors.grass}44`,
  borderRadius: radius.md,
  color: colors.white,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  marginBottom: 10,
}

const skillSelectStyle = {
  background: colors.pitchMid,
  border: `1.5px solid ${colors.grass}33`,
  color: colors.muted,
  borderRadius: 8,
  padding: '5px 8px',
  fontSize: 13,
  fontWeight: 600,
}

function CreatePollForm({ onCreated, groups }) {
  const [title, setTitle] = useState('Weekend Pickup ⚽')
  const [location, setLocation] = useState(LOCATIONS[0].name)
  const [customLocation, setCustomLocation] = useState('')
  const [slots, setSlots] = useState(['', ''])
  const [minPlayers, setMinPlayers] = useState(8)
  const [maxPlayers, setMaxPlayers] = useState(18)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visibility, setVisibility] = useState('all')
  const [selectedGroupIds, setSelectedGroupIds] = useState([])

  const toggleGroup = (id) => setSelectedGroupIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])

  const updateSlot = (i, value) => setSlots(s => s.map((v, idx) => idx === i ? value : v))
  const addSlot = () => setSlots(s => [...s, ''])
  const removeSlot = (i) => setSlots(s => s.filter((_, idx) => idx !== i))

  const handleCreate = async () => {
    const filledSlots = slots.filter(Boolean)
    const finalLocation = location === 'Other' ? customLocation.trim() : location
    if (!title || !finalLocation || filledSlots.length === 0 || !password) {
      setError('Fill in all fields including admin password')
      return
    }
    if (minPlayers < 2 || maxPlayers < minPlayers) {
      setError('Max players must be greater than or equal to min players')
      return
    }
    if (visibility === 'groups' && selectedGroupIds.length === 0) {
      setError('Select at least one group')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({
          title,
          location: finalLocation,
          slots: filledSlots.map(s => new Date(s).toISOString()),
          minPlayers,
          maxPlayers,
          visibility,
          groupIds: selectedGroupIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onCreated(data, password)
      setSlots(['', ''])
      setTitle('Weekend Pickup ⚽')
      setCustomLocation('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <Label>Create a poll</Label>
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Game title" />

      <select value={location} onChange={e => setLocation(e.target.value)} style={selectStyle}>
        {LOCATIONS.map(l => (
          <option key={l.name} value={l.name}>{l.name} ({l.boot} boots)</option>
        ))}
        <option value="Other">Other...</option>
      </select>
      {location === 'Other' && (
        <Input value={customLocation} onChange={e => setCustomLocation(e.target.value)} placeholder="Location / field name" />
      )}

      <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>Proposed time slots:</p>
      {slots.map((slot, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input
            type="datetime-local"
            value={slot}
            onChange={e => updateSlot(i, e.target.value)}
            style={{ flex: 1 }}
          />
          {slots.length > 1 && (
            <button
              onClick={() => removeSlot(i)}
              style={{ background: 'none', border: 'none', color: colors.muted, fontSize: 18, cursor: 'pointer', padding: '0 4px 10px' }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <div style={{ marginBottom: 14 }}>
        <Btn small variant="ghost" onClick={addSlot}>+ Add another time</Btn>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>Min players</p>
          <Input type="number" value={minPlayers} onChange={e => setMinPlayers(Number(e.target.value))} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>Max players</p>
          <Input type="number" value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} />
        </div>
      </div>

      <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>Who can join?</p>
      <select value={visibility} onChange={e => setVisibility(e.target.value)} style={selectStyle}>
        <option value="all">Everyone</option>
        <option value="groups">Specific group(s)</option>
      </select>
      {visibility === 'groups' && (
        <div style={{ marginBottom: 14 }}>
          {groups.length === 0 && (
            <p style={{ color: colors.muted, fontSize: 12 }}>No groups yet — create one in the Groups tab first.</p>
          )}
          {groups.map(g => (
            <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.white, padding: '4px 0', cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedGroupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} />
              <span style={{ width: 10, height: 10, borderRadius: radius.full, background: g.color || colors.grassLight, flexShrink: 0 }} />
              {g.name}
            </label>
          ))}
        </div>
      )}

      <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="Admin password" type="password" />
      {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 10 }}>{error}</p>}
      <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 14px' }}>
        Voting stays open until all {maxPlayers} spots are filled (instant confirm) or until 1.5 hours before kickoff — whichever comes first. If fewer than {minPlayers} players have joined by the 1.5-hour mark, the game is cancelled. Anyone beyond {maxPlayers} goes on the waiting list and is auto-promoted if a spot opens up.
      </p>
      <Btn full onClick={handleCreate} disabled={loading}>
        {loading ? 'Creating...' : 'Create poll & get link'}
      </Btn>
    </Card>
  )
}

function PollCard({ poll, password, onAction, appUrl, groups }) {
  const [loading, setLoading] = useState(false)
  const [scoreA, setScoreA] = useState(poll.score_a ?? '')
  const [scoreB, setScoreB] = useState(poll.score_b ?? '')
  const [editingAudience, setEditingAudience] = useState(false)
  const [audienceVisibility, setAudienceVisibility] = useState(poll.visibility)
  const [audienceGroupIds, setAudienceGroupIds] = useState(poll.group_ids)
  const [editingDetails, setEditingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [editTitle, setEditTitle] = useState(poll.title)
  const [editLocation, setEditLocation] = useState(poll.location)
  const [editMinPlayers, setEditMinPlayers] = useState(poll.min_players)
  const [editMaxPlayers, setEditMaxPlayers] = useState(poll.max_players)
  const [editSlots, setEditSlots] = useState(poll.slots.map(toLocalInputValue))
  const isOpen = poll.status === 'open'
  const isConfirmed = poll.status === 'confirmed'
  const isCancelled = poll.status === 'cancelled'
  const shareUrl = `${appUrl}/poll/${poll.id}`
  const active = getActivePlayers(poll)
  const waitlist = getWaitlist(poll)

  const doAction = async (action, method = 'PATCH', extra = {}) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/${poll.id}`, {
        method,
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${password}` },
        ...(method === 'PATCH' ? { body: JSON.stringify({ action, ...extra }) } : {}),
      })
      if (!res.ok) throw new Error('Action failed')
      const data = method === 'DELETE' ? null : await res.json()
      onAction(poll.id, data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const statusLabel = isConfirmed ? 'Confirmed ✅' : isCancelled ? 'Cancelled ❌' : 'Open 🟢'
  const statusColor = isConfirmed ? colors.cardGreen : isCancelled ? colors.cardRed : colors.cardYellow
  const pollGroups = poll.visibility === 'groups' ? poll.group_ids.map(id => groups.find(g => g.id === id)).filter(Boolean) : []

  return (
    <Card highlight={isConfirmed} style={pollGroups.length > 0 ? { borderLeft: `4px solid ${pollGroups[0].color || colors.grassLight}` } : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <Label>{statusLabel}</Label>
          <Link href={`/poll/${poll.id}`} target="_blank" style={{ textDecoration: 'none' }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 2, color: colors.white }}>
              {poll.title} {(isConfirmed || isCancelled) && <span style={{ color: colors.accent, fontSize: 12, fontWeight: 600 }}>↗ View</span>}
            </div>
          </Link>
          <div style={{ color: colors.muted, fontSize: 12 }}>{poll.location}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <Pill color={statusColor}>
            {poll.players.length}/{poll.max_players}
          </Pill>
          {pollGroups.length > 0 && (
            <Pill color={pollGroups[0].color || colors.muted}>
              🔒 {pollGroups.map(g => g.name).join(', ')}
            </Pill>
          )}
        </div>
      </div>

      <ProgressBar value={active.length} max={poll.min_players} />
      <div style={{ color: colors.muted, fontSize: 12, margin: '4px 0 8px' }}>
        {active.length} confirmed (need {poll.min_players}+) · {poll.max_players} max
        {waitlist.length > 0 ? ` · ${waitlist.length} waiting` : ''}
      </div>

      {isCancelled && (
        <p style={{ color: colors.danger, fontSize: 13, margin: '0 0 8px' }}>
          Not enough players joined by the cutoff — game was cancelled.
        </p>
      )}

      {/* Active players */}
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap' }}>
        {active.map((p, i) => (
          <PlayerChip
            key={i}
            name={p.name}
            onRemove={isOpen ? () => doAction('removePlayer', 'PATCH', { name: p.name }) : undefined}
          />
        ))}
        {poll.players.length === 0 && (
          <span style={{ color: colors.muted, fontSize: 13 }}>No players yet.</span>
        )}
      </div>

      {/* Waiting list */}
      {waitlist.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.muted, marginBottom: 6 }}>
            Waiting list
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {waitlist.map((p, i) => (
              <PlayerChip
                key={i}
                name={p.name}
                color={colors.cardYellow}
                onRemove={isOpen ? () => doAction('removePlayer', 'PATCH', { name: p.name }) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {isConfirmed && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.muted, marginBottom: 6 }}>
            Result
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input
              type="number"
              value={scoreA}
              onChange={e => setScoreA(e.target.value)}
              placeholder="A"
              style={{ width: 60, textAlign: 'center', marginBottom: 0 }}
            />
            <span style={{ color: colors.muted, fontSize: 13 }}>🟦 vs 🟥</span>
            <Input
              type="number"
              value={scoreB}
              onChange={e => setScoreB(e.target.value)}
              placeholder="B"
              style={{ width: 60, textAlign: 'center', marginBottom: 0 }}
            />
            <Btn
              small
              variant="ghost"
              onClick={() => doAction('setScore', 'PATCH', { scoreA: Number(scoreA), scoreB: Number(scoreB) })}
              disabled={loading || scoreA === '' || scoreB === ''}
            >
              Save
            </Btn>
          </div>
        </div>
      )}

      {/* Audience editor */}
      {isOpen && editingAudience && (
        <div style={{ marginTop: 12, background: colors.pitchMid, borderRadius: 8, padding: 12 }}>
          <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 8px' }}>Who can join?</p>
          <select
            value={audienceVisibility}
            onChange={e => setAudienceVisibility(e.target.value)}
            style={selectStyle}
          >
            <option value="all">Everyone</option>
            <option value="groups">Specific group(s)</option>
          </select>
          {audienceVisibility === 'groups' && (
            <div style={{ marginBottom: 10 }}>
              {groups.length === 0 && (
                <p style={{ color: colors.muted, fontSize: 12 }}>No groups yet — create one in the Groups tab first.</p>
              )}
              {groups.map(g => (
                <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.white, padding: '4px 0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={audienceGroupIds.includes(g.id)}
                    onChange={() => setAudienceGroupIds(ids => ids.includes(g.id) ? ids.filter(x => x !== g.id) : [...ids, g.id])}
                  />
                  <span style={{ width: 10, height: 10, borderRadius: radius.full, background: g.color || colors.grassLight, flexShrink: 0 }} />
                  {g.name}
                </label>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn
              small
              onClick={async () => {
                await doAction('setAudience', 'PATCH', { visibility: audienceVisibility, groupIds: audienceGroupIds })
                setEditingAudience(false)
              }}
              disabled={loading || (audienceVisibility === 'groups' && audienceGroupIds.length === 0)}
            >
              Save
            </Btn>
            <Btn small variant="ghost" onClick={() => setEditingAudience(false)} disabled={loading}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {/* Details editor */}
      {isOpen && editingDetails && (
        <div style={{ marginTop: 12, background: colors.pitchMid, borderRadius: 8, padding: 12 }}>
          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Game title" />

          <select value={LOCATIONS.some(l => l.name === editLocation) ? editLocation : 'Other'} onChange={e => setEditLocation(e.target.value === 'Other' ? '' : e.target.value)} style={selectStyle}>
            {LOCATIONS.map(l => (
              <option key={l.name} value={l.name}>{l.name} ({l.boot} boots)</option>
            ))}
            <option value="Other">Other...</option>
          </select>
          {!LOCATIONS.some(l => l.name === editLocation) && (
            <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="Location / field name" />
          )}

          <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 8px' }}>Time slots:</p>
          {editSlots.map((slot, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input
                type="datetime-local"
                value={slot}
                onChange={e => setEditSlots(s => s.map((v, idx) => idx === i ? e.target.value : v))}
                style={{ flex: 1 }}
              />
              {editSlots.length > 1 && (
                <button
                  onClick={() => setEditSlots(s => s.filter((_, idx) => idx !== i))}
                  style={{ background: 'none', border: 'none', color: colors.muted, fontSize: 18, cursor: 'pointer', padding: '0 4px 10px' }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <div style={{ marginBottom: 10 }}>
            <Btn small variant="ghost" onClick={() => setEditSlots(s => [...s, ''])}>+ Add another time</Btn>
          </div>
          {poll.players.length > 0 && (
            <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 10px' }}>
              Existing votes are kept. If you remove a time slot, any votes for it are dropped — players keep their other votes.
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>Min players</p>
              <Input type="number" value={editMinPlayers} onChange={e => setEditMinPlayers(Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>Max players</p>
              <Input type="number" value={editMaxPlayers} onChange={e => setEditMaxPlayers(Number(e.target.value))} />
            </div>
          </div>

          {detailsError && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 10 }}>{detailsError}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <Btn
              small
              onClick={async () => {
                const filledSlots = editSlots.filter(Boolean)
                if (!editTitle || !editLocation || filledSlots.length === 0) {
                  setDetailsError('Fill in all fields')
                  return
                }
                if (editMinPlayers < 2 || editMaxPlayers < editMinPlayers) {
                  setDetailsError('Max players must be greater than or equal to min players')
                  return
                }
                setDetailsError('')
                await doAction('updateDetails', 'PATCH', {
                  title: editTitle,
                  location: editLocation,
                  slots: filledSlots.map(s => new Date(s).toISOString()),
                  minPlayers: editMinPlayers,
                  maxPlayers: editMaxPlayers,
                })
                setEditingDetails(false)
              }}
              disabled={loading}
            >
              Save
            </Btn>
            <Btn small variant="ghost" onClick={() => setEditingDetails(false)} disabled={loading}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {isOpen && (
          <Btn small variant="ghost" onClick={() => doAction('close')} disabled={loading}>
            ✅ Confirm game now
          </Btn>
        )}
        {isOpen && !editingDetails && (
          <Btn
            small
            variant="ghost"
            onClick={() => {
              setEditTitle(poll.title)
              setEditLocation(poll.location)
              setEditMinPlayers(poll.min_players)
              setEditMaxPlayers(poll.max_players)
              setEditSlots(poll.slots.map(toLocalInputValue))
              setDetailsError('')
              setEditingDetails(true)
            }}
            disabled={loading}
          >
            ✏️ Edit details
          </Btn>
        )}
        {isOpen && !editingAudience && (
          <Btn
            small
            variant="ghost"
            onClick={() => {
              setAudienceVisibility(poll.visibility)
              setAudienceGroupIds(poll.group_ids)
              setEditingAudience(true)
            }}
            disabled={loading}
          >
            🔒 Edit audience
          </Btn>
        )}
        {isConfirmed && (
          <Btn small variant="ghost" onClick={() => doAction('shuffle')} disabled={loading}>
            🔀 Reshuffle teams
          </Btn>
        )}
        <Btn small variant="danger" onClick={() => doAction(null, 'DELETE')} disabled={loading}>
          Delete
        </Btn>
      </div>

      {/* Share link */}
      <div style={{
        marginTop: 14,
        background: colors.pitchMid,
        borderRadius: 8,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <span style={{ fontSize: 12, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🔗 {shareUrl}
        </span>
        <CopyBtn text={shareUrl} label="Copy link" />
      </div>
    </Card>
  )
}

function RosterTab({ password, showToast }) {
  const [players, setPlayers] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/players', { headers: { authorization: `Bearer ${password}` } })
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to load roster')))
      .then(setPlayers)
      .catch(e => setError(e.message))
  }, [password])

  const resetPin = async (player) => {
    if (!window.confirm(`Reset ${player.name}'s PIN? They'll be able to set a new PIN next time they log in with their name.`)) return
    try {
      const res = await fetch(`/api/admin/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${password}` },
        body: JSON.stringify({ action: 'resetPin' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(`${player.name}'s PIN was reset — tell them to log in with their name and a new PIN.`)
    } catch (e) {
      showToast(e.message)
    }
  }

  const deletePlayer = async (player) => {
    if (!window.confirm(`Delete ${player.name}'s profile? This removes their saved profile and group memberships. This can't be undone.`)) return
    try {
      const res = await fetch(`/api/admin/players/${player.id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${password}` },
      })
      if (!res.ok) throw new Error('Failed to delete player')
      setPlayers(ps => ps.filter(p => p.id !== player.id))
      showToast('Player deleted.')
    } catch (e) {
      showToast(e.message)
    }
  }

  const setSkillRating = async (player, skillRating) => {
    try {
      const res = await fetch(`/api/admin/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${password}` },
        body: JSON.stringify({ action: 'setSkillRating', skillRating }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlayers(ps => ps.map(p => p.id === player.id ? { ...p, skill_rating: data.skill_rating } : p))
    } catch (e) {
      showToast(e.message)
    }
  }

  const setPositionSkill = async (player, position, skillRating) => {
    try {
      const res = await fetch(`/api/admin/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${password}` },
        body: JSON.stringify({ action: 'setPositionSkill', position, skillRating }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlayers(ps => ps.map(p => p.id === player.id ? { ...p, skill_rating: data.skill_rating, position_skills: data.position_skills } : p))
    } catch (e) {
      showToast(e.message)
    }
  }

  if (error) return <Card><p style={{ color: colors.danger, fontSize: 13 }}>{error}</p></Card>
  if (players === null) return <Card><Spinner label="Loading roster..." /></Card>

  if (players.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', color: colors.muted, padding: '20px 0', fontSize: 14 }}>
          No players have signed up yet. Share the <Link href="/profile" style={{ color: colors.accent }}>profile link</Link> with the group.
        </div>
      </Card>
    )
  }

  const sorted = [...players].sort((a, b) => b.gamesPlayed - a.gamesPlayed)

  return (
    <Card>
      <Label>{players.length} player{players.length === 1 ? '' : 's'}</Label>
      {sorted.map(p => (
        <div
          key={p.id}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            flexWrap: 'wrap', padding: '10px 0', borderBottom: `1px solid ${colors.grass}22`, gap: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
            {p.phone && <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>📱 {p.phone}</div>}
            <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
              ⚽ {p.gamesPlayed} game{p.gamesPlayed === 1 ? '' : 's'} played
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {p.positions?.length
              ? p.positions.map(pos => (
                <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Pill color={colors.grassLight}>{pos}</Pill>
                  <select
                    value={p.position_skills?.[pos] || DEFAULT_SKILL_RATING}
                    onChange={e => setPositionSkill(p, pos, Number(e.target.value))}
                    style={skillSelectStyle}
                  >
                    {Object.entries(SKILL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{value} · {label}</option>
                    ))}
                  </select>
                </div>
              ))
              : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Pill color={colors.grassLight}>Any</Pill>
                  <select
                    value={p.skill_rating || DEFAULT_SKILL_RATING}
                    onChange={e => setSkillRating(p, Number(e.target.value))}
                    style={skillSelectStyle}
                  >
                    {Object.entries(SKILL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{value} · {label}</option>
                    ))}
                  </select>
                </div>
              )}
            <Btn small variant="ghost" onClick={() => resetPin(p)}>Reset PIN</Btn>
            <Btn small variant="danger" onClick={() => deletePlayer(p)}>Delete</Btn>
          </div>
        </div>
      ))}
    </Card>
  )
}

function GroupsTab({ password, showToast, onGroupsChanged }) {
  const [groups, setGroups] = useState(null)
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [addPlayerSelections, setAddPlayerSelections] = useState({})
  const fileInputRefs = useRef({})

  const load = () => {
    fetch('/api/admin/groups', { headers: { authorization: `Bearer ${password}` } })
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to load groups')))
      .then(setGroups)
      .catch(e => setError(e.message))
  }

  useEffect(() => {
    load()
    fetch('/api/admin/players', { headers: { authorization: `Bearer ${password}` } })
      .then(res => res.ok ? res.json() : [])
      .then(setPlayers)
      .catch(() => {})
  }, [password])

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    try {
      const color = groupColorPalette[groups.length % groupColorPalette.length]
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${password}` },
        body: JSON.stringify({ name: newGroupName.trim(), color }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGroups(gs => [...gs, data])
      setNewGroupName('')
      onGroupsChanged?.()
    } catch (e) {
      showToast(e.message)
    }
  }

  const updateColor = async (groupId, color) => {
    setGroups(gs => gs.map(g => g.id === groupId ? { ...g, color } : g))
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${password}` },
        body: JSON.stringify({ action: 'updateSettings', color }),
      })
      if (!res.ok) throw new Error('Failed to update color')
      onGroupsChanged?.()
    } catch (e) {
      showToast(e.message)
    }
  }

  const uploadLogo = async (groupId, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await fetch(`/api/admin/groups/${groupId}/logo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', authorization: `Bearer ${password}` },
          body: JSON.stringify({ image: reader.result }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setGroups(gs => gs.map(g => g.id === groupId ? { ...g, logo_url: data.logo_url } : g))
        onGroupsChanged?.()
      } catch (e) {
        showToast(e.message)
      }
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = async (groupId) => {
    try {
      const res = await fetch(`/api/admin/groups/${groupId}/logo`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${password}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGroups(gs => gs.map(g => g.id === groupId ? { ...g, logo_url: null } : g))
      onGroupsChanged?.()
    } catch (e) {
      showToast(e.message)
    }
  }

  const deleteGroup = async (id) => {
    try {
      const res = await fetch(`/api/admin/groups/${id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${password}` },
      })
      if (!res.ok) throw new Error('Failed to delete group')
      setGroups(gs => gs.filter(g => g.id !== id))
      onGroupsChanged?.()
    } catch (e) {
      showToast(e.message)
    }
  }

  const memberAction = async (groupId, action, playerId) => {
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${password}` },
        body: JSON.stringify({ action, playerId }),
      })
      if (!res.ok) throw new Error('Action failed')
      load()
    } catch (e) {
      showToast(e.message)
    }
  }

  if (error) return <Card><p style={{ color: colors.danger, fontSize: 13 }}>{error}</p></Card>
  if (groups === null) return <Card><Spinner label="Loading groups..." /></Card>

  return (
    <div>
      <Card>
        <Label>New group</Label>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name" style={{ marginBottom: 0 }} />
          <Btn small onClick={createGroup} disabled={!newGroupName.trim()}>Create</Btn>
        </div>
      </Card>

      {groups.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', color: colors.muted, padding: '20px 0', fontSize: 14 }}>
            No groups yet. Create one above.
          </div>
        </Card>
      )}

      {groups.map(g => {
        const approved = g.members.filter(m => m.status === 'approved')
        const pending = g.members.filter(m => m.status === 'pending')
        const memberIds = new Set(g.members.map(m => m.id))
        const addablePlayers = players.filter(p => !memberIds.has(p.id))

        return (
          <Card key={g.id} style={{ borderLeft: `4px solid ${g.color || colors.grassLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {g.logo_url ? (
                  <img src={g.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: radius.full, objectFit: 'cover', border: `1px solid ${g.color || colors.grassLight}66` }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: radius.full, background: g.color || colors.grassLight, flexShrink: 0 }} />
                )}
                <Label>{g.name}</Label>
              </div>
              <Btn small variant="danger" onClick={() => deleteGroup(g.id)}>Delete</Btn>
            </div>

            {/* Theme settings */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.muted, marginBottom: 6 }}>
                Theme color
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {groupColorPalette.map(c => (
                  <button
                    key={c}
                    onClick={() => updateColor(g.id, c)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: radius.full,
                      background: c,
                      border: (g.color || colors.grassLight).toLowerCase() === c.toLowerCase() ? `2px solid ${colors.white}` : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.muted, marginBottom: 6 }}>
                Logo
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  ref={el => { fileInputRefs.current[g.id] = el }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={e => uploadLogo(g.id, e.target.files?.[0])}
                  style={{ display: 'none' }}
                />
                <Btn small variant="ghost" onClick={() => fileInputRefs.current[g.id]?.click()}>Upload logo</Btn>
                {g.logo_url && <Btn small variant="danger" onClick={() => removeLogo(g.id)}>Remove logo</Btn>}
              </div>
            </div>

            {pending.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.muted, marginBottom: 6 }}>
                  Pending requests
                </div>
                {pending.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                    <span style={{ fontSize: 14 }}>{m.name}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn small variant="ghost" onClick={() => memberAction(g.id, 'approve', m.id)}>Approve</Btn>
                      <Btn small variant="danger" onClick={() => memberAction(g.id, 'reject', m.id)}>Reject</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.muted, marginBottom: 6 }}>
              Members ({approved.length})
            </div>
            {approved.length === 0 && <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>No members yet.</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {approved.map(m => (
                <PlayerChip key={m.id} name={m.name} onRemove={() => memberAction(g.id, 'removeMember', m.id)} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <select
                value={addPlayerSelections[g.id] || ''}
                onChange={e => setAddPlayerSelections(s => ({ ...s, [g.id]: e.target.value }))}
                style={{ ...selectStyle, marginBottom: 0, flex: 1 }}
              >
                <option value="">Add a player...</option>
                {addablePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Btn
                small
                onClick={() => {
                  const playerId = addPlayerSelections[g.id]
                  if (!playerId) return
                  memberAction(g.id, 'addMember', playerId)
                  setAddPlayerSelections(s => ({ ...s, [g.id]: '' }))
                }}
                disabled={!addPlayerSelections[g.id]}
              >
                Add
              </Btn>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

const FEEDBACK_STATUSES = ['open', 'planned', 'in_progress', 'done', 'declined']
const FEEDBACK_STATUS_LABELS = {
  open: 'Open',
  planned: 'Planned',
  in_progress: 'In progress',
  done: 'Done',
  declined: 'Declined',
}

function FeedbackTab({ password, showToast }) {
  const [requests, setRequests] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/feature-requests')
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to load suggestions')))
      .then(setRequests)
      .catch(e => setError(e.message))
  }, [])

  const setStatus = async (id, status) => {
    setRequests(rs => rs.map(r => r.id === id ? { ...r, status } : r))
    try {
      const res = await fetch(`/api/admin/feature-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${password}` },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
    } catch (e) {
      showToast(e.message)
    }
  }

  const deleteRequest = async (id) => {
    if (!confirm('Delete this suggestion?')) return
    try {
      const res = await fetch(`/api/admin/feature-requests/${id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${password}` },
      })
      if (!res.ok) throw new Error('Failed to delete')
      setRequests(rs => rs.filter(r => r.id !== id))
    } catch (e) {
      showToast(e.message)
    }
  }

  if (error) return <Card><p style={{ color: colors.danger, fontSize: 13 }}>{error}</p></Card>
  if (requests === null) return <Card><Spinner label="Loading suggestions..." /></Card>

  if (requests.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', color: colors.muted, padding: '20px 0', fontSize: 14 }}>
          No suggestions yet. Share the <Link href="/feedback" style={{ color: colors.accent }}>suggestion box link</Link> with the group.
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <Label>{requests.length} suggestion{requests.length === 1 ? '' : 's'}</Label>
      {requests.map(r => (
        <div
          key={r.id}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            flexWrap: 'wrap', padding: '10px 0', borderBottom: `1px solid ${colors.grass}22`, gap: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</div>
            {r.description && <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{r.description}</div>}
            <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
              ▲ {r.upvotes?.length || 0} upvote{r.upvotes?.length === 1 ? '' : 's'}
              {r.author_name && <> · {r.author_name}</>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <select
              value={r.status}
              onChange={e => setStatus(r.id, e.target.value)}
              style={skillSelectStyle}
            >
              {FEEDBACK_STATUSES.map(s => (
                <option key={s} value={s}>{FEEDBACK_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <Btn small variant="danger" onClick={() => deleteRequest(r.id)}>Delete</Btn>
          </div>
        </div>
      ))}
    </Card>
  )
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function pad2(n) { return String(n).padStart(2, '0') }

// Converts an ISO datetime string to the "YYYY-MM-DDTHH:mm" format
// expected by <input type="datetime-local"> in the local timezone.
function toLocalInputValue(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function RecurringTab({ password, groups, showToast }) {
  const [templates, setTemplates] = useState(null)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('Weekend Pickup ⚽')
  const [location, setLocation] = useState(LOCATIONS[0].name)
  const [customLocation, setCustomLocation] = useState('')
  const [weekday, setWeekday] = useState(6) // Saturday
  const [slotOffsets, setSlotOffsets] = useState([{ dayOffset: 0, time: '18:00' }])
  const [minPlayers, setMinPlayers] = useState(8)
  const [maxPlayers, setMaxPlayers] = useState(18)
  const [leadDays, setLeadDays] = useState(6)
  const [visibility, setVisibility] = useState('all')
  const [selectedGroupIds, setSelectedGroupIds] = useState([])
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const toggleGroup = (id) => setSelectedGroupIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])

  const updateSlot = (i, field, value) => setSlotOffsets(s => s.map((slot, idx) => idx === i ? { ...slot, [field]: value } : slot))
  const addSlot = () => setSlotOffsets(s => [...s, { dayOffset: 0, time: '18:00' }])
  const removeSlot = (i) => setSlotOffsets(s => s.filter((_, idx) => idx !== i))

  const resetForm = () => {
    setEditingId(null)
    setTitle('Weekend Pickup ⚽')
    setLocation(LOCATIONS[0].name)
    setCustomLocation('')
    setWeekday(6)
    setSlotOffsets([{ dayOffset: 0, time: '18:00' }])
    setMinPlayers(8)
    setMaxPlayers(18)
    setLeadDays(6)
    setVisibility('all')
    setSelectedGroupIds([])
  }

  const startEdit = (t) => {
    setEditingId(t.id)
    setTitle(t.title)
    const known = LOCATIONS.some(l => l.name === t.location)
    setLocation(known ? t.location : 'Other')
    setCustomLocation(known ? '' : t.location)
    setWeekday(t.weekday)
    setSlotOffsets(t.slot_offsets.map(s => ({ dayOffset: s.dayOffset, time: `${pad2(s.hour)}:${pad2(s.minute)}` })))
    setMinPlayers(t.min_players)
    setMaxPlayers(t.max_players)
    setLeadDays(t.lead_days)
    setVisibility(t.visibility)
    setSelectedGroupIds(t.group_ids || [])
  }

  const load = () => {
    fetch('/api/admin/templates', { headers: { authorization: `Bearer ${password}` } })
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to load recurring polls')))
      .then(setTemplates)
      .catch(e => setError(e.message))
  }

  useEffect(() => { load() }, [password])

  const submit = async () => {
    const finalLocation = location === 'Other' ? customLocation.trim() : location
    if (!title || !finalLocation) {
      showToast('Fill in a title and location')
      return
    }
    if (visibility === 'groups' && selectedGroupIds.length === 0) {
      showToast('Select at least one group')
      return
    }
    setCreating(true)
    try {
      const body = {
        title,
        location: finalLocation,
        weekday,
        slotOffsets: slotOffsets.map(s => {
          const [hour, minute] = s.time.split(':').map(Number)
          return { dayOffset: Number(s.dayOffset), hour, minute }
        }),
        minPlayers,
        maxPlayers,
        visibility,
        groupIds: selectedGroupIds,
        leadDays,
      }

      const res = await fetch(editingId ? `/api/admin/templates/${editingId}` : '/api/admin/templates', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${password}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (editingId) {
        setTemplates(ts => ts.map(t => t.id === editingId ? data : t))
        showToast('Recurring poll updated!')
        resetForm()
      } else {
        setTemplates(ts => [...ts, data])
        showToast('Recurring poll created!')
      }
    } catch (e) {
      showToast(e.message)
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (template) => {
    setTemplates(ts => ts.map(t => t.id === template.id ? { ...t, active: !t.active } : t))
    try {
      const res = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${password}` },
        body: JSON.stringify({ active: !template.active }),
      })
      if (!res.ok) throw new Error('Failed to update')
    } catch (e) {
      showToast(e.message)
      load()
    }
  }

  const deleteTemplate = async (id) => {
    if (!window.confirm('Delete this recurring poll? Future games will no longer be created automatically.')) return
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${password}` },
      })
      if (!res.ok) throw new Error('Failed to delete')
      setTemplates(ts => ts.filter(t => t.id !== id))
      if (editingId === id) resetForm()
    } catch (e) {
      showToast(e.message)
    }
  }

  return (
    <div>
      <Card>
        <Label>{editingId ? 'Edit recurring poll' : 'Recurring poll'}</Label>
        <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 12px' }}>
          Automatically creates a new poll every week, {leadDays} day{leadDays === 1 ? '' : 's'} before game day.
        </p>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Game title" />

        <select value={location} onChange={e => setLocation(e.target.value)} style={selectStyle}>
          {LOCATIONS.map(l => (
            <option key={l.name} value={l.name}>{l.name} ({l.boot} boots)</option>
          ))}
          <option value="Other">Other...</option>
        </select>
        {location === 'Other' && (
          <Input value={customLocation} onChange={e => setCustomLocation(e.target.value)} placeholder="Location / field name" />
        )}

        <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>Day of the game:</p>
        <select value={weekday} onChange={e => setWeekday(Number(e.target.value))} style={selectStyle}>
          {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
        </select>

        <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>Proposed time slots:</p>
        {slotOffsets.map((slot, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={slot.dayOffset}
              onChange={e => updateSlot(i, 'dayOffset', e.target.value)}
              style={{ ...selectStyle, flex: 1 }}
            >
              <option value={0}>{WEEKDAYS[weekday]}</option>
              <option value={1}>{WEEKDAYS[(weekday + 1) % 7]} (+1 day)</option>
              <option value={2}>{WEEKDAYS[(weekday + 2) % 7]} (+2 days)</option>
            </select>
            <Input
              type="time"
              value={slot.time}
              onChange={e => updateSlot(i, 'time', e.target.value)}
              style={{ flex: 1 }}
            />
            {slotOffsets.length > 1 && (
              <button
                onClick={() => removeSlot(i)}
                style={{ background: 'none', border: 'none', color: colors.muted, fontSize: 18, cursor: 'pointer', padding: '0 4px 10px' }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <div style={{ marginBottom: 14 }}>
          <Btn small variant="ghost" onClick={addSlot}>+ Add another time</Btn>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>Min players</p>
            <Input type="number" value={minPlayers} onChange={e => setMinPlayers(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>Max players</p>
            <Input type="number" value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>Lead days</p>
            <Input type="number" value={leadDays} onChange={e => setLeadDays(Number(e.target.value))} min={1} max={13} />
          </div>
        </div>

        <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>Who can join?</p>
        <select value={visibility} onChange={e => setVisibility(e.target.value)} style={selectStyle}>
          <option value="all">Everyone</option>
          <option value="groups">Specific group(s)</option>
        </select>
        {visibility === 'groups' && (
          <div style={{ marginBottom: 14 }}>
            {groups.length === 0 && (
              <p style={{ color: colors.muted, fontSize: 12 }}>No groups yet — create one in the Groups tab first.</p>
            )}
            {groups.map(g => (
              <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.white, padding: '4px 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedGroupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} />
                <span style={{ width: 10, height: 10, borderRadius: radius.full, background: g.color || colors.grassLight, flexShrink: 0 }} />
                {g.name}
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Btn full onClick={submit} disabled={creating}>
            {creating ? 'Saving...' : editingId ? 'Save changes' : 'Create recurring poll'}
          </Btn>
          {editingId && (
            <Btn variant="ghost" onClick={resetForm}>Cancel</Btn>
          )}
        </div>
      </Card>

      {error && <Card><p style={{ color: colors.danger, fontSize: 13 }}>{error}</p></Card>}
      {templates === null && !error && <Card><Spinner /></Card>}

      {templates && templates.map(t => {
        const templateGroups = t.visibility === 'groups' ? t.group_ids.map(id => groups.find(g => g.id === id)).filter(Boolean) : []
        return (
          <Card key={t.id} style={!t.active ? { opacity: 0.6 } : {}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{t.title}</div>
                <div style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>{t.location}</div>
                <div style={{ color: colors.muted, fontSize: 13 }}>
                  Every {WEEKDAYS[t.weekday]} ·{' '}
                  {t.slot_offsets.map((s, i) => (
                    <span key={i}>
                      {WEEKDAYS[(t.weekday + s.dayOffset) % 7]} {pad2(s.hour % 12 === 0 ? 12 : s.hour % 12)}:{pad2(s.minute)} {s.hour < 12 ? 'AM' : 'PM'}
                      {i < t.slot_offsets.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
                <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                  {t.min_players}-{t.max_players} players · opens {t.lead_days} day{t.lead_days === 1 ? '' : 's'} before
                  {templateGroups.length > 0 && <> · {templateGroups.map(g => g.name).join(', ')}</>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <Pill color={t.active ? colors.cardGreen : colors.muted}>{t.active ? 'Active' : 'Paused'}</Pill>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn small variant="ghost" onClick={() => startEdit(t)}>Edit</Btn>
                  <Btn small variant="ghost" onClick={() => toggleActive(t)}>{t.active ? 'Pause' : 'Resume'}</Btn>
                  <Btn small variant="danger" onClick={() => deleteTemplate(t.id)}>Delete</Btn>
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export default function AdminPage() {
  const [polls, setPolls] = useState([])
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState('create')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const [authErr, setAuthErr] = useState('')
  const [groups, setGroups] = useState([])

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadGroups = () => {
    fetch('/api/groups').then(res => res.ok ? res.json() : []).then(setGroups).catch(() => {})
  }

  useEffect(() => {
    loadGroups()
  }, [])

  const login = async () => {
    setLoading(true)
    setAuthErr('')
    try {
      const res = await fetch('/api/admin/polls', {
        headers: { authorization: `Bearer ${password}` },
      })
      if (!res.ok) throw new Error('Wrong password')
      const data = await res.json()
      setPolls(data)
      setAuthed(true)
    } catch (e) {
      setAuthErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreated = (poll, pwd) => {
    setPolls(prev => [poll, ...prev])
    setPassword(pwd)
    setAuthed(true)
    setTab('manage')
    if (poll.visibility === 'groups') {
      const names = poll.group_ids.map(id => groups.find(g => g.id === id)?.name || '?').join(', ')
      showToast(`Poll created! Restricted to ${names} — share the link with them directly.`)
    } else {
      showToast('Poll created! Share the link.')
    }
  }

  const handleAction = (id, updated) => {
    if (!updated) {
      setPolls(prev => prev.filter(p => p.id !== id))
      showToast('Poll deleted.')
    } else {
      setPolls(prev => prev.map(p => p.id === id ? updated : p))
      showToast('Done!')
    }
  }

  // Login gate
  if (!authed) {
    return (
      <Layout title="Admin — PitchUp">
        <Card>
          <Label>Admin access</Label>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>Enter your password</h2>
          <Input
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Admin password"
            type="password"
          />
          {authErr && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 10 }}>{authErr}</p>}
          <Btn full onClick={login} disabled={loading || !password}>
            {loading ? 'Checking...' : 'Sign in'}
          </Btn>

          {/* Also allow creating without being signed in */}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              onClick={() => setAuthed(true)}
              style={{ background: 'none', border: 'none', color: colors.muted, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Skip login — just create a poll
            </button>
          </div>
        </Card>
        <Toast msg={toast} />
      </Layout>
    )
  }

  return (
    <Layout title="Admin — PitchUp">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['create', 'manage', 'recurring', 'roster', 'groups', 'feedback'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? colors.accent : 'transparent',
              color: tab === t ? colors.pitch : colors.muted,
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {t === 'create' ? '➕ New Poll' : t === 'manage' ? `📋 Manage (${polls.length})` : t === 'recurring' ? '🔁 Recurring' : t === 'roster' ? '👥 Roster' : t === 'groups' ? '🏷️ Groups' : '💡 Feedback'}
          </button>
        ))}
      </div>

      {tab === 'create' && <CreatePollForm onCreated={handleCreated} groups={groups} />}

      {tab === 'recurring' && <RecurringTab password={password} groups={groups} showToast={showToast} />}

      {tab === 'roster' && <RosterTab password={password} showToast={showToast} />}

      {tab === 'groups' && <GroupsTab password={password} showToast={showToast} onGroupsChanged={loadGroups} />}

      {tab === 'feedback' && <FeedbackTab password={password} showToast={showToast} />}

      {tab === 'manage' && (
        <div>
          {polls.length === 0 && (
            <Card>
              <div style={{ textAlign: 'center', color: colors.muted, padding: '20px 0', fontSize: 14 }}>
                No polls yet. Create one first!
              </div>
            </Card>
          )}
          {polls.map(poll => (
            <PollCard
              key={poll.id}
              poll={poll}
              password={password}
              onAction={handleAction}
              appUrl={appUrl}
              groups={groups}
            />
          ))}
        </div>
      )}

      <Toast msg={toast} />
    </Layout>
  )
}
