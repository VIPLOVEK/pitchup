import Link from 'next/link'
import Layout from '../components/Layout'
import { Card, Label, ProgressBar, Pill } from '../components/UI'
import { colors } from '../lib/tokens'

export default function Home({ polls }) {
  const activePoll = polls.find(p => !p.closed && p.players.length < p.threshold)
  const confirmedPolls = polls.filter(p => p.closed || p.players.length >= p.threshold)

  return (
    <Layout title="PitchUp — Pickup Soccer">
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
        <div style={{ fontSize: 52, marginBottom: 12, lineHeight: 1 }}>⚽</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px', margin: '0 0 8px' }}>
          Pitch<span style={{ color: colors.accent }}>Up</span>
        </h1>
        <p style={{ color: colors.muted, fontSize: 14, margin: 0 }}>
          Pickup soccer, organized.
        </p>
      </div>

      {/* Active poll */}
      {activePoll ? (
        <Link href={`/poll/${activePoll.id}`} style={{ textDecoration: 'none' }}>
          <Card style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}>
            <Label>Active poll — tap to vote</Label>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>
              {activePoll.title}
            </h2>
            <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 12px' }}>{activePoll.location}</p>
            <ProgressBar value={activePoll.players.length} max={activePoll.threshold} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ color: colors.muted, fontSize: 13 }}>
                {activePoll.players.length} / {activePoll.threshold} players
              </span>
              <span style={{ color: colors.accent, fontSize: 13, fontWeight: 700 }}>Vote →</span>
            </div>
          </Card>
        </Link>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0', color: colors.muted }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
            <p style={{ fontSize: 14 }}>No active poll right now.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Ask your organizer to create one.</p>
          </div>
        </Card>
      )}

      {/* Confirmed games */}
      {confirmedPolls.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.muted, marginBottom: 12 }}>
            Recent games
          </div>
          {confirmedPolls.slice(0, 3).map(poll => (
            <Link key={poll.id} href={`/poll/${poll.id}`} style={{ textDecoration: 'none' }}>
              <Card style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{poll.title}</div>
                    <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{poll.location}</div>
                  </div>
                  <Pill color={colors.accent}>✅ {poll.players.length} players</Pill>
                </div>
              </Card>
            </Link>
          ))}
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
            Create your first poll →
          </Link>
        </div>
      )}
    </Layout>
  )
}

export async function getServerSideProps() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/admin/polls`, {
      headers: { authorization: `Bearer ${process.env.ADMIN_PASSWORD}` },
    })
    if (!res.ok) return { props: { polls: [] } }
    const polls = await res.json()
    return { props: { polls } }
  } catch {
    return { props: { polls: [] } }
  }
}
