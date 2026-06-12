import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../../components/Layout'
import { Card, Label, ProgressBar, Btn, Input, Pill, PlayerChip, Toast } from '../../components/UI'
import { colors } from '../../lib/tokens'
import { formatSlot, getActivePlayers, getWaitlist } from '../../lib/teams'
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
      </Card>

      <Card>
        <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 28, color: colors.accent, letterSpacing: '0.1em', margin: '0 0 20px', textShadow: `0 0 20px ${colors.accent}66` }}>
          VS
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.teamA, marginBottom: 8 }}>
              🟦 Team A
            </div>
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
    </div>
  )
}

// ── Main vote page ────────────────────────────────────────────────────────────
export default function PollPage({ poll: initialPoll, error }) {
  const router = useRouter()
  const [poll, setPoll] = useState(initialPoll)
  const [name, setName] = useState('')
  const [profile, setProfile] = useState(null)
  const [selectedSlots, setSelectedSlots] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('pitchup_player')
    if (!saved) return
    const p = JSON.parse(saved)
    setProfile(p)
    setName(p.name)
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

  if (poll.status === 'confirmed') {
    return (
      <Layout title={poll.title} description={`Game is on at ${poll.location} — ${formatSlot(poll.game_time)}.`}>
        <GameConfirmed poll={poll} />
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

  const handleVote = async () => {
    if (!name.trim() || selectedSlots.length === 0) return
    setLoading(true)
    try {
      const res = await fetch(`/api/poll/${poll.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slots: selectedSlots,
          playerId: profile?.id || null,
          position: profile?.position || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPoll(data)
      setSubmitted(true)
    } catch (e) {
      setToast(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    if (poll.status === 'confirmed') return <Layout title={poll.title}><GameConfirmed poll={poll} /></Layout>
    if (poll.status === 'cancelled') return <Layout title={poll.title}><GameCancelled poll={poll} /></Layout>

    const active = getActivePlayers(poll)
    const waitlist = getWaitlist(poll)
    const myIndex = poll.players.findIndex(p => p.name.toLowerCase() === name.trim().toLowerCase())
    const onWaitlist = myIndex >= poll.max_players

    return (
      <Layout title={poll.title}>
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>{onWaitlist ? '⏳' : '✅'}</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
              {onWaitlist ? "You're on the waiting list" : "You're in!"}
            </h2>
            <p style={{ color: colors.muted, fontSize: 13 }}>
              {onWaitlist
                ? `The first ${poll.max_players} spots are full — you'll be added automatically if someone drops out.`
                : `We'll send the game details once we have ${poll.min_players}+ players confirmed (and it's at least 4 hours before kickoff).`}
            </p>
            <ProgressBar value={active.length} max={poll.min_players} />
            <p style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
              {active.length} / {poll.min_players}+ confirmed · {poll.max_players} max
              {waitlist.length > 0 ? ` · ${waitlist.length} waiting` : ''}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
              {active.map((p, i) => <PlayerChip key={i} name={p.name} meta={p.position !== 'Any' ? p.position : undefined} />)}
            </div>
            {waitlist.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                {waitlist.map((p, i) => <PlayerChip key={i} name={p.name} color={colors.muted} />)}
              </div>
            )}
          </div>
        </Card>
        <Toast msg={toast} />
      </Layout>
    )
  }

  const active = getActivePlayers(poll)
  const waitlist = getWaitlist(poll)

  return (
    <Layout title={poll.title} description={`${poll.location} · ${active.length}/${poll.min_players}+ players — tap to vote on a time`}>
      <Card>
        <Label>Open poll</Label>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>{poll.title}</h1>
        <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 4px' }}>{poll.location} · Need {poll.min_players}+ players</p>
        <div style={{ margin: '0 0 12px' }}>
          <VenueInfo location={poll.location} />
        </div>
        <ProgressBar value={active.length} max={poll.min_players} />
        <p style={{ color: colors.muted, fontSize: 13, margin: '4px 0 16px' }}>
          {active.length} / {poll.min_players}+ confirmed · {poll.max_players} max
          {waitlist.length > 0 ? ` · ${waitlist.length} waiting` : ''}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {active.map((p, i) => <PlayerChip key={i} name={p.name} meta={p.position !== 'Any' ? p.position : undefined} />)}
        </div>
        {waitlist.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.muted, margin: '10px 0 6px' }}>
              Waiting list
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {waitlist.map((p, i) => <PlayerChip key={i} name={p.name} color={colors.muted} />)}
            </div>
          </>
        )}
      </Card>

      <Card>
        <Label>Join the game</Label>
        {profile ? (
          <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 10px' }}>
            Voting as <strong style={{ color: colors.white }}>{profile.name}</strong> ({profile.position}) ·{' '}
            <Link href="/profile" style={{ color: colors.accent, textDecoration: 'underline' }}>Not you?</Link>
          </p>
        ) : (
          <>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 10px' }}>
              <Link href="/profile" style={{ color: colors.accent, textDecoration: 'underline' }}>Create a profile</Link> to save your name and position for next time.
            </p>
          </>
        )}
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
              }}
            >
              {formatSlot(slot)}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn
            full
            onClick={handleVote}
            disabled={!name.trim() || selectedSlots.length === 0 || loading}
          >
            {loading ? 'Joining...' : "I'm in ⚽"}
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
