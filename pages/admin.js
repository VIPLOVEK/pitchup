import { useState } from 'react'
import Layout from '../components/Layout'
import { Card, Label, ProgressBar, Btn, Input, Pill, PlayerChip, Toast, CopyBtn } from '../components/UI'
import { colors } from '../lib/tokens'

const THRESHOLD_OPTIONS = [6, 8, 10, 12, 14]

function CreatePollForm({ onCreated }) {
  const [title, setTitle] = useState('Weekend Pickup ⚽')
  const [location, setLocation] = useState('')
  const [slotsRaw, setSlotsRaw] = useState('Sat 6PM, Sat 8PM, Sun 10AM')
  const [threshold, setThreshold] = useState(10)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    const slots = slotsRaw.split(',').map(s => s.trim()).filter(Boolean)
    if (!title || !location || slots.length === 0 || !password) {
      setError('Fill in all fields including admin password')
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
        body: JSON.stringify({ title, location, slots, threshold }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onCreated(data, password)
      setSlotsRaw('')
      setTitle('Weekend Pickup ⚽')
      setLocation('')
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
      <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location / field name" />
      <Input
        value={slotsRaw}
        onChange={e => setSlotsRaw(e.target.value)}
        placeholder="Time slots, comma-separated: Sat 6PM, Sun 10AM"
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ color: colors.muted, fontSize: 13 }}>Players needed:</span>
        {THRESHOLD_OPTIONS.map(n => (
          <button
            key={n}
            onClick={() => setThreshold(n)}
            style={{
              background: threshold === n ? colors.accent : 'transparent',
              color: threshold === n ? colors.pitch : colors.muted,
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="Admin password" type="password" />
      {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 10 }}>{error}</p>}
      <Btn full onClick={handleCreate} disabled={loading}>
        {loading ? 'Creating...' : 'Create poll & get link'}
      </Btn>
    </Card>
  )
}

function PollCard({ poll, password, onAction, appUrl }) {
  const [loading, setLoading] = useState(false)
  const isClosed = poll.closed || poll.players.length >= poll.threshold
  const shareUrl = `${appUrl}/poll/${poll.id}`

  const doAction = async (action, method = 'PATCH') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/${poll.id}`, {
        method,
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${password}` },
        ...(method === 'PATCH' ? { body: JSON.stringify({ action }) } : {}),
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

  return (
    <Card highlight={isClosed}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <Label>{isClosed ? 'Confirmed ✅' : 'Active 🟢'}</Label>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}>{poll.title}</div>
          <div style={{ color: colors.muted, fontSize: 12 }}>{poll.location}</div>
        </div>
        <Pill color={isClosed ? colors.accent : colors.grassLight}>
          {poll.players.length}/{poll.threshold}
        </Pill>
      </div>

      <ProgressBar value={poll.players.length} max={poll.threshold} />

      {/* Player list */}
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap' }}>
        {poll.players.map((p, i) => (
          <PlayerChip
            key={i}
            name={p.name}
            onRemove={!isClosed ? async () => {
              // Remove via a simple workaround: re-fetch & patch players
              // In a real app this would be its own endpoint
              const updated = { ...poll, players: poll.players.filter((_, idx) => idx !== i) }
              onAction(poll.id, updated)
            } : undefined}
          />
        ))}
        {poll.players.length === 0 && (
          <span style={{ color: colors.muted, fontSize: 13 }}>No players yet.</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {!isClosed && (
          <Btn small variant="ghost" onClick={() => doAction('close')} disabled={loading}>
            ✅ Confirm game
          </Btn>
        )}
        {isClosed && (
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
