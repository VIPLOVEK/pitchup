import { useState } from 'react'
import Layout from '../components/Layout'
import { Card, Label, ProgressBar, Btn, Input, Pill, PlayerChip, Toast, CopyBtn } from '../components/UI'
import { colors, radius } from '../lib/tokens'
import { getActivePlayers, getWaitlist } from '../lib/teams'
import { LOCATIONS } from '../lib/locations'

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

function CreatePollForm({ onCreated }) {
  const [title, setTitle] = useState('Weekend Pickup ⚽')
  const [location, setLocation] = useState(LOCATIONS[0].name)
  const [customLocation, setCustomLocation] = useState('')
  const [slots, setSlots] = useState(['', ''])
  const [minPlayers, setMinPlayers] = useState(8)
  const [maxPlayers, setMaxPlayers] = useState(18)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="Admin password" type="password" />
      {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 10 }}>{error}</p>}
      <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 14px' }}>
        Voting closes automatically 4 hours before the earliest time slot. If fewer than {minPlayers} players have joined by then, the game is cancelled. The first {maxPlayers} players get a spot — anyone after that goes on the waiting list and is auto-promoted if a spot opens up.
      </p>
      <Btn full onClick={handleCreate} disabled={loading}>
        {loading ? 'Creating...' : 'Create poll & get link'}
      </Btn>
    </Card>
  )
}

function PollCard({ poll, password, onAction, appUrl }) {
  const [loading, setLoading] = useState(false)
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
  const statusColor = isConfirmed ? colors.accent : isCancelled ? colors.danger : colors.grassLight

  return (
    <Card highlight={isConfirmed}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <Label>{statusLabel}</Label>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}>{poll.title}</div>
          <div style={{ color: colors.muted, fontSize: 12 }}>{poll.location}</div>
        </div>
        <Pill color={statusColor}>
          {poll.players.length}/{poll.max_players}
        </Pill>
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
                color={colors.muted}
                onRemove={isOpen ? () => doAction('removePlayer', 'PATCH', { name: p.name }) : undefined}
              />
            ))}
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

export default function AdminPage() {
  const [polls, setPolls] = useState([])
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState('create')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const [authErr, setAuthErr] = useState('')

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

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
    showToast('Poll created! Share the link.')
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
      <Layout title="Admin — Aldie FC">
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
    <Layout title="Admin — Aldie FC">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['create', 'manage'].map(t => (
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
            {t === 'create' ? '➕ New Poll' : `📋 Manage (${polls.length})`}
          </button>
        ))}
      </div>

      {tab === 'create' && <CreatePollForm onCreated={handleCreated} />}

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
            />
          ))}
        </div>
      )}

      <Toast msg={toast} />
    </Layout>
  )
}
