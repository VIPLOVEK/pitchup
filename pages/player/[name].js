import Link from 'next/link'
import Layout from '../../components/Layout'
import { Card, Label, Pill } from '../../components/UI'
import { colors } from '../../lib/tokens'
import { formatSlot } from '../../lib/teams'

export default function PlayerPage({ player, error }) {
  if (error || !player) {
    return (
      <Layout title="Player not found">
        <Card>
          <div style={{ textAlign: 'center', padding: 30, color: colors.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p>Player not found.</p>
            <Link href="/leaderboard" style={{ color: colors.accent }}>← Leaderboard</Link>
          </div>
        </Card>
      </Layout>
    )
  }

  const gamesPlayed = player.wins + player.losses + player.draws
  const winPct = gamesPlayed ? Math.round((player.wins / gamesPlayed) * 100) : 0

  return (
    <Layout title={`${player.name} — Stats`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href="/leaderboard" style={{ color: colors.muted, fontSize: 13, textDecoration: 'none' }}>← Leaderboard</Link>
      </div>

      <Card highlight>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>👤</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.5px' }}>{player.name}</h1>
          <p style={{ color: colors.muted, fontSize: 13, margin: 0 }}>{gamesPlayed} game{gamesPlayed !== 1 ? 's' : ''} played</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Pill color={colors.cardGreen}>{player.wins}W</Pill>
          <Pill color={colors.danger}>{player.losses}L</Pill>
          <Pill color={colors.cardYellow}>{player.draws}D</Pill>
          <Pill color={colors.accent}>{winPct}% win rate</Pill>
          {player.goals > 0 && <Pill color={colors.grassLight}>⚽ {player.goals} goal{player.goals !== 1 ? 's' : ''}</Pill>}
        </div>
      </Card>

      {player.games.length === 0 ? (
        <Card>
          <p style={{ color: colors.muted, fontSize: 14, textAlign: 'center', margin: 0 }}>No scored games yet.</p>
        </Card>
      ) : (
        <Card>
          <Label>Game history</Label>
          {player.games.map((g, i) => (
            <Link key={i} href={`/poll/${g.pollId}`} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < player.games.length - 1 ? `1px solid ${colors.grass}22` : 'none' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.white }}>{g.title}</div>
                  <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    {formatSlot(g.date)} · {g.team === 'A' ? '🟦 Team A' : '🟥 Team B'}
                    {g.goals > 0 && <span style={{ color: colors.grassLight, marginLeft: 6 }}>⚽ {g.goals} goal{g.goals !== 1 ? 's' : ''}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Pill color={g.result === 'win' ? colors.cardGreen : g.result === 'loss' ? colors.danger : colors.cardYellow}>
                    {g.result === 'win' ? 'W' : g.result === 'loss' ? 'L' : 'D'}
                  </Pill>
                  <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{g.scoreA}–{g.scoreB}</div>
                </div>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </Layout>
  )
}

export async function getServerSideProps({ params }) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/player-stats?name=${encodeURIComponent(params.name)}`)
    if (!res.ok) return { props: { error: true } }
    const player = await res.json()
    if (player.error) return { props: { error: true } }
    return { props: { player } }
  } catch {
    return { props: { error: true } }
  }
}
