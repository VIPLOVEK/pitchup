import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../../components/Layout'
import { Card, Label, ProgressBar, Btn, Input, Pill, PlayerChip, Toast, GoalCelebration, WeatherBadge } from '../../components/UI'
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
  const [voted, setVoted] = useState(() => typeof window !== 'undefined' && !!localStorage.getItem(`mvp_voted_${poll.id}`))
  const [voterName, setVoterName] = useState('')
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
  const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]

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
        setVoted(true)
        setToast(`⭐ Voted for ${name}!`)
        setTimeout(() => setToast(''), 2500)
      }
    } catch {}
  }

  return (
    <Card>
      <Label>Man of the Match ⭐</Label>
      {topEntry && (
        <div style={{ textAlign: 'center', padding: '10px 0 14px' }}>
          <div style={{ fontSize: 28 }}>⭐</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginTop: 4 }}>{topEntry[0]}</div>
          <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{topEntry[1]} vote{topEntry[1] !== 1 ? 's' : ''}</div>
        </div>
      )}
      {voted ? (
        <p style={{ color: colors.muted, fontSize: 13, textAlign: 'center' }}>✓ Your vote is in</p>
      ) : (
        <>
          {!voterName && (
            <Input value={voterName} onChange={e => setVoterName(e.target.value)} placeholder="Your name to vote" />
          )}
          <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 10px' }}>Who stood out today?</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {allPlayers.map((p, i) => (
              <button
                key={i}
                onClick={() => castVote(p.name)}
                disabled={!voterName.trim()}
                style={{
                  background: colors.pitchMid,
                  border: `1.5px solid ${colors.grass}33`,
                  color: colors.white,
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
        </>
      )}
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
              <PlayerChip key={i} name={p.name} color={colors.cardYellow}
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
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          )}
          <Btn onClick={handleJoinWaitlist} disabled={!name.trim() || loading}>
            {loading ? 'Joining...' : '⏳ Join waitlist'}
          </Btn>
        </Card>
      )}
    </>
  )
}

// ── Confirmed game view ───────────────────────────────────────────────────────
function GameConfirmed({ poll }) {
  const { teamA = [], teamB = [] } = poll.teams || {}
  const gameTime = formatSlot(poll.game_time)
  const whatsappText = [
    `⚽ *Game is ON!* ${poll.players.length} players confirmed.`,
    ``,
    `📅 ${gameTime}`,
    `📍 ${poll.location}`,
    ``,
    `🟦 *Team A:* ${teamA.map(p => p.name).join(', ')}`,
    `🟥 *Team B:* ${teamB.map(p => p.name).join(', ')}`,
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
              {poll.score_a === poll.score_b ? 'Draw' : poll.score_a > poll.score_b ? '🟦 Team A wins' : '🟥 Team B wins'}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 28, color: colors.accent, letterSpacing: '0.1em', margin: '0 0 20px', textShadow: `0 0 20px ${colors.accent}66` }}>
            VS
          </div>
        )}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.teamA, marginBottom: 8 }}>
              🟦 Team A
            </div>
            <PositionSummary players={teamA} />
            {teamA.map((p, i) => (
              <div key={i} style={{ display: 'flex', marginBottom: 4 }}>
                <PlayerChip name={p.name} color={colors.teamA} />
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.teamB, marginBottom: 8 }}>
              🟥 Team B
            </div>
            <PositionSummary players={teamB} />
            {teamB.map((p, i) => (
              <div key={i} style={{ display: 'flex', marginBottom: 4 }}>
                <PlayerChip name={p.name} color={colors.teamB} />
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
        </div>
      </Card>
      <MvpVoting poll={poll} />
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
            🟦 Team A
          </div>
          <PositionSummary players={teamA} />
          {teamA.map((p, i) => (
            <div key={i} style={{ display: 'flex', marginBottom: 4 }}>
              <PlayerChip name={p.name} color={colors.teamA} />
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.teamB, marginBottom: 8 }}>
            🟥 Team B
          </div>
          <PositionSummary players={teamB} />
          {teamB.map((p, i) => (
            <div key={i} style={{ display: 'flex', marginBottom: 4 }}>
              <PlayerChip name={p.name} color={colors.teamB} />
            </div>
          ))}
        </div>
      </div>
    </Card>
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
      <Layout title={poll.title} description={`Game is on at ${poll.location} — ${formatSlot(poll.game_time)}.`}>
        <GameConfirmed poll={poll} />
        <WaitlistCard poll={poll} waitlist={waitlist} myEntry={myEntry} onWaitlist={onWaitlist}
          name={name} setName={setName} profile={profile}
          loading={loading} setLoading={setLoading} setToast={setToast} setPoll={setPoll} />
        <Toast msg={toast} />
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
    if (poll.status === 'cancelled') return <Layout title={poll.title}><GameCancelled poll={poll} /></Layout>

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
              {active.map((p, i) => <PlayerChip key={i} name={p.name} meta={p.guests ? `+${p.guests} guest${p.guests > 1 ? 's' : ''}` : p.positions?.length ? p.positions.join(', ') : undefined} />)}
            </div>
            {waitlist.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                {waitlist.map((p, i) => <PlayerChip key={i} name={p.name} color={colors.cardYellow} meta={p.guests ? `+${p.guests} guest${p.guests > 1 ? 's' : ''}` : undefined} />)}
              </div>
            )}
            {myEntry && (
              <Btn small variant="ghost" onClick={handleRemoveVote} disabled={loading} style={{ marginTop: 16 }}>
                Leave game
              </Btn>
            )}
          </div>
        </Card>
        {active.length >= poll.min_players && <DraftTeams poll={poll} active={active} />}
        <Toast msg={toast} />
      </Layout>
    )
  }

  return (
    <Layout title={poll.title} description={`${poll.location} · ${totalSpots}/${poll.min_players}+ players — tap to vote on a time`}>
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
          {active.map((p, i) => <PlayerChip key={i} name={p.name} meta={p.guests ? `+${p.guests} guest${p.guests > 1 ? 's' : ''}` : p.positions?.length ? p.positions.join(', ') : undefined} />)}
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
              placeholder="Your name"
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {poll.slots.map((slot, i) => (
            <button
              key={i}
              onClick={() => toggleSlot(i)}
              style={{
                background: selectedSlots.includes(i) ? colors.accent + '22' : colors.pitchMid,
                border: `1.5px solid ${selectedSlots.includes(i) ? colors.accent : colors.grass + '33'}`,
                color: selectedSlots.includes(i) ? colors.accent : colors.muted,
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
              }}
            >
              {formatSlot(slot)}
              <WeatherBadge lat={venue?.lat} lon={venue?.lon} datetime={slot} />
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn
            full
            onClick={handleVote}
            disabled={!name.trim() || selectedSlots.length === 0 || loading || kicking || (matchedPlayer && !/^\d{4,6}$/.test(pin)) || (poll.visibility === 'groups' && hasAccess === false)}
          >
            {kicking ? <>Joining <span className="kick-ball">⚽</span></> : loading ? 'Joining...' : "I'm in ⚽"}
          </Btn>
        </div>
      </Card>

      <Toast msg={toast} />
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
