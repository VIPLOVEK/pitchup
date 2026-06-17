import { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import { Card, Label, Pill, Spinner } from '../components/UI'
import { colors } from '../lib/tokens'

const medal = (rank) => rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : null

function getSince(period) {
  if (period === 'month') {
    const d = new Date()
    d.setDate(1); d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  if (period === '30d') {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString()
  }
  return null
}

export default function Leaderboard({ leaderboard: initialLeaderboard, error: initialError }) {
  const [stats, setStats] = useState(initialLeaderboard)
  const [period, setPeriod] = useState('all')
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(initialError)

  useEffect(() => {
    if (period === 'all' && initialLeaderboard !== null) {
      setStats(initialLeaderboard)
      setFetchError(initialError)
      return
    }
    setLoading(true)
    const since = getSince(period)
    const url = since ? `/api/leaderboard?since=${encodeURIComponent(since)}` : '/api/leaderboard'
    fetch(url)
      .then(r => r.json())
      .then(data => { setStats(data); setFetchError(null) })
      .catch(() => setFetchError('Failed to load leaderboard'))
      .finally(() => setLoading(false))
  }, [period])

  const leaderboard = stats
  const error = fetchError

  return (
    <Layout title="Leaderboard — PitchUp">
      <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 6px' }}>
          🏆 Leaderboard
        </h1>
        <p style={{ color: colors.muted, fontSize: 13, margin: 0 }}>
          Win record from scored games. Played/Committed shows all confirmed games.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['all', 'All time'], ['month', 'This month'], ['30d', 'Last 30 days']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            style={{
              background: period === key ? colors.accent : colors.pitchMid,
              color: period === key ? colors.pitch : colors.muted,
              border: 'none', borderRadius: 20, padding: '6px 14px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <Card><p style={{ color: colors.danger, fontSize: 13 }}>{error}</p></Card>
      )}

      {!error && (leaderboard === null || loading) && (
        <Card><Spinner label="Loading leaderboard..." /></Card>
      )}

      {!error && !loading && leaderboard !== null && leaderboard.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', color: colors.muted, padding: '20px 0', fontSize: 14 }}>
            No game results yet — scores are recorded from the admin panel after a game.
          </div>
        </Card>
      )}

      {!error && !loading && leaderboard && leaderboard.length > 0 && (
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
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    <Link href={`/player/${encodeURIComponent(p.name)}`} style={{ color: colors.accent, textDecoration: 'none', fontWeight: 800 }}>{p.name}</Link>
                  </div>
                  <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    {p.wins}W - {p.losses}L - {p.draws}D · {p.gamesPlayed}/{p.gamesCommitted} game{p.gamesCommitted === 1 ? '' : 's'}
                    {p.goals > 0 && <span style={{ color: colors.grassLight, fontSize: 12, marginLeft: 6 }}>⚽ {p.goals}g</span>}
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
