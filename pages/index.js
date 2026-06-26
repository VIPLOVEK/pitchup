import { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import { Card, Label, ProgressBar, Pill } from '../components/UI'
import { colors, radius } from '../lib/tokens'
import { getActivePlayers } from '../lib/teams'
import { LOCATIONS } from '../lib/locations'

function RequestGameModal({ onClose }) {
  const [name, setName] = useState(() => {
    if (typeof window === 'undefined') return ''
    try { return JSON.parse(localStorage.getItem('pitchup_player') || '{}').name || '' } catch { return '' }
  })
  const [gameType, setGameType] = useState('game')
  const [opponent, setOpponent] = useState('')
  const [location, setLocation] = useState(LOCATIONS[0].name)
  const [customLocation, setCustomLocation] = useState('')
  const [slot, setSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const selectStyle = {
    width: '100%', background: colors.pitchMid, border: `1px solid ${colors.grass}44`,
    borderRadius: 8, color: colors.white, padding: '10px 12px', fontSize: 14,
    outline: 'none', marginBottom: 10,
  }
  const inputStyle = {
    width: '100%', background: colors.pitchMid, border: `1px solid ${colors.grass}44`,
    borderRadius: 8, color: colors.white, padding: '10px 12px', fontSize: 14,
    outline: 'none', marginBottom: 10, boxSizing: 'border-box',
  }

  const handleSubmit = async () => {
    const finalLocation = location === 'Other' ? customLocation.trim() : location
    if (!name.trim() || !finalLocation || !slot) {
      setError('Please fill in your name, location and a preferred time.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/request-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterName: name.trim(),
          title: gameType === 'practice' ? 'Practice Session ⚽' : gameType === 'competition' ? 'Competition ⚽' : 'Pickup Game ⚽',
          location: finalLocation,
          slot,
          notes: notes.trim() || undefined,
          gameType,
          opponent: opponent.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: colors.pitch, borderRadius: '18px 18px 0 0', width: '100%',
        maxHeight: '90vh', overflowY: 'auto', padding: '24px 20px 32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Request a game</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.muted, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>Request sent!</p>
            <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 20px' }}>The organizer will review and approve it. You'll see it appear on the home screen.</p>
            <button onClick={onClose} style={{ background: colors.accent, color: colors.pitch, border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 16px' }}>
              The organizer will review your request and publish it for the group to vote on.
            </p>
            <input style={inputStyle} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            <select value={gameType} onChange={e => setGameType(e.target.value)} style={selectStyle}>
              <option value="game">⚽ Regular game</option>
              <option value="practice">🏃 Practice session</option>
              <option value="competition">🏆 Competition</option>
            </select>
            {gameType !== 'game' && (
              <input style={inputStyle} placeholder="Opponent team name (optional)" value={opponent} onChange={e => setOpponent(e.target.value)} />
            )}
            <select value={location} onChange={e => setLocation(e.target.value)} style={selectStyle}>
              {LOCATIONS.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
              <option value="Other">Other...</option>
            </select>
            {location === 'Other' && (
              <input style={inputStyle} placeholder="Field / location name" value={customLocation} onChange={e => setCustomLocation(e.target.value)} />
            )}
            <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 6px' }}>Preferred date &amp; time</p>
            <input type="datetime-local" style={inputStyle} value={slot} onChange={e => setSlot(e.target.value)} />
            <input style={inputStyle} placeholder="Any notes for the organizer? (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
            {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <button
              onClick={handleSubmit} disabled={loading}
              style={{ width: '100%', background: colors.accent, color: colors.pitch, border: 'none', borderRadius: 8, padding: '13px', fontWeight: 800, fontSize: 15, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Sending...' : 'Send request'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function AnnouncementBanner({ announcement }) {
  const [dismissed, setDismissed] = useState(false)
  if (!announcement || dismissed) return null
  return (
    <div style={{
      background: '#f59e0b18',
      border: '1px solid #f59e0b55',
      borderRadius: 10,
      padding: '12px 14px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
    }}>
      <span style={{ fontSize: 18, lineHeight: 1.3 }}>📣</span>
      <div style={{ flex: 1, fontSize: 14, color: colors.white, lineHeight: 1.5 }}>{announcement.message}</div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}
        aria-label="Dismiss"
      >×</button>
    </div>
  )
}

function GroupBadges({ poll, groups }) {
  if (poll.visibility !== 'groups') return null
  const pollGroups = poll.group_ids.map(id => groups.find(g => g.id === id)).filter(Boolean)
  if (pollGroups.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
      {pollGroups.map(g => (
        <Pill key={g.id} color={g.color || colors.muted}>
          {g.logo_url ? <img src={g.logo_url} alt="" style={{ width: 12, height: 12, borderRadius: radius.full, verticalAlign: 'middle', marginRight: 4, objectFit: 'cover' }} /> : '🔒 '}
          {g.name}
        </Pill>
      ))}
    </div>
  )
}

function groupAccent(poll, groups) {
  if (poll.visibility !== 'groups') return {}
  const first = groups.find(g => poll.group_ids.includes(g.id))
  return first ? { borderLeft: `4px solid ${first.color || colors.grassLight}` } : {}
}

function TodayWCMatches({ matches }) {
  if (!matches || matches.length === 0) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.muted }}>
          🏆 World Cup Today
        </div>
        <Link href="/worldcup" style={{ fontSize: 12, fontWeight: 700, color: colors.accent, textDecoration: 'none' }}>
          All matches →
        </Link>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {matches.map(m => {
          const time = new Date(m.match_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
          const hasScore = m.score_home != null && m.score_away != null
          return (
            <Link key={m.id} href={`/worldcup/${m.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                background: 'linear-gradient(145deg, rgba(20,40,72,0.88) 0%, rgba(13,30,53,0.92) 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: '10px 14px',
                minWidth: 140,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, color: colors.muted, marginBottom: 6 }}>{time}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontSize: 20 }}>{m.flag_home || '🏳️'}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: hasScore ? colors.accent : colors.muted }}>
                    {hasScore ? `${m.score_home}–${m.score_away}` : 'vs'}
                  </span>
                  <span style={{ fontSize: 20 }}>{m.flag_away || '🏳️'}</span>
                </div>
                <div style={{ fontSize: 10, color: colors.muted, marginTop: 5, lineHeight: 1.3 }}>
                  {m.team_home} · {m.team_away}
                </div>
                {m.status === 'live' && (
                  <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginTop: 4 }}>🔴 Live</div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function Home({ polls, groups, announcement, todayWcMatches }) {
  const [showRequest, setShowRequest] = useState(false)
  const now = new Date()
  const today = now.toDateString()

  // Confirmed games that haven't kicked off yet stay at the top
  const openPolls = polls.filter(p => p.status === 'open')
  const confirmedUpcoming = polls.filter(p =>
    p.status === 'confirmed' && p.game_time && new Date(p.game_time) > now
  )
  const activePolls = [...confirmedUpcoming, ...openPolls]
  const pastPolls = polls.filter(p =>
    p.status === 'cancelled' || p.status === 'finished' ||
    (p.status === 'confirmed' && (!p.game_time || new Date(p.game_time) <= now))
  )

  function isToday(poll) {
    return poll.game_time && new Date(poll.game_time).toDateString() === today
  }

  return (
    <Layout title="PitchUp — Pickup Soccer">
      {showRequest && <RequestGameModal onClose={() => setShowRequest(false)} />}
      <AnnouncementBanner announcement={announcement} />

      {/* World Cup today's matches */}
      <TodayWCMatches matches={todayWcMatches} />

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
        <img className="brand-logo" src="/logo.png" alt="PitchUp" style={{ width: 72, height: 72, borderRadius: '50%', marginBottom: 12 }} />
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px', margin: '0 0 8px' }}>
          Pitch<span style={{ color: colors.accent }}>Up</span>{' '}
          <span className="floating-ball" aria-hidden="true">⚽</span>
        </h1>
        <p style={{ color: colors.muted, fontSize: 14, margin: '0 0 8px' }}>
          Pickup soccer, organized.
        </p>
        <p style={{ color: colors.muted, fontSize: 13, maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.5 }}>
          Choose game times, see who's in, and join us on the pitch — all skill levels welcome.
        </p>
        <button
          onClick={() => setShowRequest(true)}
          style={{
            background: 'transparent', border: `1.5px solid ${colors.grass}55`,
            color: colors.muted, borderRadius: 20, padding: '7px 18px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Request a game
        </button>
      </div>

      {/* Active polls: confirmed-but-upcoming first, then open */}
      {activePolls.length > 0 ? (
        activePolls.map(poll => {
          const confirmed = poll.status === 'confirmed'
          const todayGame = isToday(poll)
          const gameDate = poll.game_time ? new Date(poll.game_time) : null
          const gameTime = gameDate ? gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null
          // For open polls without a confirmed game_time, use the earliest slot date
          const slotDate = !gameDate && poll.slots?.length
            ? new Date(Math.min(...poll.slots.map(s => new Date(s))))
            : null
          const gameDateLabel = gameDate
            ? todayGame
              ? `Today · ${gameTime}`
              : `${gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${gameTime}`
            : slotDate
              ? `${slotDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}${poll.slots.length > 1 ? ' (vote open)' : ''}`
              : null
          const typeLabel = poll.game_type === 'practice' ? '🏃 Practice' : poll.game_type === 'competition' ? '🏆 Competition' : confirmed ? '✅ Game is ON!' : 'Game this week'
          return (
            <Link key={poll.id} href={`/poll/${poll.id}`} style={{ textDecoration: 'none' }}>
              <Card highlight style={{
                cursor: 'pointer',
                ...groupAccent(poll, groups),
                ...(confirmed ? { border: '1.5px solid rgba(34,197,94,0.4)', boxShadow: '0 4px 24px rgba(34,197,94,0.1)' } : {}),
              }} className="card-link">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Label style={{ margin: 0, color: confirmed ? '#22c55e' : undefined }}>{typeLabel}{!confirmed ? ' — tap to join' : ''}</Label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {todayGame && <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: '#22c55e', borderRadius: 20, padding: '2px 8px' }}>TODAY</span>}
                    {poll.game_type === 'practice' && <span style={{ fontSize: 11, fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 20, padding: '2px 8px' }}>Practice</span>}
                    {poll.game_type === 'competition' && <span style={{ fontSize: 11, fontWeight: 700, color: '#facc15', background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 20, padding: '2px 8px' }}>Competition</span>}
                  </div>
                </div>
                <GroupBadges poll={poll} groups={groups} />
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                  {poll.title}
                </h2>
                {poll.opponent && (
                  <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: poll.game_type === 'competition' ? '#facc15' : '#fb923c' }}>vs {poll.opponent}</p>
                )}
                <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>{poll.location}{gameDateLabel ? ` · ${gameDateLabel}` : ''}</p>
                {confirmed ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>⚽ {getActivePlayers(poll).length} players confirmed</span>
                    <span style={{ fontSize: 12, color: colors.muted }}>Tap for teams →</span>
                  </div>
                ) : (
                  <>
                    <ProgressBar value={getActivePlayers(poll).length} max={poll.min_players} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ color: colors.muted, fontSize: 13 }}>
                        {getActivePlayers(poll).length} / {poll.min_players}+ players
                      </span>
                      <span style={{ color: colors.accent, fontSize: 13, fontWeight: 700 }}>Join ⚽</span>
                    </div>
                  </>
                )}
              </Card>
            </Link>
          )
        })
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0', color: colors.muted }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚽</div>
            <p style={{ fontSize: 14 }}>No upcoming game right now.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Ask your organizer to set one up!</p>
          </div>
        </Card>
      )}

      {/* Past / cancelled games */}
      {pastPolls.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.muted }}>
              Recent games
            </div>
            <Link href="/leaderboard" style={{ fontSize: 12, fontWeight: 700, color: colors.accent, textDecoration: 'none' }}>
              🏆 Rankings
            </Link>
          </div>
          {pastPolls.slice(0, 3).map(poll => (
            <Link key={poll.id} href={`/poll/${poll.id}`} style={{ textDecoration: 'none' }}>
              <Card style={{ cursor: 'pointer', ...groupAccent(poll, groups) }} className="card-link">
                <GroupBadges poll={poll} groups={groups} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{poll.title}</div>
                    <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                      {poll.location}
                      {poll.game_time && ` · ${new Date(poll.game_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
                    </div>
                  </div>
                  {poll.status === 'confirmed' ? (
                    poll.score_a != null && poll.score_b != null ? (
                      <Pill color={colors.accent} className="score-celebrate">⚽ {poll.score_a} - {poll.score_b}</Pill>
                    ) : (
                      <Pill color={colors.accent}>✅ {poll.players.length} players</Pill>
                    )
                  ) : (
                    <Pill color={colors.danger}>❌ Cancelled</Pill>
                  )}
                </div>
              </Card>
            </Link>
          ))}
          {pastPolls.length > 3 && (
            <Link href="/games" style={{ display: 'block', textAlign: 'center', color: colors.accent, fontSize: 13, fontWeight: 700, marginTop: 8, textDecoration: 'none' }}>
              See all {pastPolls.length} games →
            </Link>
          )}
        </div>
      )}

      {polls.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link href="/admin" style={{
            display: 'inline-block',
            background: colors.accent,
            color: colors.pitch,
            borderRadius: 8,
            padding: '11px 24px',
            fontWeight: 700,
            fontSize: 14,
          }}>
            Create your first game →
          </Link>
        </div>
      )}
    </Layout>
  )
}

export async function getServerSideProps() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const [pollsRes, groupsRes, announcementRes, wcRes] = await Promise.all([
      fetch(`${baseUrl}/api/admin/polls`, { headers: { authorization: `Bearer ${process.env.ADMIN_PASSWORD}` } }),
      fetch(`${baseUrl}/api/groups`),
      fetch(`${baseUrl}/api/announcement`),
      fetch(`${baseUrl}/api/worldcup/matches?noSync=1`).catch(() => null),
    ])
    if (!pollsRes.ok) return { props: { polls: [], groups: [], announcement: null, todayWcMatches: [] } }
    const polls = await pollsRes.json()
    const groups = groupsRes.ok ? await groupsRes.json() : []
    const announcement = announcementRes.ok ? await announcementRes.json() : null
    const today = new Date().toISOString().split('T')[0]
    const allWcMatches = wcRes?.ok ? await wcRes.json() : []
    const todayWcMatches = allWcMatches.filter(m => m.match_date && m.match_date.startsWith(today))
    return { props: { polls, groups, announcement, todayWcMatches } }
  } catch {
    return { props: { polls: [], groups: [], announcement: null, todayWcMatches: [] } }
  }
}
