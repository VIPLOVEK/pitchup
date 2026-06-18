import Link from 'next/link'
import Layout from '../components/Layout'
import { Card, Label, ProgressBar, Pill } from '../components/UI'
import { colors, radius } from '../lib/tokens'
import { getActivePlayers } from '../lib/teams'

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

export default function Home({ polls, groups }) {
  const openPolls = polls.filter(p => p.status === 'open')
  const pastPolls = polls.filter(p => p.status !== 'open')

  return (
    <Layout title="PitchUp — Pickup Soccer">
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
        <p style={{ color: colors.muted, fontSize: 13, maxWidth: 380, margin: '0 auto', lineHeight: 1.5 }}>
          Vote on game times, see who's in, and join us on the pitch — all skill levels welcome.
        </p>
      </div>

      {/* All open polls */}
      {openPolls.length > 0 ? (
        openPolls.map(poll => (
          <Link key={poll.id} href={`/poll/${poll.id}`} style={{ textDecoration: 'none' }}>
            <Card highlight style={{ cursor: 'pointer', ...groupAccent(poll, groups) }} className="card-link">
              <Label>Active poll — tap to vote</Label>
              <GroupBadges poll={poll} groups={groups} />
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                {poll.title}
              </h2>
              <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 12px' }}>{poll.location}</p>
              <ProgressBar value={getActivePlayers(poll).length} max={poll.min_players} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ color: colors.muted, fontSize: 13 }}>
                  {getActivePlayers(poll).length} / {poll.min_players}+ players
                </span>
                <span style={{ color: colors.accent, fontSize: 13, fontWeight: 700 }}>Vote →</span>
              </div>
            </Card>
          </Link>
        ))
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0', color: colors.muted }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
            <p style={{ fontSize: 14 }}>No active poll right now.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Ask your organizer to create one.</p>
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
              🏆 Leaderboard
            </Link>
          </div>
          {pastPolls.slice(0, 3).map(poll => (
            <Link key={poll.id} href={`/poll/${poll.id}`} style={{ textDecoration: 'none' }}>
              <Card style={{ cursor: 'pointer', ...groupAccent(poll, groups) }} className="card-link">
                <GroupBadges poll={poll} groups={groups} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{poll.title}</div>
                    <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{poll.location}</div>
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
    if (!res.ok) return { props: { polls: [], groups: [] } }
    const polls = await res.json()

    const groupsRes = await fetch(`${baseUrl}/api/groups`)
    const groups = groupsRes.ok ? await groupsRes.json() : []

    return { props: { polls, groups } }
  } catch {
    return { props: { polls: [], groups: [] } }
  }
}
