import { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import { Card, Label, Pill, Spinner, Avatar } from '../components/UI'
import { colors, radius } from '../lib/tokens'
import { flag, STAGE_LABELS } from '../lib/wcFlags'

function formatMatchDate(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
}

function groupByDate(matches) {
  const groups = {}
  for (const m of matches) {
    const day = new Date(m.match_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })
    if (!groups[day]) groups[day] = []
    groups[day].push(m)
  }
  return groups
}

function StatusBadge({ status }) {
  if (status === 'live') return <Pill color="#ef4444">🔴 Live</Pill>
  if (status === 'finished') return <Pill color={colors.muted}>Final</Pill>
  return null
}

function PredBar({ preds, locked }) {
  const total = preds.length
  if (total === 0) return null
  const home  = preds.filter(p => p.prediction === 'home').length
  const draw  = preds.filter(p => p.prediction === 'draw').length
  const away  = preds.filter(p => p.prediction === 'away').length
  const pct   = n => total > 0 ? Math.round(n / total * 100) : 0
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 6 }}>
        {home > 0 && <div style={{ flex: home, background: colors.accent }} />}
        {draw > 0 && <div style={{ flex: draw, background: colors.muted }} />}
        {away > 0 && <div style={{ flex: away, background: colors.grassLight }} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: colors.muted }}>
        <span style={{ color: colors.accent }}>{pct(home)}% home</span>
        <span>{pct(draw)}% draw</span>
        <span style={{ color: colors.grassLight }}>{pct(away)}% away</span>
      </div>
    </div>
  )
}

function MatchCard({ match, myPrediction, preds }) {
  const locked = match.status !== 'upcoming' || new Date(match.match_date) <= new Date()
  const myPred = myPrediction
  const hasResult = match.score_home != null && match.score_away != null

  return (
    <Link href={`/worldcup/${match.id}`} style={{ textDecoration: 'none' }}>
      <div className="card-link" style={{
        background: 'linear-gradient(145deg, rgba(20,40,72,0.88) 0%, rgba(13,30,53,0.92) 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: radius.lg,
        padding: '14px 16px',
        marginBottom: 10,
        boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
        cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: colors.muted, fontWeight: 600 }}>
            {match.group_name ? `Group ${match.group_name}` : STAGE_LABELS[match.stage] || match.stage}
            {' · '}{formatMatchDate(match.match_date)}
          </span>
          <StatusBadge status={match.status} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {/* Home team */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>{match.flag_home || flag(match.team_home)}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.white, marginTop: 4, lineHeight: 1.2 }}>{match.team_home}</div>
          </div>

          {/* Score or VS */}
          <div style={{ textAlign: 'center', minWidth: 52 }}>
            {hasResult ? (
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-1px', color: colors.accent }}>
                {match.score_home} – {match.score_away}
              </div>
            ) : (
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted }}>VS</div>
            )}
          </div>

          {/* Away team */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>{match.flag_away || flag(match.team_away)}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.white, marginTop: 4, lineHeight: 1.2 }}>{match.team_away}</div>
          </div>
        </div>

        {myPred && (
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: myPred.is_correct === true ? colors.grassLight : myPred.is_correct === false ? colors.danger : colors.accent,
              background: (myPred.is_correct === true ? colors.grassLight : myPred.is_correct === false ? colors.danger : colors.accent) + '18',
              borderRadius: 20, padding: '2px 10px',
            }}>
              {myPred.is_correct === true ? '✅ Correct! ' : myPred.is_correct === false ? '❌ Wrong — ' : '📌 Picked: '}
              {myPred.prediction === 'home' ? match.team_home : myPred.prediction === 'away' ? match.team_away : 'Draw'}
            </span>
          </div>
        )}

        {preds.length > 0 && <PredBar preds={preds} locked={locked} />}
        {preds.length === 0 && !locked && (
          <div style={{ marginTop: 8, fontSize: 11, color: colors.muted, textAlign: 'center' }}>Tap to predict →</div>
        )}
      </div>
    </Link>
  )
}

function Leaderboard({ board }) {
  if (!board || board.length === 0) return (
    <Card><p style={{ color: colors.muted, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No predictions yet.</p></Card>
  )
  return (
    <Card>
      <Label>{board.length} predictor{board.length !== 1 ? 's' : ''}</Label>
      {board.map((p, i) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
          <span style={{ width: 22, textAlign: 'center', fontSize: 15, flexShrink: 0 }}>
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
          </span>
          <Avatar name={p.name} size={30} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: colors.muted }}>{p.correct}/{p.total} correct</div>
          </div>
          <Pill color={p.correct > 0 ? colors.grassLight : colors.muted}>
            {p.total > 0 ? Math.round(p.correct / p.total * 100) : 0}%
          </Pill>
        </div>
      ))}
    </Card>
  )
}

export default function WorldCupPage() {
  const [matches, setMatches] = useState(null)
  const [predictions, setPredictions] = useState(null)
  const [board, setBoard] = useState(null)
  const [tab, setTab] = useState('matches')
  const [playerName, setPlayerName] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('pitchup_player')
    if (saved) { try { setPlayerName(JSON.parse(saved).name || '') } catch {} }

    fetch('/api/worldcup/matches').then(r => r.ok ? r.json() : []).then(setMatches).catch(() => setMatches([]))
    fetch('/api/worldcup/leaderboard').then(r => r.ok ? r.json() : []).then(setBoard).catch(() => setBoard([]))

    // Load all predictions in one go for the match list view
    fetch('/api/worldcup/all-predictions').then(r => r.ok ? r.json() : {}).then(setPredictions).catch(() => setPredictions({}))
  }, [])

  const grouped = matches ? groupByDate(matches) : {}

  return (
    <Layout title="World Cup 2026 — PitchUp" description="Predict World Cup 2026 matches and chat with your squad.">
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>🏆</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 4px' }}>
          World Cup <span style={{ color: colors.accent }}>2026</span>
        </h1>
        <p style={{ color: colors.muted, fontSize: 13, margin: 0 }}>USA · Canada · Mexico — Predict every match</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
        {['matches', 'predictions'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, background: tab === t ? colors.accent : 'transparent',
            color: tab === t ? colors.pitch : colors.muted,
            border: 'none', borderRadius: 9, padding: '8px 0',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            {t === 'matches' ? '📅 Matches' : '🏅 Predictions'}
          </button>
        ))}
      </div>

      {tab === 'matches' && (
        <>
          {matches === null && <Card><Spinner label="Loading matches..." /></Card>}
          {matches?.length === 0 && (
            <Card>
              <div style={{ textAlign: 'center', padding: '20px 0', color: colors.muted }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏟️</div>
                <p style={{ fontSize: 14 }}>No matches yet.</p>
                {process.env.NEXT_PUBLIC_HAS_FOOTBALL_API && <p style={{ fontSize: 12, marginTop: 4 }}>Matches will sync automatically.</p>}
              </div>
            </Card>
          )}
          {Object.entries(grouped).map(([day, dayMatches]) => (
            <div key={day} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>
                {day}
              </div>
              {dayMatches.map(m => {
                const matchPreds = predictions?.[m.id] || []
                const myPred = playerName ? matchPreds.find(p => p.player_name.toLowerCase() === playerName.toLowerCase()) : null
                return <MatchCard key={m.id} match={m} myPrediction={myPred} preds={matchPreds} />
              })}
            </div>
          ))}
        </>
      )}

      {tab === 'predictions' && (
        <>
          {board === null && <Card><Spinner label="Loading leaderboard..." /></Card>}
          {board !== null && <Leaderboard board={board} />}
        </>
      )}
    </Layout>
  )
}
