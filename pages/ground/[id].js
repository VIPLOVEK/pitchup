import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getActivePlayers, getWaitlist, getTentativePlayers, getTotalSpots, formatSlot } from '../../lib/teams'
import { supabaseAdmin, isSupabaseConfigured } from '../../lib/supabase'
import { colors } from '../../lib/tokens'

export async function getServerSideProps({ params }) {
  if (!isSupabaseConfigured()) return { props: { poll: null } }
  const db = supabaseAdmin()
  const { data, error } = await db.from('polls').select('*').eq('id', params.id).single()
  if (error || !data || data.status !== 'confirmed') return { notFound: true }
  return { props: { poll: data } }
}

function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [message, onDone])
  if (!message) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: colors.pitchCard, border: `1px solid ${colors.grass}44`,
      color: colors.white, borderRadius: 10, padding: '10px 20px', fontSize: 14,
      fontWeight: 600, zIndex: 999, maxWidth: 340, textAlign: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      {message}
    </div>
  )
}

export default function GroundPage({ poll: initialPoll }) {
  const [poll, setPoll] = useState(initialPoll)
  const [password, setPassword] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('pitchup_admin') || '{}')
      if (stored.password) setPassword(stored.password)
    } catch {}
  }, [])

  const showToast = (msg) => setToast(msg)

  const savePassword = () => {
    const pw = passwordInput.trim()
    if (!pw) return
    localStorage.setItem('pitchup_admin', JSON.stringify({ password: pw }))
    setPassword(pw)
  }

  const refetchPoll = async () => {
    try {
      const res = await fetch(`/api/poll/${poll.id}`)
      if (res.ok) {
        const data = await res.json()
        setPoll(data)
      }
    } catch (e) {
      console.error('Refetch failed:', e.message)
    }
  }

  const doAction = async (body) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/${poll.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${password}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      setPoll(data)
    } catch (e) {
      showToast(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!poll) {
    return (
      <div style={{ minHeight: '100vh', background: colors.pitch, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ color: colors.muted, fontSize: 14 }}>Poll not found or not confirmed.</div>
      </div>
    )
  }

  if (!password) {
    return (
      <div style={{ minHeight: '100vh', background: colors.pitch, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: colors.white, marginBottom: 8, textAlign: 'center' }}>📍 Ground Mode</div>
          <div style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>Enter admin password to continue</div>
          <input
            type="password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && savePassword()}
            placeholder="Admin password"
            style={{
              width: '100%', background: colors.pitchMid, border: `1px solid ${colors.grass}44`,
              borderRadius: 10, color: colors.white, padding: '14px 16px', fontSize: 16,
              outline: 'none', boxSizing: 'border-box', marginBottom: 12,
            }}
          />
          <button
            onClick={savePassword}
            style={{
              width: '100%', background: colors.grass, color: '#fff', border: 'none',
              borderRadius: 10, padding: 14, fontWeight: 700, fontSize: 16, cursor: 'pointer',
              minHeight: 44,
            }}
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  const active = getActivePlayers(poll)
  const tentatives = getTentativePlayers(poll)

  const btnStyle = {
    minHeight: 44, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
    border: 'none', padding: '10px 16px',
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.pitch, color: colors.white, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 40px' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/admin" style={{ color: colors.muted, fontSize: 13, textDecoration: 'none' }}>
            ← Admin
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 4px', letterSpacing: '-0.5px' }}>
            {poll.title}
          </h1>
          <div style={{ color: colors.muted, fontSize: 13 }}>{poll.location}</div>
          {poll.game_time && (
            <div style={{ color: colors.accent, fontSize: 14, fontWeight: 700, marginTop: 4 }}>
              ⏰ {formatSlot(poll.game_time)}
            </div>
          )}
        </div>

        {/* Team split */}
        {poll.teams && (poll.teams.teamA?.length > 0 || poll.teams.teamB?.length > 0) && (
          <div style={{ background: colors.pitchCard, borderRadius: 12, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: colors.muted, marginBottom: 12 }}>
              🏟️ Teams
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { key: 'A', list: poll.teams.teamA || [], label: poll.team_a_name || 'Team A', color: '#63b3ed' },
                { key: 'B', list: poll.teams.teamB || [], label: poll.team_b_name || 'Team B', color: '#f687b3' },
              ].map(({ key, list, label, color }) => (
                <div key={key} style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    {label} ({list.filter(p => !p.isGuest).length})
                  </div>
                  {list.filter(p => !p.isGuest).map((p, i) => (
                    <div key={i} style={{ fontSize: 14, fontWeight: 600, color: colors.white, padding: '3px 0', borderBottom: `1px solid ${colors.grass}11` }}>
                      {p.name.split(' ')[0]}
                      {p.positions?.[0] ? <span style={{ color: colors.muted, fontSize: 11, marginLeft: 4 }}>({p.positions[0]})</span> : null}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pitch fee tracker */}
        {poll.pitch_fee && (
          <div style={{ background: colors.pitchCard, borderRadius: 12, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: colors.muted, marginBottom: 4 }}>
              💵 Pitch Fee
            </div>
            <div style={{ color: colors.accent, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
              ${poll.pitch_fee} total · ${(poll.pitch_fee / Math.max(1, getTotalSpots(active))).toFixed(2)}/person
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {active.map((p, i) => (
                <button
                  key={i}
                  onClick={() => doAction({ action: 'togglePaid', playerName: p.name })}
                  disabled={loading}
                  style={{
                    background: p.paid ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${p.paid ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 700,
                    color: p.paid ? '#22c55e' : colors.muted, cursor: 'pointer', minHeight: 36,
                  }}
                >
                  {p.paid ? '✓' : '○'} {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: colors.muted, marginTop: 10 }}>
              {active.filter(p => p.paid).length}/{active.length} paid
            </div>
          </div>
        )}

        {/* Active players */}
        <div style={{ background: colors.pitchCard, borderRadius: 12, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: colors.grassLight, marginBottom: 12 }}>
            ⚽ Mark no-shows ({active.length} active)
          </div>
          {active.length === 0 && (
            <div style={{ color: colors.muted, fontSize: 14 }}>No active players</div>
          )}
          {active.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < active.length - 1 ? `1px solid ${colors.grass}22` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: colors.grassLight, fontSize: 16 }}>✓</span>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                {p.guests > 0 && <span style={{ color: colors.muted, fontSize: 12 }}>+{p.guests}</span>}
              </div>
              <button
                onClick={() => doAction({ action: 'groundUpdate', noShows: [p.name] })}
                disabled={loading}
                style={{ ...btnStyle, background: colors.danger + '22', color: colors.danger, border: `1px solid ${colors.danger}44`, padding: '6px 12px', minHeight: 36 }}
              >
                × No-show
              </button>
            </div>
          ))}
        </div>

        {/* Tentative players */}
        {tentatives.length > 0 && (
          <div style={{ background: colors.pitchCard, borderRadius: 12, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 12 }}>
              ⚡ Tentative ({tentatives.length})
            </div>
            {tentatives.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < tentatives.length - 1 ? `1px solid ${colors.grass}22` : 'none' }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => doAction({ action: 'groundUpdate', confirmTentative: [p.name] })}
                    disabled={loading}
                    style={{ ...btnStyle, background: colors.grass + '22', color: colors.grassLight, border: `1px solid ${colors.grass}44`, padding: '6px 12px', minHeight: 36, fontSize: 13 }}
                  >
                    ✅ Confirm
                  </button>
                  <button
                    onClick={() => doAction({ action: 'groundUpdate', noShows: [p.name] })}
                    disabled={loading}
                    style={{ ...btnStyle, background: colors.danger + '22', color: colors.danger, border: `1px solid ${colors.danger}44`, padding: '6px 12px', minHeight: 36 }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lock teams */}
        <div style={{ background: colors.pitchCard, borderRadius: 12, padding: '16px' }}>
          {poll.teams_locked ? (
            <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: colors.accent, padding: '8px 0' }}>
              Teams locked 🔐
            </div>
          ) : (
            <button
              onClick={() => doAction({ action: 'lockTeams' })}
              disabled={loading}
              style={{ ...btnStyle, width: '100%', background: colors.accent, color: colors.pitch, fontSize: 16 }}
            >
              🔐 Lock teams
            </button>
          )}
        </div>
      </div>

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}
