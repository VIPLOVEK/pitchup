import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import { Card, Label, Btn, Input, Toast } from '../components/UI'
import { colors, radius } from '../lib/tokens'
import { POSITIONS, SKILL_LABELS, DEFAULT_SKILL_RATING, SKILL_RATING_STALE_DAYS } from '../lib/positions'

const STORAGE_KEY = 'pitchup_player'

// Converts a base64url VAPID public key into the Uint8Array format
// required by PushManager.subscribe's applicationServerKey option.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

function NotificationsSection({ player, showToast }) {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return
    setSupported(true)

    navigator.serviceWorker.register('/sw.js')
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setSubscribed(!!sub))
      .catch(() => {})
  }, [])

  const enable = async () => {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        showToast('Notifications permission denied')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), playerId: player?.id || null }),
      })
      setSubscribed(true)
      showToast('Notifications enabled!')
    } catch (e) {
      showToast('Could not enable notifications')
    } finally {
      setLoading(false)
    }
  }

  const disable = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
      showToast('Notifications disabled')
    } catch (e) {
      showToast('Could not disable notifications')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  return (
    <Card>
      <Label>Notifications</Label>
      <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 12px' }}>
        Get a push notification when a game is confirmed, cancelled, or about to close for voting.
      </p>
      <Btn full variant={subscribed ? 'ghost' : 'primary'} onClick={subscribed ? disable : enable} disabled={loading}>
        {loading ? 'Please wait...' : subscribed ? 'Disable notifications' : 'Enable notifications'}
      </Btn>
    </Card>
  )
}

// Shared bottom-sheet PIN confirmation modal used across profile actions
function ProfilePinModal({ title, description, onConfirm, onCancel, loading }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')

  const submit = async () => {
    if (!/^\d{4,6}$/.test(pin)) { setErr('Enter your 4–6 digit PIN'); return }
    setErr('')
    await onConfirm(pin)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#0d1f38', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 480 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{title}</div>
        {description && <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 14px' }}>{description}</p>}
        <Input
          type="password"
          inputMode="numeric"
          placeholder="Your PIN (4–6 digits)"
          value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setErr('') }}
          autoFocus
          style={{ marginBottom: err ? 4 : 12 }}
        />
        {err && <p style={{ color: colors.danger, fontSize: 13, margin: '0 0 10px' }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" style={{ flex: 1 }} onClick={onCancel} disabled={loading}>Cancel</Btn>
          <Btn style={{ flex: 1 }} onClick={submit} disabled={loading || pin.length < 4}>
            {loading ? 'Saving…' : 'Confirm'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

function PositionPicker({ positions, onToggle }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
      {POSITIONS.map(pos => {
        const selected = positions.includes(pos)
        return (
          <button
            key={pos}
            type="button"
            onClick={() => onToggle(pos)}
            style={{
              background: selected ? colors.accent + '22' : colors.pitchMid,
              border: `1.5px solid ${selected ? colors.accent : colors.grass + '33'}`,
              color: selected ? colors.accent : colors.muted,
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {pos}
          </button>
        )
      })}
    </div>
  )
}

function SkillPicker({ rating, onChange, compact }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: compact ? 6 : 8, marginBottom: compact ? 0 : 8 }}>
      {Object.entries(SKILL_LABELS).map(([value, label]) => {
        const selected = rating === Number(value)
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(Number(value))}
            style={{
              background: selected ? colors.accent + '22' : colors.pitchMid,
              border: `1.5px solid ${selected ? colors.accent : colors.grass + '33'}`,
              color: selected ? colors.accent : colors.muted,
              borderRadius: 8,
              padding: compact ? '4px 8px' : '6px 12px',
              fontSize: compact ? 12 : 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {compact ? label : `${value} · ${label}`}
          </button>
        )
      })}
    </div>
  )
}

// One skill picker per position the player has selected. Players with no
// preferred positions ("Any") use a single overall skill picker instead.
function PositionSkillsEditor({ positions, positionSkills, skillRating, onPositionSkillChange, onSkillRatingChange }) {
  if (positions.length === 0) {
    return <SkillPicker rating={skillRating} onChange={onSkillRatingChange} />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
      {positions.map(pos => (
        <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: colors.muted, minWidth: 80 }}>{pos}</span>
          <SkillPicker
            rating={positionSkills[pos] || DEFAULT_SKILL_RATING}
            onChange={(value) => onPositionSkillChange(pos, value)}
            compact
          />
        </div>
      ))}
    </div>
  )
}

function AutoJoinSection({ player, showToast }) {
  const [autoJoin, setAutoJoin] = useState(player.auto_join || false)
  const [autoJoinUntil, setAutoJoinUntil] = useState(player.auto_join_until || '')
  const [blackoutRanges, setBlackoutRanges] = useState(player.blackout_ranges || [])
  const [newFrom, setNewFrom] = useState('')
  const [newTo, setNewTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)

  const dirty =
    autoJoin !== (player.auto_join || false) ||
    (autoJoinUntil || '') !== (player.auto_join_until || '') ||
    JSON.stringify(blackoutRanges) !== JSON.stringify(player.blackout_ranges || [])

  const addRange = () => {
    if (!newFrom || !newTo || newFrom > newTo) return
    setBlackoutRanges(rs => [...rs, { from: newFrom, to: newTo }])
    setNewFrom('')
    setNewTo('')
  }

  const removeRange = (i) => setBlackoutRanges(rs => rs.filter((_, idx) => idx !== i))

  const save = async (pin) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, autoJoin, autoJoinUntil: autoJoinUntil || null, blackoutRanges }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowPinModal(false)
      showToast('Auto-join settings saved!')
    } catch (e) {
      showToast(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <Label>Auto-join</Label>
      <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 12px' }}>
        Automatically added to games when they're confirmed. You'll get a push notification and can remove yourself if needed.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setAutoJoin(v => !v)}
          style={{
            width: 44, height: 24, borderRadius: 12,
            background: autoJoin ? colors.accent : colors.pitchMid,
            border: `1.5px solid ${autoJoin ? colors.accent : colors.grass + '44'}`,
            position: 'relative', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute', top: 2,
            left: autoJoin ? 22 : 2,
            width: 16, height: 16, borderRadius: 8, background: '#fff',
            transition: 'left 0.15s',
          }} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {autoJoin ? 'Auto-join enabled' : 'Auto-join disabled'}
        </span>
      </div>

      {autoJoin && (
        <>
          <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 6px' }}>
            Auto-join until <span style={{ fontWeight: 400 }}>(leave blank for indefinitely)</span>
          </p>
          <div style={{ marginBottom: 16 }}>
            <Input type="date" value={autoJoinUntil} onChange={e => setAutoJoinUntil(e.target.value)} />
          </div>

          <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 6px' }}>
            Blackout ranges <span style={{ fontWeight: 400 }}>(dates you're not available)</span>
          </p>
          {blackoutRanges.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: colors.grassLight, fontWeight: 600, flex: 1 }}>
                {r.from} → {r.to}
              </span>
              <button
                type="button"
                onClick={() => removeRange(i)}
                style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
              >
                ×
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <Input type="date" value={newFrom} onChange={e => setNewFrom(e.target.value)} placeholder="From" />
            </div>
            <span style={{ color: colors.muted, fontSize: 13, flexShrink: 0 }}>→</span>
            <div style={{ flex: 1, minWidth: 120 }}>
              <Input type="date" value={newTo} onChange={e => setNewTo(e.target.value)} placeholder="To" />
            </div>
            <Btn small variant="ghost" onClick={addRange} disabled={!newFrom || !newTo || newFrom > newTo}>
              + Add
            </Btn>
          </div>
        </>
      )}

      {dirty && (
        <Btn small variant="ghost" onClick={() => setShowPinModal(true)} disabled={saving} style={{ marginTop: 12 }}>
          Save auto-join settings
        </Btn>
      )}
      {showPinModal && (
        <ProfilePinModal
          title="Confirm your PIN"
          description="Enter your PIN to save auto-join settings."
          onConfirm={save}
          onCancel={() => setShowPinModal(false)}
          loading={saving}
        />
      )}
    </Card>
  )
}

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

function resizeToJpegBase64(file, maxPx = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      const b64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
      resolve(b64)
    }
    img.onerror = reject
    img.src = url
  })
}

function AvatarUpload({ player, onUpdate, showToast }) {
  const [uploading, setUploading] = useState(false)
  const [pendingBase64, setPendingBase64] = useState(null)
  const inputRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imageBase64 = await resizeToJpegBase64(file)
      setPendingBase64(imageBase64)
    } catch {
      showToast('Could not process image')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function uploadWithPin(pin) {
    setUploading(true)
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, pin, imageBase64: pendingBase64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onUpdate({ ...player, avatar_url: data.avatar_url })
      setPendingBase64(null)
      showToast('Photo updated!')
    } catch (err) {
      showToast(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const initials = player.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const hue = [...player.name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{ width: 64, height: 64, borderRadius: '50%', cursor: 'pointer', overflow: 'hidden', border: `2px solid ${colors.accent}44`, position: 'relative' }}
      >
        {player.avatar_url
          ? <img src={player.avatar_url} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: `hsl(${hue},40%,35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff' }}>{initials}</div>
        }
        {uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⏳</div>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 0, right: 0, background: colors.accent, borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, cursor: 'pointer', pointerEvents: 'none' }}>📷</div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      {pendingBase64 && (
        <ProfilePinModal
          title="Update photo?"
          description="Enter your PIN to confirm."
          onConfirm={uploadWithPin}
          onCancel={() => setPendingBase64(null)}
          loading={uploading}
        />
      )}
    </div>
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
  const [positions, setPositions] = useState([])
  const [skillRating, setSkillRating] = useState(DEFAULT_SKILL_RATING)
  const [positionSkills, setPositionSkills] = useState({})
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const togglePosition = (pos) => setPositions(ps => {
    if (ps.includes(pos)) {
      setPositionSkills(ps => { const next = { ...ps }; delete next[pos]; return next })
      return ps.filter(x => x !== pos)
    }
    setPositionSkills(ps => ({ ...ps, [pos]: DEFAULT_SKILL_RATING }))
    return [...ps, pos]
  })

  const setPositionSkill = (pos, value) => setPositionSkills(ps => ({ ...ps, [pos]: value }))

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

  // Edit-info state (name + phone)
  const [editingInfo, setEditingInfo] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editBirthYear, setEditBirthYear] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  // PIN modal state (used for saveProfile + saveInfo)
  const [pinModal, setPinModal] = useState(null) // null | 'saveProfile' | 'saveInfo'
  const [pinModalLoading, setPinModalLoading] = useState(false)

  // Change PIN state
  const [changingPin, setChangingPin] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinChangeError, setPinChangeError] = useState('')
  const [pinChangeSaving, setPinChangeSaving] = useState(false)

  useEffect(() => {
    if (player) {
      setPositions(player.positions || [])
      setSkillRating(player.skill_rating || DEFAULT_SKILL_RATING)
      setPositionSkills(player.position_skills || {})
      setEditName(player.name)
      setEditPhone(player.phone || '')
      setEditBirthYear(player.year_of_birth ? String(player.year_of_birth) : '')
    }
  }, [player])

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
        ? { name: name.trim(), phone: phone.trim(), positions, skillRating, positionSkills, pin }
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

  const handleSaveProfile = async (pin) => {
    setPinModalLoading(true)
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, positions, skillRating, positionSkills }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlayer(data)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      setPinModal(null)
      showToast('Profile updated!')
    } catch (e) {
      showToast(e.message)
    } finally {
      setPinModalLoading(false)
    }
  }

  const handleSaveInfo = async (pin) => {
    if (!editName.trim()) { showToast('Name cannot be empty'); return }
    setSavingInfo(true)
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, name: editName.trim(), phone: editPhone.trim(), yearOfBirth: editBirthYear ? parseInt(editBirthYear, 10) : null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const updated = { ...player, ...data }
      setPlayer(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setEditingInfo(false)
      setPinModal(null)
      showToast('Profile updated!')
    } catch (e) {
      showToast(e.message)
    } finally {
      setSavingInfo(false)
    }
  }

  const handleChangePin = async () => {
    if (!/^\d{4,6}$/.test(currentPin)) { setPinChangeError('Enter your current PIN (4–6 digits)'); return }
    if (!/^\d{4,6}$/.test(newPin)) { setPinChangeError('New PIN must be 4–6 digits'); return }
    if (newPin !== confirmPin) { setPinChangeError("New PINs don't match"); return }
    setPinChangeError('')
    setPinChangeSaving(true)
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentPin, newPin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setChangingPin(false)
      setCurrentPin(''); setNewPin(''); setConfirmPin('')
      showToast('PIN changed successfully!')
    } catch (e) {
      setPinChangeError(e.message)
    } finally {
      setPinChangeSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setPlayer(null)
    setName('')
    setPin('')
    setPositions([])
    setSkillRating(DEFAULT_SKILL_RATING)
    setPositionSkills({})
  }

  if (!loaded) return null

  if (player) {
    const positionsDirty = JSON.stringify([...positions].sort()) !== JSON.stringify([...(player.positions || [])].sort())
    const skillDirty = positions.length === 0
      ? skillRating !== (player.skill_rating || DEFAULT_SKILL_RATING)
      : JSON.stringify(positionSkills) !== JSON.stringify(player.position_skills || {})
    const profileDirty = positionsDirty || skillDirty
    const skillRatingStale = player.skill_rating_updated_at &&
      (Date.now() - new Date(player.skill_rating_updated_at).getTime()) / 86400000 > SKILL_RATING_STALE_DAYS
    return (
      <Layout title="My Profile — PitchUp">
        <Card>
          <Label>My profile</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: editingInfo ? 12 : 16 }}>
            <AvatarUpload player={player} onUpdate={updated => {
              setPlayer(updated)
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            }} showToast={showToast} />
            {editingInfo ? (
              <div style={{ flex: 1 }}>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Your name"
                  style={{ marginBottom: 8 }}
                />
                <Input
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="Phone number (optional)"
                  style={{ marginBottom: 8 }}
                />
                <Input
                  value={editBirthYear}
                  onChange={e => setEditBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Birth year (e.g. 1990)"
                  inputMode="numeric"
                />
              </div>
            ) : (
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                    {player.name}
                  </h1>
                  <button
                    type="button"
                    onClick={() => { setEditName(player.name); setEditPhone(player.phone || ''); setEditBirthYear(player.year_of_birth ? String(player.year_of_birth) : ''); setEditingInfo(true) }}
                    title="Edit name & phone"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.muted, fontSize: 14, padding: '2px 4px', lineHeight: 1 }}
                  >
                    ✏️
                  </button>
                </div>
                {player.phone && (
                  <p style={{ color: colors.muted, fontSize: 13, margin: '4px 0 0' }}>📱 {player.phone}</p>
                )}
                {player.year_of_birth && (
                  <p style={{ color: colors.muted, fontSize: 13, margin: '4px 0 0' }}>🎂 Born {player.year_of_birth}</p>
                )}
              </div>
            )}
          </div>
          {editingInfo && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <Btn small variant="primary" onClick={() => setPinModal('saveInfo')} disabled={savingInfo || !editName.trim()}>
                Save
              </Btn>
              <Btn small variant="ghost" onClick={() => setEditingInfo(false)} disabled={savingInfo}>
                Cancel
              </Btn>
            </div>
          )}
          <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>
            Preferred positions <span style={{ color: colors.muted, fontWeight: 400 }}>(pick as many as you like — leave blank for "Any")</span>
          </p>
          <PositionPicker positions={positions} onToggle={togglePosition} />
          <p style={{ color: colors.muted, fontSize: 13, margin: '12px 0 8px' }}>
            Skill level <span style={{ color: colors.muted, fontWeight: 400 }}>(used to balance teams — an admin can adjust this too)</span>
          </p>
          {skillRatingStale && (
            <p style={{ color: colors.accent, fontSize: 12, margin: '0 0 8px' }}>
              🔄 It's been a while since you updated this — still feels right?
            </p>
          )}
          <PositionSkillsEditor
            positions={positions}
            positionSkills={positionSkills}
            skillRating={skillRating}
            onPositionSkillChange={setPositionSkill}
            onSkillRatingChange={setSkillRating}
          />
          {profileDirty && (
            <Btn small variant="ghost" onClick={() => setPinModal('saveProfile')} style={{ marginTop: 8 }}>
              Save profile
            </Btn>
          )}

          {/* Change PIN */}
          {changingPin ? (
            <div style={{ marginTop: 16, padding: '14px', background: colors.pitchMid, borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Change PIN</div>
              <Input
                type="password"
                inputMode="numeric"
                placeholder="Current PIN"
                value={currentPin}
                onChange={e => { setCurrentPin(e.target.value.replace(/\D/g, '')); setPinChangeError('') }}
              />
              <Input
                type="password"
                inputMode="numeric"
                placeholder="New PIN (4–6 digits)"
                value={newPin}
                onChange={e => { setNewPin(e.target.value.replace(/\D/g, '')); setPinChangeError('') }}
              />
              <Input
                type="password"
                inputMode="numeric"
                placeholder="Confirm new PIN"
                value={confirmPin}
                onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '')); setPinChangeError('') }}
              />
              {pinChangeError && <p style={{ color: colors.danger, fontSize: 13, margin: '-6px 0 10px' }}>{pinChangeError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn small onClick={handleChangePin} disabled={pinChangeSaving}>
                  {pinChangeSaving ? 'Saving…' : 'Change PIN'}
                </Btn>
                <Btn small variant="ghost" onClick={() => { setChangingPin(false); setCurrentPin(''); setNewPin(''); setConfirmPin(''); setPinChangeError('') }}>
                  Cancel
                </Btn>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setChangingPin(true)}
              style={{ background: 'none', border: 'none', color: colors.muted, fontSize: 13, cursor: 'pointer', padding: '10px 0 0', textDecoration: 'underline', display: 'block' }}
            >
              Change PIN
            </button>
          )}

          <Btn full variant="ghost" onClick={handleLogout} style={{ marginTop: 12 }}>
            Log out
          </Btn>
        </Card>
        {pinModal === 'saveProfile' && (
          <ProfilePinModal
            title="Save profile"
            description="Enter your PIN to update positions and skill level."
            onConfirm={handleSaveProfile}
            onCancel={() => setPinModal(null)}
            loading={pinModalLoading}
          />
        )}
        {pinModal === 'saveInfo' && (
          <ProfilePinModal
            title="Save changes"
            description="Enter your PIN to update your name or phone number."
            onConfirm={handleSaveInfo}
            onCancel={() => setPinModal(null)}
            loading={savingInfo}
          />
        )}
        <NotificationsSection player={player} showToast={showToast} />
        <AutoJoinSection player={player} showToast={showToast} />
        <GroupsSection player={player} showToast={showToast} />
        <Toast msg={toast} />
      </Layout>
    )
  }

  return (
    <Layout title="My Profile — PitchUp">
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
            <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>
              Preferred positions <span style={{ color: colors.muted, fontWeight: 400 }}>(pick as many as you like — leave blank for "Any")</span>
            </p>
            <div style={{ marginBottom: 12 }}>
              <PositionPicker positions={positions} onToggle={togglePosition} />
            </div>
            <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>
              Skill level <span style={{ color: colors.muted, fontWeight: 400 }}>(used to balance teams — an admin can adjust this too)</span>
            </p>
            <div style={{ marginBottom: 12 }}>
              <PositionSkillsEditor
                positions={positions}
                positionSkills={positionSkills}
                skillRating={skillRating}
                onPositionSkillChange={setPositionSkill}
                onSkillRatingChange={setSkillRating}
              />
            </div>
          </>
        )}

        <Input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="4-6 digit PIN" type="password" />

        {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 10 }}>{error}</p>}

        <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 14px' }}>
          {mode === 'create'
            ? 'Your profile lets you join without retyping your name, and tracks your preferred position for team balancing.'
            : "Log in with the name and PIN you used when creating your profile. If an admin reset your PIN, just enter your name and a new 4-6 digit PIN to set it."}
        </p>

        <Btn full onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...' : mode === 'create' ? 'Create profile' : 'Log in'}
        </Btn>
      </Card>
      <NotificationsSection player={null} showToast={showToast} />
      <Toast msg={toast} />
    </Layout>
  )
}
