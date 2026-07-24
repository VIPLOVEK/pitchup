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
          Not enough players joined ({(poll.players || []).length}/{poll.min_players} minimum) — game is off.
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
  const { teamA = [], teamB = [] } = poll.teams || {}
  const myName = myEntry?.name || profile?.name || name
  const noSplit = poll.no_team_split || false
  const myTeam = !noSplit && poll.status === 'confirmed' && myName
    ? teamA.some(p => p.name === myName) ? 'A' : teamB.some(p => p.name === myName) ? 'B' : null
    : null
  const nameA = poll.team_a_name || 'Team A'
  const nameB = poll.team_b_name || 'Team B'
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
            {!onWaitlist && myTeam && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: myTeam === 'A' ? 'rgba(96,165,250,0.1)' : 'rgba(248,113,113,0.1)',
                border: `1px solid ${myTeam === 'A' ? 'rgba(96,165,250,0.3)' : 'rgba(248,113,113,0.3)'}`,
                borderRadius: 20, padding: '5px 12px', marginTop: 4,
              }}>
                <span style={{ fontSize: 13 }}>{myTeam === 'A' ? '⚪' : '🎨'}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: myTeam === 'A' ? colors.teamA : colors.teamB }}>
                  {myTeam === 'A' ? nameA : nameB}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>·</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                  {myTeam === 'A' ? 'White' : 'Colors'}
                </span>
              </div>
            )}
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
const REACTIONS = ['⚽', '🔥', '👏', '😂', '💪']

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

  async function react(commentIndex, emoji) {
    if (!name.trim()) return
    // Optimistic update
    setComments(prev => {
      const next = [...prev]
      const c = { ...next[commentIndex] }
      const reactions = { ...(c.reactions || {}) }
      const reactors = reactions[emoji] || []
      const nameLc = name.trim().toLowerCase()
      const already = reactors.some(r => r.toLowerCase() === nameLc)
      reactions[emoji] = already
        ? reactors.filter(r => r.toLowerCase() !== nameLc)
        : [...reactors, name.trim()]
      if (reactions[emoji].length === 0) delete reactions[emoji]
      c.reactions = reactions
      next[commentIndex] = c
      return next
    })
    try {
      const res = await fetch(`/api/poll/${poll.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), commentIndex, emoji }),
      })
      if (res.ok) setComments(await res.json())
    } catch {}
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
      {comments.map((c, i) => {
        const hasAnyReaction = c.reactions && Object.values(c.reactions).some(r => r.length > 0)
        return (
          <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < comments.length - 1 ? `1px solid ${colors.grass}22` : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: colors.accent }}>{c.name}</span>
              <span style={{ fontSize: 11, color: colors.muted }}>{formatTs(c.ts)}</span>
            </div>
            <div style={{ fontSize: 13, color: colors.white, lineHeight: 1.5 }}>{renderMentions(c.text)}</div>
            {/* Reaction strip */}
            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              {REACTIONS.map(emoji => {
                const reactors = c.reactions?.[emoji] || []
                const reacted = name.trim() && reactors.some(r => r.toLowerCase() === name.trim().toLowerCase())
                const hasCount = reactors.length > 0
                if (!hasAnyReaction && !name.trim()) return null
                return (
                  <button
                    key={emoji}
                    onClick={() => react(i, emoji)}
                    title={reactors.length ? reactors.join(', ') : undefined}
                    style={{
                      background: reacted ? `${colors.accent}22` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${reacted ? colors.accent + '44' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 20,
                      padding: '2px 7px',
                      fontSize: 14,
                      lineHeight: 1.4,
                      cursor: name.trim() ? 'pointer' : 'default',
                      color: reacted ? colors.accent : colors.muted,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      opacity: hasCount ? 1 : 0.35,
                      transition: 'all 0.15s',
                    }}
                  >
                    {emoji}
                    {hasCount && (
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{reactors.length}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
      <form onSubmit={submit} style={{ marginTop: 8 }}>
        {!name.trim() && (
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name (required to send or react)"
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

// ── Confirmed game opt-out (name-only voters who have no saved profile) ──────
function ConfirmedOptOut({ poll, loading, setLoading, setToast, setPoll }) {
  const [open, setOpen] = useState(false)
  const [inputName, setInputName] = useState('')

  const active = getActivePlayers(poll)
  const match = inputName.trim()
    ? active.find(p => p.name.toLowerCase() === inputName.trim().toLowerCase())
    : null
  const notFound = inputName.trim().length > 1 && !match

  const leave = async () => {
    if (!match) return
    if (!window.confirm(`Remove ${match.name} from the squad? If there's a waitlist, the next player will be promoted automatically.`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/poll/${poll.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: match.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPoll(data)
      setToast("You've left the game — sorry to miss you 👋")
      setTimeout(() => setToast(''), 3500)
      setOpen(false)
    } catch (e) {
      setToast(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <div style={{ textAlign: 'center', margin: '-4px 0 16px' }}>
        <button
          onClick={() => setOpen(true)}
          style={{ background: 'none', border: 'none', color: colors.muted, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Can't make it anymore?
        </button>
      </div>
    )
  }

  return (
    <Card style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
      <Label>Can't make it?</Label>
      <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 10px' }}>
        Enter the name you signed up with to remove yourself from the squad.
        {active.length > 0 && ' The next player on the waitlist will be promoted automatically.'}
      </p>
      <Input
        value={inputName}
        onChange={e => setInputName(e.target.value)}
        placeholder="Your name..."
        autoFocus
      />
      {notFound && (
        <p style={{ color: colors.muted, fontSize: 12, margin: '-4px 0 8px' }}>
          "{inputName}" isn't in the active squad.
        </p>
      )}
      {match && (
        <>
          <p style={{ color: colors.grassLight, fontSize: 13, margin: '0 0 12px' }}>
            ✓ Found you — {match.name}
          </p>
          <Btn variant="danger" full onClick={leave} disabled={loading}>
            {loading ? 'Removing...' : "I can't make it — remove me from the squad"}
          </Btn>
        </>
      )}
      <button
        onClick={() => { setOpen(false); setInputName('') }}
        style={{ background: 'none', border: 'none', color: colors.muted, fontSize: 12, cursor: 'pointer', marginTop: 10, display: 'block' }}
      >
        Cancel
      </button>
    </Card>
  )
}

// ── Confirmed game view ───────────────────────────────────────────────────────
function GameConfirmed({ poll, profile }) {
  const noSplit = poll.no_team_split || false
  const { teamA = [], teamB = [] } = poll.teams || {}
  const squad = noSplit ? teamA : []
  const nameA = poll.team_a_name || 'Team A'
  const nameB = poll.team_b_name || 'Team B'
  const gameTime = formatSlot(poll.game_time)
  const whatsappText = noSplit ? [
    `⚽ *Game is ON!* ${(poll.players || []).length} players confirmed.`,
    ``,
    `📅 ${gameTime}`,
    `📍 ${poll.location}`,
    poll.opponent ? `🆚 vs ${poll.opponent}` : '',
    ``,
    `👥 *Squad*: ${squad.map(p => p.name).join(', ')}`,
    ``,
    `See you on the pitch! 🏃`,
  ].filter(l => l !== undefined).join('\n') : [
    `⚽ *Game is ON!* ${(poll.players || []).length} players confirmed.`,
    ``,
    `📅 ${gameTime}`,
    `📍 ${poll.location}`,
    ``,
    `⚪ *${nameA}*: ${teamA.map(p => p.name).join(', ')}`,
    `🎨 *${nameB}*: ${teamB.map(p => p.name).join(', ')}`,
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
          <Pill color={colors.grassLight}>👥 {(poll.players || []).length} players</Pill>
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
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: poll.score_a > poll.score_b ? colors.grassLight : colors.muted }}>{poll.score_a}</span>
                {noSplit && <div style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>Us</div>}
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: colors.muted }}>—</span>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: poll.score_b > poll.score_a ? colors.teamB : colors.muted }}>{poll.score_b}</span>
                {noSplit && <div style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>{poll.opponent || 'Them'}</div>}
              </div>
            </div>
            <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
              {noSplit
                ? poll.score_a === poll.score_b ? 'Draw' : poll.score_a > poll.score_b ? '🏆 Win!' : '💪 Good effort'
                : poll.score_a === poll.score_b ? 'Draw' : poll.score_a > poll.score_b ? `⚪ ${nameA} wins` : `🎨 ${nameB} wins`}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 28, color: colors.accent, letterSpacing: '0.1em', margin: '0 0 20px', textShadow: `0 0 20px ${colors.accent}66` }}>
            {noSplit && poll.opponent ? `vs ${poll.opponent}` : 'VS'}
          </div>
        )}
        {(poll.goals || []).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: colors.muted, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
              ⚽ GOAL SCORERS
            </div>
            {noSplit ? (
              <div style={{ fontSize: 13 }}>
                {(poll.goals || []).map((g, i) => (
                  <span key={i}>
                    {i > 0 && ', '}
                    {g.name}
                    {g.assist && <span style={{ color: colors.muted, fontWeight: 400 }}> (↗ {g.assist})</span>}
                  </span>
                ))}
              </div>
            ) : (
              ['A', 'B'].map(team => {
                const teamGoals = (poll.goals || []).filter(g => g.team === team)
                if (!teamGoals.length) return null
                return (
                  <div key={team} style={{ fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: team === 'A' ? colors.teamA : colors.teamB, fontWeight: 700, marginRight: 6 }}>
                      {team === 'A' ? '⚪' : '🎨'}
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
              })
            )}
          </div>
        )}
        {noSplit ? (
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.grassLight, marginBottom: 8 }}>
              👥 Squad
            </div>
            <PositionSummary players={squad} />
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {squad.map((p, i) => (
                <div key={i} style={{ marginBottom: 4, marginRight: 4 }}>
                  <PlayerChip name={p.name} color={colors.grassLight} avatar={p.avatar_url} />
                </div>
              ))}
            </div>
          </div>
        ) : (
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.teamA, marginBottom: 2 }}>
              {nameA}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>⚪ White</div>
            <PositionSummary players={teamA} />
            {teamA.map((p, i) => (
              <div key={i} style={{ display: 'flex', marginBottom: 4 }}>
                <PlayerChip name={p.name} color={colors.teamA} avatar={p.avatar_url} />
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.teamB, marginBottom: 2 }}>
              {nameB}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>🎨 Colors</div>
            <PositionSummary players={teamB} />
            {teamB.map((p, i) => (
              <div key={i} style={{ display: 'flex', marginBottom: 4 }}>
                <PlayerChip name={p.name} color={colors.teamB} avatar={p.avatar_url} />
              </div>
            ))}
          </div>
        </div>
        )}

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
  const noSplit = poll.no_team_split || false
  const expanded = expandWithGuests(active)
  const teams = poll.teams || getDraftTeams(expanded)
  const { teamA = [], teamB = [] } = teams
  const nameA = poll.team_a_name || 'Team A'
  const nameB = poll.team_b_name || 'Team B'
  const isConfirmed = poll.status === 'confirmed'

  if (noSplit) {
    const squad = isConfirmed ? teamA : expanded
    return (
      <Card>
        <Label>Squad</Label>
        {!isConfirmed && (
          <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 14px' }}>
            No team split — everyone plays together as one squad.
          </p>
        )}
        <PositionSummary players={squad} />
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {squad.map((p, i) => (
            <div key={i} style={{ marginBottom: 4, marginRight: 4 }}>
              <PlayerChip name={p.name} color={colors.grassLight} avatar={p.avatar_url} />
            </div>
          ))}
        </div>
      </Card>
    )
  }

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
            {nameA}
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
            {nameB}
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
  const [open, setOpen] = useState(false)

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
      if (res.ok) { onUpdate(await res.json()); setOpen(false) }
    } finally { setLoading(false) }
  }

  const isOpen = poll.status === 'open'
  const isConfirmed = poll.status === 'confirmed'
  const isCancelled = poll.status === 'cancelled'
  const noSplit = poll.no_team_split || false

  const actionBtnStyle = {
    background: 'rgba(255,255,255,0.05)',
    color: colors.white,
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'background 0.15s',
  }

  return (
    <>
      {/* Backdrop to close on outside tap */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 298 }}
        />
      )}

      {/* Popup panel — appears above the FAB */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 106,
          right: 16,
          zIndex: 299,
          background: 'rgba(8, 18, 42, 0.97)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border: `1px solid rgba(240,192,48,0.25)`,
          borderRadius: 18,
          padding: '14px 14px 10px',
          minWidth: 200,
          boxShadow: '0 12px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(240,192,48,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: colors.accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, paddingLeft: 2 }}>
            Admin controls
          </div>

          {isCancelled && (
            <button onClick={() => doAction('reopen')} disabled={loading} style={{ ...actionBtnStyle, background: `${colors.grassLight}18`, color: colors.grassLight, border: `1px solid ${colors.grassLight}33` }}>
              🔄 Reopen game
            </button>
          )}
          {isOpen && (
            <button onClick={() => doAction('close')} disabled={loading} style={{ ...actionBtnStyle, background: `${colors.accent}18`, color: colors.accent, border: `1px solid ${colors.accent}33` }}>
              ✅ Confirm game
            </button>
          )}
          {isConfirmed && !noSplit && (
            <button onClick={() => doAction('shuffle')} disabled={loading} style={actionBtnStyle}>
              🔀 Reshuffle teams
            </button>
          )}
          {!noSplit && (
            <button onClick={() => doAction('randomizeNames')} disabled={loading} style={actionBtnStyle}>
              🎲 New team names
            </button>
          )}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />

          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            style={{ color: colors.muted, fontSize: 12, fontWeight: 600, padding: '6px 2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            All admin controls
            <span style={{ opacity: 0.5 }}>→</span>
          </Link>
        </div>
      )}

      {/* Floating admin FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Admin controls"
        style={{
          position: 'fixed',
          bottom: 100,
          right: 16,
          zIndex: 299,
          width: 46,
          height: 46,
          borderRadius: '50%',
          background: open
            ? colors.accent
            : 'rgba(8, 18, 42, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1.5px solid ${open ? colors.accent : 'rgba(240,192,48,0.4)'}`,
          color: open ? colors.pitch : colors.accent,
          fontSize: open ? 16 : 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: open
            ? `0 4px 20px ${colors.accent}55`
            : '0 4px 20px rgba(0,0,0,0.5)',
          transition: 'all 0.2s ease',
        }}
      >
        {open ? '✕' : '⚙'}
      </button>
    </>
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
  const [guestTerms, setGuestTerms] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('pitchup_terms_accepted')
  })
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

  // Pre-populate slots when the player already has an entry (allows changing vote).
  // Use a ref so realtime poll updates don't clobber in-progress slot changes.
  const slotsSeededRef = useRef(false)
  useEffect(() => {
    if (slotsSeededRef.current) return
    const entry = (poll?.players || []).find(p =>
      profile ? p.playerId === profile.id : (name.trim() && p.name.toLowerCase() === name.trim().toLowerCase())
    )
    if (entry?.slots?.length) {
      setSelectedSlots(entry.slots)
      slotsSeededRef.current = true
    }
  }, [poll?.players, profile?.id, name])

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
  const myEntry = (poll.players || []).find(p => profile
    ? p.playerId === profile.id
    : (name.trim() && p.name.toLowerCase() === name.trim().toLowerCase()))
  const onWaitlist = !!myEntry && waitlist.some(p => p.name.toLowerCase() === myEntry.name.toLowerCase())

  if (poll.status === 'confirmed') {
    return (
      <Layout title={poll.title} description={`Game is on at ${poll.location} — ${formatSlot(poll.game_time)}.`} ogImageUrl={ogImageUrl}>
        <GameConfirmed poll={poll} profile={profile} />
        {/* Profile users: WaitlistCard shows their status + leave button via myEntry */}
        {(profile || myEntry) ? (
          <WaitlistCard poll={poll} waitlist={waitlist} myEntry={myEntry} onWaitlist={onWaitlist}
            name={name} setName={setName} profile={profile}
            loading={loading} setLoading={setLoading} setToast={setToast} setPoll={setPoll} />
        ) : (
          /* Name-only voters: self-contained opt-out with name identification */
          <ConfirmedOptOut poll={poll} loading={loading} setLoading={setLoading} setToast={setToast} setPoll={setPoll} />
        )}
        <Toast msg={toast} />
        {isAdminMode && <AdminBar poll={poll} onUpdate={setPoll} />}
      </Layout>
    )
  }

  if (poll.status === 'cancelled') {
    return (
      <Layout title={poll.title} description={`Cancelled — not enough players joined (${(poll.players || []).length}/${poll.min_players} minimum).`}>
        <GameCancelled poll={poll} />
        <Toast msg={toast} />
        {isAdminMode && <AdminBar poll={poll} onUpdate={setPoll} />}
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
                ? `All ${poll.max_players} spots are taken — you're next in line and will be moved up automatically if someone drops out.`
                : totalSpots >= poll.min_players
                  ? `The squad is full! The organiser will lock in the time and you'll get a notification with all the details.`
                  : `Still filling up. Once ${poll.min_players}+ players join, the organiser gets notified and confirms the time — you'll hear back!`}
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
                Know someone who should play? Send them the link!
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
        <Label>{poll.game_type === 'watch_party' ? 'Watch Party — RSVP below' : 'Open game — join below'}</Label>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>{poll.title}</h1>
          {poll.game_type === 'practice' && <span style={{ fontSize: 11, fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 20, padding: '2px 8px', flexShrink: 0 }}>🏃 Practice</span>}
          {poll.game_type === 'competition' && <span style={{ fontSize: 11, fontWeight: 700, color: '#facc15', background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 20, padding: '2px 8px', flexShrink: 0 }}>🏆 Competition</span>}
          {poll.game_type === 'watch_party' && <span style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 20, padding: '2px 8px', flexShrink: 0 }}>📺 Watch Party</span>}
        </div>
        {poll.opponent && (
          <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: poll.game_type === 'competition' ? '#facc15' : '#fb923c' }}>vs {poll.opponent}</p>
        )}
        <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 4px' }}>{poll.location} · {poll.game_type === 'watch_party' ? `Max ${poll.max_players} spots` : `Need ${poll.min_players}+ players`}</p>
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
          <Label>You're in ✅</Label>
          <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 12px' }}>
            You're registered as <strong style={{ color: colors.white }}>{myEntry.name}</strong>. You can update your available times or leave the game below.
          </p>
          <Btn small variant="ghost" onClick={handleRemoveVote} disabled={loading}>
            Can't make it anymore
          </Btn>
        </Card>
      )}

      <Card>
        <Label>{myEntry ? 'Update your availability' : poll.game_type === 'watch_party' ? 'RSVP for the watch party' : 'Join the game'}</Label>
        {profile ? (
          <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 10px' }}>
            Voting as <strong style={{ color: colors.white }}>{profile.name}</strong> ({profile.positions?.length ? profile.positions.join(', ') : 'Any'}) ·{' '}
            <Link href="/profile" style={{ color: colors.accent, textDecoration: 'underline' }}>Not you?</Link>
          </p>
        ) : (
          <>
            <p style={{ color: colors.white, fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>👋 First, who are you?</p>
            <Input
              value={name}
              onChange={e => { setName(e.target.value); setPin('') }}
              placeholder="Type your name..."
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
                  placeholder={`Enter your PIN to confirm it's you`}
                  type="password"
                />
                <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 10px' }}>
                  We recognise "{matchedPlayer.name}" — enter your PIN to join as them.
                </p>
              </>
            ) : (
              <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 10px' }}>
                <Link href="/profile" style={{ color: colors.accent, textDecoration: 'underline' }}>Set up a profile</Link> to save your name and get notified about future games.
              </p>
            )}
          </>
        )}
        <p style={{ color: colors.white, fontSize: 13, fontWeight: 600, margin: '16px 0 6px' }}>Bringing anyone?</p>
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
        <p style={{ color: colors.white, fontSize: 13, fontWeight: 600, margin: '16px 0 2px' }}>📅 When are you free?</p>
        <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 10px' }}>Tick all times that work — the most popular slot gets confirmed.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(() => {
            return poll.slots.map((slot, i) => {
              const voters = (poll.players || []).filter(p => (p.slots || []).includes(i))
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
        {!profile && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={guestTerms}
              onChange={e => {
                setGuestTerms(e.target.checked)
                if (e.target.checked) localStorage.setItem('pitchup_terms_accepted', '1')
                else localStorage.removeItem('pitchup_terms_accepted')
              }}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span style={{ fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>
              I confirm I am 18+, fit to play contact sport, and understand that participation is at my own risk. PitchUp accepts no liability for injury or loss.{' '}
              <a href="/terms" style={{ color: colors.muted, textDecoration: 'underline' }}>Full terms</a>
            </span>
          </label>
        )}
        <div style={{ marginTop: 14 }}>
          <Btn
            full
            onClick={handleVote}
            disabled={!name.trim() || selectedSlots.length === 0 || loading || kicking || (matchedPlayer && !/^\d{4,6}$/.test(pin)) || (poll.visibility === 'groups' && hasAccess === false) || (!profile && !guestTerms)}
            style={{ padding: '16px 20px', fontSize: 17, borderRadius: 12 }}
          >
            {kicking ? <>Joining <span className="kick-ball">{poll.game_type === 'watch_party' ? '📺' : '⚽'}</span></> : loading ? 'Joining...' : poll.game_type === 'watch_party' ? "I'm in — count me 📺" : "I'm in — count me ⚽"}
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
