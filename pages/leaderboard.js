import Layout from '../components/Layout'
import { Card, Label, Pill, Spinner } from '../components/UI'
import { colors } from '../lib/tokens'

const medal = (rank) => rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : null

export default function Leaderboard({ leaderboard, error }) {
  return (
    <Layout title="Leaderboard — PitchUp">
      <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 6px' }}>
          🏆 Leaderboard
        </h1>
        <p style={{ color: colors.muted, fontSize: 13, margin: 0 }}>
          Win/loss record from confirmed games with a final score.
        </p>
      </div>

      {error && (
        <Card><p style={{ color: colors.danger, fontSize: 13 }}>{error}</p></Card>
      )}

      {!error && leaderboard === null && (
        <Card><Spinner label="Loading leaderboard..." /></Card>
      )}

      {!error && leaderboard !== null && leaderboard.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', color: colors.muted, padding: '20px 0', fontSize: 14 }}>
            No game results yet — scores are recorded from the admin panel after a game.
          </div>
        </Card>
      )}

      {!error && leaderboard && leaderboard.length > 0 && (
        <Card>
          <Label>{leaderboard.length} player{leaderboard.length === 1 ? '' : 's'}</Label>
          {leaderboard.map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: `1px solid ${colors.grass}22`, gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 24, textAlign: 'center', fontSize: 16 }}>{medal(i) || i + 1}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    {p.wins}W - {p.losses}L - {p.draws}D · {p.gamesPlayed} game{p.gamesPlayed === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
              <Pill color={colors.accent}>{Math.round(p.winPct * 100)}%</Pill>
            </div>
          ))}
        </Card>
      )}
    </Layout>
  )
}

export async function getServerSideProps() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/leaderboard`)
    if (!res.ok) return { props: { leaderboard: null, error: 'Failed to load leaderboard' } }
    const leaderboard = await res.json()
    return { props: { leaderboard } }
  } catch {
    return { props: { leaderboard: null, error: 'Failed to load leaderboard' } }
  }
}
