import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { Card, Label, Btn, Input, Select, Toast } from '../components/UI'
import { colors, radius } from '../lib/tokens'
import { POSITIONS } from '../lib/positions'

const STORAGE_KEY = 'pitchup_player'

function GroupsSection({ player, showToast }) {
  const [groups, setGroups] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/groups?playerId=${player.id}`)
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to load groups')))
      .then(setGroups)
      .catch(e => setError(e.message))
  }, [player.id])

  const requestJoin = async (groupId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGroups(gs => gs.map(g => g.id === groupId ? { ...g, status: data.status } : g))
      showToast('Request sent — an admin will approve it soon.')
    } catch (e) {
      showToast(e.message)
    }
  }

  if (error) return null
  if (groups === null) return null
  if (groups.length === 0) return null

  return (
    <Card>
      <Label>Groups</Label>
      {groups.map(g => (
        <div
          key={g.id}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0', borderBottom: `1px solid ${colors.grass}22`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {g.logo_url ? (
              <img src={g.logo_url} alt="" style={{ width: 20, height: 20, borderRadius: radius.full, objectFit: 'cover' }} />
            ) : (
              <span style={{ width: 10, height: 10, borderRadius: radius.full, background: g.color || colors.grassLight, flexShrink: 0 }} />
            )}
            <div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div>
          </div>
          {g.status === 'approved' && <span style={{ color: colors.grassLight, fontSize: 12, fontWeight: 700 }}>✓ Member</span>}
          {g.status === 'pending' && <span style={{ color: colors.muted, fontSize: 12, fontWeight: 700 }}>⏳ Pending</span>}
          {!g.status && (
            <Btn small variant="ghost" onClick={() => requestJoin(g.id)}>Request to join</Btn>
          )}
        </div>
      ))}
    </Card>
  )
}

export default function ProfilePage() {
  const [player, setPlayer] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [mode, setMode] = useState('create') // 'create' | 'login'
  const [toast, setToast] = useState('')

  // Create/login form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('Any')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) { setLoaded(true); return }
    const { id } = JSON.parse(saved)
    fetch(`/api/players/${id}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setPlayer(data)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      })
      .catch(() => localStorage.removeItem(STORAGE_KEY))
      .finally(() => setLoaded(true))
  }, [])

  const handleSubmit = async () => {
    if (!name.trim() || !/^\d{4,6}$/.test(pin)) {
      setError('Enter your name and a 4-6 digit PIN')
      return
    }
    setLoading(true)
    setError('')
    try {
      const url = mode === 'create' ? '/api/players' : '/api/players/login'
      const body = mode === 'create'
        ? { name: name.trim(), phone: phone.trim(), position, pin }
        : { name: name.trim(), pin }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setPlayer(data)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      showToast(mode === 'create' ? 'Profile created!' : 'Welcome back!')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePosition = async (newPosition) => {
    const enteredPin = window.prompt('Enter your PIN to update your position:')
    if (!enteredPin) return
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: enteredPin, position: newPosition }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlayer(data)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      showToast('Position updated!')
    } catch (e) {
      showToast(e.message)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setPlayer(null)
    setName('')
    setPin('')
  }

  if (!loaded) return null

  if (player) {
    return (
      <Layout title="My Profile — Aldie FC">
        <Card>
          <Label>My profile</Label>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            {player.name}
          </h1>
          {player.phone && (
            <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 4px' }}>📱 {player.phone}</p>
          )}
          <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 12px' }}>Preferred position:</p>
          <Select value={player.position} onChange={e => handleUpdatePosition(e.target.value)}>
            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Btn full variant="ghost" onClick={handleLogout} style={{ marginTop: 8 }}>
            Log out
          </Btn>
        </Card>
        <GroupsSection player={player} showToast={showToast} />
        <Toast msg={toast} />
      </Layout>
    )
  }

  return (
    <Layout title="My Profile — Aldie FC">
      <Card>
        <Label>My profile</Label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['create', 'login'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              style={{
                background: mode === m ? colors.accent : 'transparent',
                color: mode === m ? colors.pitch : colors.muted,
                border: mode === m ? 'none' : `1px solid ${colors.grass}44`,
                borderRadius: 6,
                padding: '6px 14px',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {m === 'create' ? 'Create profile' : 'Log in'}
            </button>
          ))}
        </div>

        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />

        {mode === 'create' && (
          <>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number (optional)" />
            <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>Preferred position:</p>
            <Select value={position} onChange={e => setPosition(e.target.value)}>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </>
        )}

        <Input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="4-6 digit PIN" type="password" />

        {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 10 }}>{error}</p>}

        <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 14px' }}>
          {mode === 'create'
            ? 'Your profile lets you vote without retyping your name, and tracks your preferred position for team balancing.'
            : "Log in with the name and PIN you used when creating your profile. If an admin reset your PIN, just enter your name and a new 4-6 digit PIN to set it."}
        </p>

        <Btn full onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...' : mode === 'create' ? 'Create profile' : 'Log in'}
        </Btn>
      </Card>
    </Layout>
  )
}
