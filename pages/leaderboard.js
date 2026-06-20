import { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import { Card, Label, Pill, Spinner, Avatar } from '../components/UI'
import { colors } from '../lib/tokens'

const medal = (rank) => rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : null

const PERIODS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'This month', days: null, month: true },
  { label: 'All time', days: null },
]

export default function Leaderboard({ initialLeaderboard }) {
  const [period, setPeriod] = useState(PERIODS[3])
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (period === PERIODS[3] && initialLeaderboard) {
      setLeaderboard(initialLeaderboard)
      return
    }
    setLoading(true)
    setError('')
    let since = ''
    if (period.month) {
      const d = new Date()
      d.setDate(1); d.setHours(0, 0, 0, 0)
      since = d.toISOString()
    } else if (period.days) {
      since = new Date(Date.now() - period.days * 86400000).toISOString()
    }
    const url = since ? `/api/leaderboard?since=${encodeURIComponent(since)}` : '/api/leaderboard'
    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setLeaderboard(data); setLoading(false) })
      .catch(() => { setError('Failed to load'); setLoading(false) })
  }, [period])


  return (
    <Layout title="Leaderboard — PitchUp">
      <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 6px' }}>
          🏆 Rankings
        </h1>
        <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 16px' }}>
          Win record from scored games. Played/Committed shows all confirmed games.
        </p>
        <div style={{ display: 'inline-flex', gap: 6, background: colors.pitchMid, borderRadius: 10, padding: 4 }}>
          {PERIODS.map(p => (
            <button
              key={p.label}
              onClick={() => setPeriod(p)}
              style={{
                background: period.label === p.label ? colors.accent : 'transparent',
                color: period.label === p.label ? colors.pitch : colors.muted,
                border: 'none',
                borderRadius: 7,
                padding: '5px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <Card><p style={{ color: colors.danger, fontSize: 13 }}>{error}</p></Card>}

      {!error && loading && <Card><Spinner label="Loading leaderboard..." /></Card>}

      {!error && !loading && leaderboard !== null && leaderboard.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', color: colors.muted, padding: '20px 0', fontSize: 14 }}>
            No scored games in this period.
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
                <Avatar name={p.name} src={p.avatar_url} size={32} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Link href={`/player/${encodeURIComponent(p.name)}`} style={{ color: colors.accent, textDecoration: 'none', fontWeight: 800 }}>{p.name}</Link>
                    {p.streak >= 3 && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: colors.cardYellow, background: colors.cardYellow + '22', border: `1px solid ${colors.cardYellow}44`, borderRadius: 6, padding: '1px 5px' }}>
                        🔥 {p.streak}
                      </span>
                    )}
                  </div>
                  <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    {p.wins}W - {p.losses}L - {p.draws}D · {p.gamesPlayed}/{p.gamesCommitted} game{p.gamesCommitted === 1 ? '' : 's'}
                    {p.goals > 0 && <span style={{ color: colors.grassLight, fontSize: 12, marginLeft: 6 }}>⚽ {p.goals}g</span>}
                    {p.assists > 0 && <span style={{ color: colors.grassLight, fontSize: 12, marginLeft: 4 }}>↗ {p.assists}a</span>}
                    {p.noShows > 0 && <span style={{ fontSize: 12, marginLeft: 6, color: p.reliability >= 90 ? colors.grassLight : p.reliability >= 70 ? colors.cardYellow : colors.danger }}>· {p.reliability}% show</span>}
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
    if (!res.ok) return { props: { initialLeaderboard: [] } }
    const leaderboard = await res.json()
    return { props: { initialLeaderboard: leaderboard } }
  } catch {
    return { props: { initialLeaderboard: [] } }
  }
}
