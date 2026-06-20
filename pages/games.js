import Link from 'next/link'
import Layout from '../components/Layout'
import { Card, Label, Pill } from '../components/UI'
import { colors } from '../lib/tokens'
import { formatSlot } from '../lib/teams'

export default function GamesPage({ polls }) {
  const confirmed = polls.filter(p => p.status === 'confirmed')
  const cancelled = polls.filter(p => p.status === 'cancelled')

  return (
    <Layout title="All Games — PitchUp" description="Full game history for PitchUp pickup soccer.">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href="/" style={{ color: colors.muted, fontSize: 13, textDecoration: 'none' }}>← Home</Link>
        <Link href="/leaderboard" style={{ color: colors.accent, fontSize: 13, fontWeight: 700, textDecoration: 'none', marginLeft: 'auto' }}>🏆 Rankings</Link>
      </div>

      <Card>
        <Label>{confirmed.length} confirmed game{confirmed.length !== 1 ? 's' : ''}</Label>
        {confirmed.length === 0 && (
          <p style={{ color: colors.muted, fontSize: 14, textAlign: 'center', margin: 0 }}>No confirmed games yet.</p>
        )}
        {confirmed.map((poll, i) => (
          <Link key={poll.id} href={`/poll/${poll.id}`} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: i < confirmed.length - 1 ? `1px solid ${colors.grass}22` : 'none',
              cursor: 'pointer',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: colors.white }}>{poll.title}</div>
                <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  {poll.game_time ? formatSlot(poll.game_time) : poll.location}
                  {poll.game_time && <span style={{ marginLeft: 6 }}>· {poll.location}</span>}
                </div>
                <div style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>
                  👥 {(poll.players || []).length} players
                </div>
              </div>
              {poll.score_a != null && poll.score_b != null ? (
                <Pill color={colors.accent}>⚽ {poll.score_a}–{poll.score_b}</Pill>
              ) : (
                <Pill color={colors.cardGreen}>✅ Confirmed</Pill>
              )}
            </div>
          </Link>
        ))}
      </Card>

      {cancelled.length > 0 && (
        <Card>
          <Label>{cancelled.length} cancelled game{cancelled.length !== 1 ? 's' : ''}</Label>
          {cancelled.map((poll, i) => (
            <Link key={poll.id} href={`/poll/${poll.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: i < cancelled.length - 1 ? `1px solid ${colors.grass}22` : 'none',
                cursor: 'pointer',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: colors.muted }}>{poll.title}</div>
                  <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    {poll.location} · {(poll.players || []).length}/{poll.min_players} players
                  </div>
                </div>
                <Pill color={colors.danger}>❌ Cancelled</Pill>
              </div>
            </Link>
          ))}
        </Card>
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
    const all = await res.json()
    const polls = all
      .filter(p => p.status !== 'open')
      .sort((a, b) => new Date(b.game_time || b.created_at) - new Date(a.game_time || a.created_at))
    return { props: { polls } }
  } catch {
    return { props: { polls: [] } }
  }
}
