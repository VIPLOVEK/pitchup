import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../../components/Layout'
import { Card, Label, ProgressBar, Btn, Input, Pill, PlayerChip, Avatar, Toast, GoalCelebration, WeatherBadge } from '../../components/UI'
import { supabase } from '../../lib/supabase'
import { colors, radius } from '../../lib/tokens'
import { formatSlot, getActivePlayers, getWaitlist, getTotalSpots, expandWithGuests } from '../../lib/teams'
import { findLocation } from '../../lib/locations'

// ── Venue info (map link + boot type) ──────────────────────────────────────────
function VenueInfo({ location }) {
  const venue = findLocation(location)
  if (!venue) return null
  return (
    <a
      href={venue.mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: colors.muted, fontSize: 12, textDecoration: 'none' }}
    >
      🗺️ Map · {venue.boot} boots
    </a>
  )
}

// ── Cancelled game view ─────────────────────────────────────────────────────────
function GameCancelled({ poll }) {
  return (
    <Card highlight>
      <Label>Game cancelled</Label>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px', color: colors.danger }}>
        {poll.title}
      </h1>
      <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 12px' }}>{poll.location}</p>
      <div style={{ textAlign: 'center', padding: '12px 0', color: colors.muted }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>😕</div>
        <p style={{ fontSize: 14 }}>
          Not enough players joined ({poll.players.length}/{poll.min_players} minimum) — game is off.
        </p>
      </div>
    </Card>
  )
}

// ── Position summary ──────────────────────────────────────────────────────────
function PositionSummary({ players }) {
  const counts = {}
  players.forEach(p => {
    if (p.isGuest) return
    const positions = p.positions?.length ? p.positions : ['Any']
    positions.forEach(pos => { counts[pos] = (counts[pos] || 0) + 1 })
  })
  const order = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Any']
  const abbr = { Goalkeeper: 'GK', Defender: 'DEF', Midfielder: 'MID', Forward: 'FWD', Any: 'ANY' }
  const parts = order.filter(p => counts[p]).map(p => `${abbr[p]} ×${counts[p]}`)
  if (!parts.length) return null
  return <div style={{ fontSize: 10, color: colors.muted, marginTop: 4, letterSpacing: '0.04em' }}>{parts.join(' · ')}</div>
}

// ── MVP Voting ────────────────────────────────────────────────────────────────
function MvpVoting({ poll }) {
  const [voterName, setVoterName] = useState('')
  const [myPick, setMyPick] = useState(() => typeof window !== 'undefined' ? localStorage.getItem(`mvp_voted_${poll.id}`) || '' : '')
  const [mvpVotes, setMvpVotes] = useState(poll.mvp_votes || [])
  const [toast, setToast] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('pitchup_player')
    if (saved) setVoterName(JSON.parse(saved).name)
  }, [])

  if (poll.score_a == null || poll.score_b == null) return null

  const { teamA = [], teamB = [] } = poll.teams || {}
  const allPlayers = [...teamA, ...teamB].filter(p => !p.isGuest)

  const counts = {}
  mvpVotes.forEach(v => { counts[v.votedFor] = (counts[v.votedFor] || 0) + 1 })
  const sorted = allPlayers
    .map(p => ({ name: p.name, votes: counts[p.name] || 0 }))
    .filter(p => p.votes > 0)
    .sort((a, b) => b.votes - a.votes)
  const maxVotes = sorted[0]?.votes || 1

  const castVote = async (name) => {
    if (!voterName.trim()) return
    try {
      const res = await fetch(`/api/poll/${poll.id}/mvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterName: voterName.trim(), votedFor: name }),
      })
      const data = await res.json()
      if (res.ok) {
        setMvpVotes(data.mvpVotes)
        localStorage.setItem(`mvp_voted_${poll.id}`, name)
        setMyPick(name)
        setToast(`⭐ Voted for ${name}!`)
        setTimeout(() => setToast(''), 2500)
      }
    } catch {}
  }

  return (
    <Card>
      <Label>Man of the Match ⭐</Label>

      {/* Live vote tally */}
      {sorted.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {sorted.map((p, i) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 18, fontSize: 13, textAlign: 'center', flexShrink: 0 }}>{i === 0 ? '⭐' : ''}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: myPick === p.name ? colors.accent : colors.white }}>
                    {p.name}{myPick === p.name ? ' ✓' : ''}
                  </span>
                  <span style={{ fontSize: 12, color: colors.muted }}>{p.votes} vote{p.votes !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ height: 4, background: colors.pitchMid, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(p.votes / maxVotes) * 100}%`,
                    background: i === 0 ? colors.accent : colors.grass,
                    borderRadius: 2,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Voting */}
      {!voterName && (
        <Input value={voterName} onChange={e => setVoterName(e.target.value)} placeholder="Your name to vote" />
      )}
      <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 10px' }}>
        {myPick ? `Your pick: ${myPick} — tap another to change` : 'Who stood out today?'}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {allPlayers.map((p, i) => (
          <button
            key={i}
            onClick={() => castVote(p.name)}
            disabled={!voterName.trim()}
            style={{
              background: myPick === p.name ? colors.accent + '22' : colors.pitchMid,
              border: `1.5px solid ${myPick === p.name ? colors.accent : colors.grass + '33'}`,
              color: myPick === p.name ? colors.accent : colors.white,
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: voterName.trim() ? 'pointer' : 'default',
              opacity: voterName.trim() ? 1 : 0.5,
              transition: 'all 0.15s',
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
      {toast && <Toast msg={toast} />}
    </Card>
  )
}

// ── Waitlist card (shown below confirmed game) ────────────────────────────────
function WaitlistCard({ poll, waitlist, myEntry, onWaitlist, name, setName, profile, loading, setLoading, setToast, setPoll }) {
  const handleJoinWaitlist = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/poll/${poll.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slots: [], playerId: profile?.id || null, positions: profile?.positions || [], guests: 0 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPoll(data)
      setToast("You've joined the waitlist!")
      setTimeout(() => setToast(''), 2500)
    } catch (e) {
      setToast(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    if (!myEntry) return
    if (!window.confirm(`Remove yourself from ${onWaitlist ? 'the waitlist' : 'this game'}?`)) return
    let pinInput = ''
    if (myEntry.playerId) {
      pinInput = window.prompt('Enter your PIN to confirm:')
      if (!pinInput) return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/poll/${poll.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: myEntry.name, pin: pinInput || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPoll(data)
      setToast(onWaitlist ? "You've left the waitlist" : "You've left the game")
      setTimeout(() => setToast(''), 2500)
    } catch (e) {
      setToast(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {waitlist.length > 0 && (
        <Card>
          <Label>Waiting list ⏳</Label>
          <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 10px' }}>
            These players will be promoted automatically if someone drops out.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {waitlist.map((p, i) => (
              <PlayerChip key={i} name={p.name} color={colors.cardYellow} avatar={p.avatar_url}
                meta={p.guests ? `+${p.guests} guest${p.guests > 1 ? 's' : ''}` : undefined} />
            ))}
          </div>
        </Card>
      )}
      {myEntry ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '10px 0 14px' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{onWaitlist ? '⏳' : '✅'}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              {onWaitlist ? "You're on the waitlist" : "You're in the squad!"}
            </div>
            <p style={{ color: colors.muted, fontSize: 13 }}>
              {onWaitlist ? "We'll notify you if a spot opens up." : 'See you on the pitch!'}
            </p>
          </div>
          <Btn small variant="ghost" onClick={handleLeave} disabled={loading}>
            {onWaitlist ? 'Leave waitlist' : "Can't make it — leave game"}
          </Btn>
        </Card>
      ) : (
        <Card>
          <Label>Join the waitlist</Label>
          <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 12px' }}>
            The game is full, but you can join the waitlist — you'll be promoted automatically if a spot opens up.
          </p>
          {profile ? (
            <p style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
              Joining as <strong style={{ color: colors.white }}>{profile.name}</strong>
            </p>
          ) : (
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name (required to send)" />
          )}
          <Btn onClick={handleJoinWaitlist} disabled={!name.trim() || loading}>
            {loading ? 'Joining...' : '⏳ Join waitlist'}
          </Btn>
        </Card>
      )}
    </>
  )
}

// ── Match comments ────────────────────────────────────────────────────────────
function renderMentions(text) {
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? <span key={i} style={{ color: colors.accent, fontWeight: 700 }}>{part}</span>
      : part
  )
}

function Comments({ poll, profileName }) {
  const [comments, setComments] = useState(poll.comments || [])
  const [text, setText] = useState('')
  const [name, setName] = useState(profileName || '')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  // Profile loads async — sync name when it arrives
  useEffect(() => {
    if (profileName && !name) setName(profileName)
  }, [profileName])

  // Live updates via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`poll-chat-${poll.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'polls',
        filter: `id=eq.${poll.id}`,
      }, (payload) => {
        if (payload.new?.comments) setComments(payload.new.comments)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [poll.id])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  async function submit(e) {
    e.preventDefault()
    if (!text.trim() || !name.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/poll/${poll.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, text }),
      })
      if (res.ok) {
        const updated = await res.json()
        setComments(updated)
        setText('')
      }
    } finally {
      setLoading(false)
    }
  }

  function formatTs(ts) {
    const d = new Date(ts)
    return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card>
      <Label>💬 Match chat</Label>
      {comments.length === 0 && (
        <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 12px' }}>No messages yet — be the first!</p>
      )}
      {comments.map((c, i) => (
        <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < comments.length - 1 ? `1px solid ${colors.grass}22` : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: colors.accent }}>{c.name}</span>
            <span style={{ fontSize: 11, color: colors.muted }}>{formatTs(c.ts)}</span>
          </div>
          <div style={{ fontSize: 13, color: colors.white, lineHeight: 1.5 }}>{renderMentions(c.text)}</div>
        </div>
      ))}
      <div ref={bottomRef} />
      <form onSubmit={submit} style={{ marginTop: 8 }}>
        {!name.trim() && (
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name (required to send)"
            style={{ width: '100%', background: colors.pitchMid, border: `1px solid ${colors.grass}33`, color: colors.white, borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
          />
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Say something… (@name to notify)"
            maxLength={280}
            style={{ flex: 1, background: colors.pitchMid, border: `1px solid ${colors.grass}33`, color: colors.white, borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
          />
          <button
            type="submit"
            disabled={loading || !text.trim() || !name.trim()}
            style={{ background: colors.accent, color: colors.pitch, border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (text.trim() && name.trim()) ? 1 : 0.5 }}
          >
            Send
          </button>
        </div>
      </form>
    </Card>
  )
}

// ── Confirmed game view ───────────────────────────────────────────────────────
function GameConfirmed({ poll, profile }) {
  const { teamA = [], teamB = [] } = poll.teams || {}
  const nameA = poll.team_a_name || 'Team A'
  const nameB = poll.team_b_name || 'Team B'
  const gameTime = formatSlot(poll.game_time)
  const whatsappText = [
    `⚽ *Game is ON!* ${poll.players.length} players confirmed.`,
    ``,
    `📅 ${gameTime}`,
    `📍 ${poll.location}`,
    ``,
    `🟦 *${nameA}:* ${teamA.map(p => p.name).join(', ')}`,
    `🟥 *${nameB}:* ${teamB.map(p => p.name).join(', ')}`,
    ``,
    `See you on the pitch! 🏃`,
  ].join('\n')

  return (
    <div>
      <Card highlight>
        <Label>Game confirmed 🎉</Label>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px', color: colors.accent }}>
          {poll.title}
        </h1>
        <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 8px' }}>{poll.location}</p>
        <div style={{ marginBottom: 12 }}>
          <VenueInfo location={poll.location} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill color={colors.accent}>📅 {gameTime}</Pill>
          <Pill color={colors.grassLight}>👥 {poll.players.length} players</Pill>
        </div>
        {poll.notes && (
          <div style={{ background: colors.pitchMid, borderRadius: 8, padding: '8px 12px', marginTop: 12, fontSize: 13, color: colors.white }}>
            📋 {poll.notes}
          </div>
        )}
      </Card>

      <Card>
        {poll.score_a != null && poll.score_b != null ? (
          <div style={{ textAlign: 'center', margin: '0 0 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.muted, marginBottom: 6 }}>
              Final score
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: poll.score_a > poll.score_b ? colors.teamA : colors.muted }}>{poll.score_a}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: colors.muted }}>—</span>
              <span style={{ fontSize: 32, fontWeight: 900, color: poll.score_b > poll.score_a ? colors.teamB : colors.muted }}>{poll.score_b}</span>
            </div>
            <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
              {poll.score_a === poll.score_b ? 'Draw' : poll.score_a > poll.score_b ? `🟦 ${nameA} wins` : `🟥 ${nameB} wins`}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 28, color: colors.accent, letterSpacing: '0.1em', margin: '0 0 20px', textShadow: `0 0 20px ${colors.accent}66` }}>
            VS
          </div>
        )}
        {(poll.goals || []).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: colors.muted, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
              ⚽ GOAL SCORERS
            </div>
            {['A', 'B'].map(team => {
              const teamGoals = (poll.goals || []).filter(g => g.team === team)
              if (!teamGoals.length) return null
              return (
                <div key={team} style={{ fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: team === 'A' ? colors.teamA : colors.teamB, fontWeight: 700, marginRight: 6 }}>
                    {team === 'A' ? '🟦' : '🟥'}
                  </span>
                  {teamGoals.map((g, i) => (
                    <span key={i}>
                      {i > 0 && ', '}
                      {g.name}
                      {g.assist && <span style={{ color: colors.muted, fontWeight: 400 }}> (↗ {g.assist})</span>}
                    </span>
                  ))}
                </div>
              )
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.teamA, marginBottom: 8 }}>
              🟦 {nameA}
            </div>
            <PositionSummary players={teamA} />
            {teamA.map((p, i) => (
              <div key={i} style={{ display: 'flex', marginBottom: 4 }}>
                <PlayerChip name={p.name} color={colors.teamA} avatar={p.avatar_url} />
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.teamB, marginBottom: 8 }}>
              🟥 {nameB}
            </div>
            <PositionSummary players={teamB} />
            {teamB.map((p, i) => (
              <div key={i} style={{ display: 'flex', marginBottom: 4 }}>
                <PlayerChip name={p.name} color={colors.teamB} avatar={p.avatar_url} />
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp copy block */}
        <div style={{ marginTop: 20, background: colors.pitchMid, borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: colors.muted, fontWeight: 600, marginBottom: 8 }}>💬 COPY TO WHATSAPP</div>
          <pre style={{ fontSize: 13, color: colors.white, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: 'inherit', margin: '0 0 10px' }}>
            {whatsappText}
          </pre>
          <button
            onClick={() => navigator.clipboard?.writeText(whatsappText)}
            style={{
              background: '#25D366',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Copy message for WhatsApp
          </button>
          <div style={{ marginTop: 10 }}>
            <a
              href={`/poll/${poll.id}/share`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                background: colors.pitchMid,
                color: colors.muted,
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                border: `1px solid ${colors.grass}33`,
              }}
            >
              📸 Open shareable teams card
            </a>
          </div>
        </div>
      </Card>
      <MvpVoting poll={poll} />
      <Comments poll={poll} profileName={profile?.name || name || null} />
    </div>
  )
}

// ── Draft team preview ────────────────────────────────────────────────────────
// Deterministic split by join order (stable across refreshes): even-index
// players go to Team A, odd-index to Team B.
function getDraftTeams(activePlayers) {
  return {
    teamA: activePlayers.filter((_, i) => i % 2 === 0),
    teamB: activePlayers.filter((_, i) => i % 2 !== 0),
  }
}

function DraftTeams({ poll, active }) {
  const expanded = expandWithGuests(active)
  const teams = poll.teams || getDraftTeams(expanded)
  const { teamA = [], teamB = [] } = teams
  const nameA = poll.team_a_name || 'Team A'
  const nameB = poll.team_b_name || 'Team B'
  const isConfirmed = poll.status === 'confirmed'
  return (
    <Card>
      <Label>{isConfirmed ? 'Teams' : 'Draft teams — updates as players join'}</Label>
      {!isConfirmed && (
        <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 14px' }}>
          These are provisional teams based on who's joined so far. Final balanced teams are set when the game is confirmed.
        </p>
      )}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.teamA, marginBottom: 8 }}>
            🟦 {nameA}
          </div>
          <PositionSummary players={teamA} />
          {teamA.map((p, i) => (
            <div key={i} style={{ display: 'flex', marginBottom: 4 }}>
              <PlayerChip name={p.name} color={colors.teamA} avatar={p.avatar_url} />
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.teamB, marginBottom: 8 }}>
            🟥 {nameB}
          </div>
          <PositionSummary players={teamB} />
          {teamB.map((p, i) => (
            <div key={i} style={{ display: 'flex', marginBottom: 4 }}>
              <PlayerChip name={p.name} color={colors.teamB} avatar={p.avatar_url} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// ── Admin sticky bar (only shown when ?admin=1 in URL) ───────────────────────
function AdminBar({ poll, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [pw, setPw] = useState('')
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pitchup_admin')
      if (raw) setPw(JSON.parse(raw).password || '')
    } catch {}
  }, [])
  if (!pw) return null

  async function doAction(action, extra = {}) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/${poll.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pw}` },
        body: JSON.stringify({ action, ...extra }),
      })
      if (res.ok) onUpdate(await res.json())
    } finally { setLoading(false) }
  }

  const isOpen = poll.status === 'open'
  const isConfirmed = poll.status === 'confirmed'

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: '#0a1a0c', borderTop: `2px solid ${colors.accent}`,
      padding: '10px 16px', display: 'flex', alignItems: 'center',
      gap: 8, flexWrap: 'wrap', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
    }}>
      <Link href="/admin" style={{ color: colors.accent, fontWeight: 700, fontSize: 13, textDecoration: 'none', marginRight: 4 }}>
        ⚙️ Admin
      </Link>
      <span style={{ color: colors.grass + '66', fontSize: 13 }}>|</span>
      {isOpen && (
        <button onClick={() => doAction('close')} disabled={loading}
          style={{ background: colors.accent, color: colors.pitch, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          ✅ Confirm game
        </button>
      )}
      {isConfirmed && (
        <button onClick={() => doAction('shuffle')} disabled={loading}
          style={{ background: colors.pitchMid, color: colors.white, border: `1px solid ${colors.grass}44`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          🔀 Reshuffle
        </button>
      )}
      <button onClick={() => doAction('randomizeNames')} disabled={loading}
        style={{ background: colors.pitchMid, color: colors.white, border: `1px solid ${colors.grass}44`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        🎲 New names
      </button>
      <Link href={`/admin`} style={{ marginLeft: 'auto', color: colors.muted, fontSize: 12, textDecoration: 'none' }}>
        More controls →
      </Link>
    </div>
  )
}

// ── Main vote page ────────────────────────────────────────────────────────────
export default function PollPage({ poll: initialPoll, error }) {
  const router = useRouter()
  const [poll, setPoll] = useState(initialPoll)
  const [name, setName] = useState('')
  const [profile, setProfile] = useState(null)
  const [pin, setPin] = useState('')
  const [players, setPlayers] = useState([])
  const [selectedSlots, setSelectedSlots] = useState([])
  const [guests, setGuests] = useState(0)
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [kicking, setKicking] = useState(false)
  const [toast, setToast] = useState('')
  const [hasAccess, setHasAccess] = useState(null)
  const [pollGroups, setPollGroups] = useState([])

  useEffect(() => {
    const saved = localStorage.getItem('pitchup_player')
    if (saved) {
      const p = JSON.parse(saved)
      setProfile(p)
      setName(p.name)
    }
    fetch('/api/players')
      .then(res => res.ok ? res.json() : [])
      .then(setPlayers)
      .catch(() => {})
  }, [])

  // Auto-refresh poll data every 20 s while the poll is open so status
  // changes (confirmation, cancellation, new votes) are visible to all
  // visitors without a manual page reload.
  useEffect(() => {
    if (!initialPoll || poll?.status !== 'open') return
    const id = initialPoll.id
    const interval = setInterval(() => {
      fetch(`/api/poll/${id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setPoll(data) })
        .catch(() => {})
    }, 20000)
    return () => clearInterval(interval)
  }, [initialPoll, poll?.status])

  useEffect(() => {
    if (!initialPoll || initialPoll.visibility !== 'groups') return
    const url = profile ? `/api/groups?playerId=${profile.id}` : '/api/groups'
    fetch(url)
      .then(res => res.ok ? res.json() : [])
      .then(groups => {
        setPollGroups(groups.filter(g => initialPoll.group_ids.includes(g.id)))
        if (!profile) { setHasAccess(false); return }
        const allowed = groups.some(g => g.status === 'approved' && initialPoll.group_ids.includes(g.id))
        setHasAccess(allowed)
      })
      .catch(() => setHasAccess(false))
  }, [initialPoll, profile])

  const matchedPlayer = !profile && players.find(p => p.name.toLowerCase() === name.trim().toLowerCase())
  const ogImageUrl = poll ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/og?id=${poll.id}` : undefined
  const [isAdminMode, setIsAdminMode] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pitchup_admin')
      if (!raw) return
      const { ts } = JSON.parse(raw)
      // Session valid for 12 hours
      if (Date.now() - ts < 12 * 60 * 60 * 1000) setIsAdminMode(true)
    } catch {}
  }, [])

  if (error) {
    return (
      <Layout title="Poll not found">
        <Card>
          <div style={{ textAlign: 'center', padding: 30, color: colors.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Poll not found</div>
            <p style={{ fontSize: 13 }}>This poll may have been deleted or the link is wrong.</p>
          </div>
        </Card>
      </Layout>
    )
  }

  // Computed values used across confirmed, submitted, and open views
  const active = getActivePlayers(poll)
  const waitlist = getWaitlist(poll)
  const totalSpots = getTotalSpots(active)
  const venue = findLocation(poll.location)
  const myEntry = poll.players.find(p => profile
    ? p.playerId === profile.id
    : (name.trim() && p.name.toLowerCase() === name.trim().toLowerCase()))
  const onWaitlist = !!myEntry && waitlist.some(p => p.name.toLowerCase() === myEntry.name.toLowerCase())

  if (poll.status === 'confirmed') {
    return (
      <Layout title={poll.title} description={`Game is on at ${poll.location} — ${formatSlot(poll.game_time)}.`} ogImageUrl={ogImageUrl}>
        <GameConfirmed poll={poll} profile={profile} />
        <WaitlistCard poll={poll} waitlist={waitlist} myEntry={myEntry} onWaitlist={onWaitlist}
          name={name} setName={setName} profile={profile}
          loading={loading} setLoading={setLoading} setToast={setToast} setPoll={setPoll} />
        <Toast msg={toast} />
        {isAdminMode && <AdminBar poll={poll} onUpdate={setPoll} />}
      </Layout>
    )
  }

  if (poll.status === 'cancelled') {
    return (
      <Layout title={poll.title} description={`Cancelled — not enough players joined (${poll.players.length}/${poll.min_players} minimum).`}>
        <GameCancelled poll={poll} />
      </Layout>
    )
  }

  const toggleSlot = (i) => setSelectedSlots(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])

  const handleRemoveVote = async () => {
    if (!myEntry) return
    if (!window.confirm('Remove your vote and leave this game?')) return

    let pinInput = ''
    if (myEntry.playerId) {
      pinInput = window.prompt('Enter your PIN to confirm:')
      if (!pinInput) return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/poll/${poll.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: myEntry.name, pin: pinInput || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPoll(data)
      setSubmitted(false)
      setSelectedSlots([])
      setToast("You've left the game")
    } catch (e) {
      setToast(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async () => {
    if (!name.trim() || selectedSlots.length === 0) return
    if (matchedPlayer && !/^\d{4,6}$/.test(pin)) {
      setToast(`"${matchedPlayer.name}" already has a profile — enter their PIN to confirm it's you`)
      return
    }
    setLoading(true)
    try {
      let playerId = profile?.id || null
      let positions = profile?.positions || []

      if (matchedPlayer && !profile) {
        const loginRes = await fetch('/api/players/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), pin }),
        })
        const loginData = await loginRes.json()
        if (!loginRes.ok) throw new Error(loginData.error || 'Incorrect PIN')
        playerId = loginData.id
        positions = loginData.positions
        setProfile(loginData)
        localStorage.setItem('pitchup_player', JSON.stringify(loginData))
      }

      const res = await fetch(`/api/poll/${poll.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slots: selectedSlots,
          playerId,
          positions,
          guests,
          note: note.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPoll(data)
      setKicking(true)
      setTimeout(() => setSubmitted(true), 400)
    } catch (e) {
      setToast(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    if (poll.status === 'cancelled') return <Layout title={poll.title} ogImageUrl={ogImageUrl}><GameCancelled poll={poll} /></Layout>

    return (
      <Layout title={poll.title}>
        <Card className="vote-success">
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            {!onWaitlist && totalSpots >= poll.min_players && <GoalCelebration />}
            <div style={{ fontSize: 40, marginBottom: 10 }} className={!onWaitlist && totalSpots >= poll.min_players ? 'progress-ball' : ''}>
              {onWaitlist ? '⏳' : '✅'}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
              {onWaitlist ? "You're on the waiting list" : totalSpots >= poll.min_players ? "You're in — game is on! ⚽" : "You're in!"}
            </h2>
            <p style={{ color: colors.muted, fontSize: 13 }}>
              {onWaitlist
                ? `The first ${poll.max_players} spots are full — you'll be added automatically if someone drops out.`
                : `Game confirms automatically when all ${poll.max_players} spots fill up, or 1.5 hours before kickoff if there are ${poll.min_players}+ players.`}
            </p>
            <ProgressBar value={totalSpots} max={poll.min_players} />
            <p style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
              {totalSpots} / {poll.min_players}+ confirmed · {poll.max_players} max
              {waitlist.length > 0 ? ` · ${waitlist.length} waiting` : ''}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
              {active.map((p, i) => <PlayerChip key={i} name={p.name} avatar={p.avatar_url} meta={p.note || (p.guests ? `+${p.guests} guest${p.guests > 1 ? 's' : ''}` : p.positions?.length ? p.positions.join(', ') : undefined)} />)}
            </div>
            {waitlist.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                {waitlist.map((p, i) => <PlayerChip key={i} name={p.name} color={colors.cardYellow} avatar={p.avatar_url} meta={p.guests ? `+${p.guests} guest${p.guests > 1 ? 's' : ''}` : undefined} />)}
              </div>
            )}
            {myEntry && (
              <Btn small variant="ghost" onClick={handleRemoveVote} disabled={loading} style={{ marginTop: 16 }}>
                Leave game
              </Btn>
            )}
            <div style={{ marginTop: 20, borderTop: `1px solid ${colors.grass}22`, paddingTop: 16 }}>
              <p style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>
                Know someone who should join? Send them the link.
              </p>
              <button
                onClick={async () => {
                  const url = window.location.href
                  const shareData = { title: poll.title, text: `Join us for ${poll.title} at ${poll.location} — vote on a time!`, url }
                  if (navigator.share && navigator.canShare?.(shareData)) {
                    try { await navigator.share(shareData) } catch (_) {}
                  } else {
                    await navigator.clipboard.writeText(url)
                    setToast('Link copied!')
                    setTimeout(() => setToast(''), 2500)
                  }
                }}
                style={{
                  background: '#25D366',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                📤 Invite a friend
              </button>
            </div>
          </div>
        </Card>
        {active.length >= poll.min_players && <DraftTeams poll={poll} active={active} />}
        <Toast msg={toast} />
      </Layout>
    )
  }

  return (
    <Layout title={poll.title} description={`${poll.location} · ${totalSpots}/${poll.min_players}+ players — tap to vote on a time`} ogImageUrl={ogImageUrl}>
      <Card style={pollGroups.length > 0 ? { borderLeft: `4px solid ${pollGroups[0].color || colors.grassLight}` } : {}}>
        <Label>Open poll</Label>
        {pollGroups.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {pollGroups.map(g => (
              <Pill key={g.id} color={g.color || colors.muted}>
                {g.logo_url ? <img src={g.logo_url} alt="" style={{ width: 12, height: 12, borderRadius: radius.full, verticalAlign: 'middle', marginRight: 4, objectFit: 'cover' }} /> : '🔒 '}
                {g.name}
              </Pill>
            ))}
          </div>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>{poll.title}</h1>
        <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 4px' }}>{poll.location} · Need {poll.min_players}+ players</p>
        <div style={{ margin: '0 0 12px' }}>
          <VenueInfo location={poll.location} />
        </div>
        {poll.notes && (
          <div style={{ background: colors.pitchMid, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: colors.white }}>
            📋 {poll.notes}
          </div>
        )}
        <ProgressBar value={totalSpots} max={poll.min_players} />
        <p style={{ color: colors.muted, fontSize: 13, margin: '4px 0 16px' }}>
          {totalSpots} / {poll.min_players}+ confirmed · {poll.max_players} max
          {waitlist.length > 0 ? ` · ${waitlist.length} waiting` : ''}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {active.map((p, i) => <PlayerChip key={i} name={p.name} avatar={p.avatar_url} meta={p.note || (p.guests ? `+${p.guests} guest${p.guests > 1 ? 's' : ''}` : p.positions?.length ? p.positions.join(', ') : undefined)} />)}
        </div>
        {waitlist.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.muted, margin: '10px 0 6px' }}>
              Waiting list
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {waitlist.map((p, i) => <PlayerChip key={i} name={p.name} color={colors.cardYellow} />)}
            </div>
          </>
        )}
        {(poll.declines || []).length > 0 && (
          <div style={{ fontSize: 12, color: colors.muted, margin: '8px 0 0' }}>
            😕 {poll.declines.length} can't make it
          </div>
        )}
        {totalSpots >= poll.min_players && (
          <div style={{
            marginTop: 16, padding: '10px 14px', background: `${colors.accent}18`,
            border: `1px solid ${colors.accent}44`, borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: colors.accent,
          }}>
            <span className="floating-ball" style={{ fontSize: 18 }}>⚽</span>
            Game is on! {totalSpots} players confirmed — waiting for the time to be set.
          </div>
        )}
      </Card>

      {totalSpots >= poll.min_players && <DraftTeams poll={poll} active={active} />}

      {poll.visibility === 'groups' && hasAccess === false && (
        <Card>
          <Label>Restricted game</Label>
          <p style={{ color: colors.muted, fontSize: 13 }}>
            This game is only open to members of specific groups.{' '}
            <Link href="/profile" style={{ color: colors.accent, textDecoration: 'underline' }}>
              Create or open your profile
            </Link>{' '}
            and request to join the group to be able to vote.
          </p>
        </Card>
      )}

      {myEntry && (
        <Card>
          <Label>You're in</Label>
          <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 12px' }}>
            You're already registered for this game as <strong style={{ color: colors.white }}>{myEntry.name}</strong>.
          </p>
          <Btn small variant="ghost" onClick={handleRemoveVote} disabled={loading}>
            Leave game
          </Btn>
        </Card>
      )}

      <Card>
        <Label>{myEntry ? 'Change your vote' : 'Join the game'}</Label>
        {profile ? (
          <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 10px' }}>
            Voting as <strong style={{ color: colors.white }}>{profile.name}</strong> ({profile.positions?.length ? profile.positions.join(', ') : 'Any'}) ·{' '}
            <Link href="/profile" style={{ color: colors.accent, textDecoration: 'underline' }}>Not you?</Link>
          </p>
        ) : (
          <>
            <Input
              value={name}
              onChange={e => { setName(e.target.value); setPin('') }}
              placeholder="Your name (required to send)"
              list="player-names"
            />
            <datalist id="player-names">
              {players.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
            {matchedPlayer ? (
              <>
                <Input
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={`PIN for ${matchedPlayer.name}`}
                  type="password"
                />
                <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 10px' }}>
                  "{matchedPlayer.name}" has a profile — enter their PIN to vote as them.
                </p>
              </>
            ) : (
              <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 10px' }}>
                <Link href="/profile" style={{ color: colors.accent, textDecoration: 'underline' }}>Create a profile</Link> to save your name and position for next time.
              </p>
            )}
          </>
        )}
        <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 6px' }}>Bringing guests?</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[0, 1, 2].map(n => (
            <button
              key={n}
              onClick={() => setGuests(n)}
              style={{
                background: guests === n ? colors.accent + '22' : colors.pitchMid,
                border: `1.5px solid ${guests === n ? colors.accent : colors.grass + '33'}`,
                color: guests === n ? colors.accent : colors.muted,
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {n === 0 ? 'Just me' : `+${n} guest${n > 1 ? 's' : ''}`}
            </button>
          ))}
        </div>
        <p style={{ color: colors.muted, fontSize: 13, marginBottom: 10 }}>Pick times that work for you:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(() => {
            return poll.slots.map((slot, i) => {
              const voters = poll.players.filter(p => (p.slots || []).includes(i))
              const shown = voters.slice(0, 5)
              const extra = voters.length - 5
              const selected = selectedSlots.includes(i)
              return (
                <button
                  key={i}
                  onClick={() => toggleSlot(i)}
                  style={{
                    background: selected ? colors.accent + '22' : colors.pitchMid,
                    border: `1.5px solid ${selected ? colors.accent : colors.grass + '33'}`,
                    color: selected ? colors.accent : colors.muted,
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  {formatSlot(slot)}
                  {voters.length > 0 && (
                    <span style={{ display: 'block', fontSize: 10, color: colors.muted, marginTop: 1 }}>
                      {voters.length} player{voters.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <WeatherBadge lat={venue?.lat} lon={venue?.lon} datetime={slot} />
                  {voters.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, alignItems: 'center' }}>
                      {shown.map((p, j) => (
                        <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: colors.grass + '15', border: `1px solid ${colors.grass}33`, borderRadius: 20, padding: '2px 8px 2px 3px', fontSize: 11, color: colors.white, fontWeight: 500 }}>
                          <Avatar name={p.name} src={p.avatar_url} size={16} />
                          {p.name.split(' ')[0]}
                        </span>
                      ))}
                      {extra > 0 && <span style={{ fontSize: 11, color: colors.muted }}>+{extra} more</span>}
                    </div>
                  )}
                </button>
              )
            })
          })()}
        </div>
        <Input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Note for the group (optional, e.g. 'running 5 min late')"
          style={{ marginTop: 12 }}
        />
        <div style={{ marginTop: 8 }}>
          <Btn
            full
            onClick={handleVote}
            disabled={!name.trim() || selectedSlots.length === 0 || loading || kicking || (matchedPlayer && !/^\d{4,6}$/.test(pin)) || (poll.visibility === 'groups' && hasAccess === false)}
          >
            {kicking ? <>Joining <span className="kick-ball">⚽</span></> : loading ? 'Joining...' : "I'm in ⚽"}
          </Btn>
        </div>
        {name.trim() && !myEntry && (() => {
          const declines = poll.declines || []
          const hasDeclined = declines.some(d => d.toLowerCase() === name.trim().toLowerCase())
          const handleDecline = async () => {
            setLoading(true)
            try {
              const res = await fetch(`/api/poll/${poll.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), remove: hasDeclined }),
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error)
              setPoll(data)
              setToast(hasDeclined ? 'Removed — you can still join!' : "Got it — we'll miss you 👋")
              setTimeout(() => setToast(''), 2500)
            } catch (e) {
              setToast(e.message || 'Something went wrong')
            } finally {
              setLoading(false)
            }
          }
          return (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                onClick={handleDecline}
                disabled={loading}
                style={{ background: 'none', border: 'none', color: hasDeclined ? colors.danger : colors.muted, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {hasDeclined ? '✓ You said you can\'t make it — undo?' : "Can't make it this time"}
              </button>
              {declines.length > 0 && (
                <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                  {declines.length} player{declines.length !== 1 ? 's' : ''} can't make it
                </div>
              )}
            </div>
          )
        })()}
      </Card>

      <Comments poll={poll} profileName={profile?.name || name || null} />

      <Toast msg={toast} />
      {isAdminMode && <AdminBar poll={poll} onUpdate={setPoll} />}
    </Layout>
  )
}

// Server-side fetch poll data
export async function getServerSideProps({ params }) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/poll/${params.id}`)
    if (!res.ok) throw new Error('Not found')
    const poll = await res.json()
    return { props: { poll } }
  } catch {
    return { props: { poll: null, error: 'Not found' } }
  }
}
