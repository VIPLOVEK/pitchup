import { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import { Card, Spinner, Avatar } from '../components/UI'
import { colors, radius } from '../lib/tokens'
import { flag, STAGE_LABELS } from '../lib/wcFlags'

const FIFA_RED    = '#e4002b'
const FIFA_GOLD   = '#f0c030'
const FIFA_NAVY   = '#00205b'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
}
function formatDay(iso) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })
}
function groupByDate(matches) {
  const groups = {}
  for (const m of matches) {
    const day = formatDay(m.match_date)
    if (!groups[day]) groups[day] = []
    groups[day].push(m)
  }
  return groups
}
function isToday(iso) {
  const d = new Date(iso), now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

// ── FIFA-style hero banner ─────────────────────────────────────────────────────
function WCHero() {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 20,
      padding: '28px 20px 24px',
      background: `linear-gradient(135deg, ${FIFA_NAVY} 0%, #001133 40%, #0d1e35 100%)`,
      border: `1px solid rgba(240,192,48,0.25)`,
      boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(240,192,48,0.08)`,
      textAlign: 'center',
    }}>
      {/* Diagonal stripe accent */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: '45%',
        background: `linear-gradient(135deg, transparent 30%, rgba(228,0,43,0.12) 100%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: -30, right: -20,
        fontSize: 120, opacity: 0.04, lineHeight: 1, userSelect: 'none',
      }}>🏆</div>

      <div style={{ fontSize: 44, marginBottom: 6, lineHeight: 1 }}>🏆</div>
      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: FIFA_RED, marginBottom: 4,
      }}>
        FIFA
      </div>
      <h1 style={{
        fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px',
        margin: '0 0 4px', lineHeight: 1.1,
        background: `linear-gradient(135deg, #fff 30%, ${FIFA_GOLD} 100%)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        World Cup 2026™
      </h1>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 12 }}>
        🇺🇸 USA &nbsp;·&nbsp; 🇨🇦 Canada &nbsp;·&nbsp; 🇲🇽 Mexico
      </div>
      <div style={{
        display: 'inline-block',
        background: `rgba(240,192,48,0.1)`,
        border: `1px solid rgba(240,192,48,0.25)`,
        borderRadius: 20, padding: '4px 14px',
        fontSize: 12, fontWeight: 700, color: FIFA_GOLD,
      }}>
        Predict every match · Chat with your crew
      </div>
    </div>
  )
}

// ── Match card ─────────────────────────────────────────────────────────────────
function MatchCard({ match, myPrediction, preds }) {
  const locked = match.status !== 'upcoming' || new Date(match.match_date) <= new Date()
  const hasResult = match.score_home != null && match.score_away != null
  const isLive = match.status === 'live'
  const isDone = match.status === 'finished'
  const homePreds = preds.filter(p => p.prediction === 'home').length
  const drawPreds = preds.filter(p => p.prediction === 'draw').length
  const awayPreds = preds.filter(p => p.prediction === 'away').length
  const total = preds.length

  const homeWin = isDone && match.score_home > match.score_away
  const awayWin = isDone && match.score_away > match.score_home

  return (
    <Link href={`/worldcup/${match.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 10 }}>
      <div className="card-link" style={{
        background: isLive
          ? `linear-gradient(145deg, rgba(30,0,8,0.95) 0%, rgba(20,10,30,0.98) 100%)`
          : `linear-gradient(145deg, rgba(0,32,91,0.35) 0%, rgba(6,13,24,0.95) 100%)`,
        border: isLive
          ? `1.5px solid rgba(228,0,43,0.5)`
          : `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: isLive
          ? `0 4px 32px rgba(228,0,43,0.2), inset 0 1px 0 rgba(255,255,255,0.06)`
          : `0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)`,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}>
        {/* Live glow strip */}
        {isLive && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${FIFA_RED}, transparent)`,
          }} />
        )}

        {/* Stage + time row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            {match.group_name ? `Group ${match.group_name}` : STAGE_LABELS[match.stage] || match.stage}
          </span>
          {isLive ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: FIFA_RED, letterSpacing: '0.06em' }}>
              <span className="spinner-ball" style={{ fontSize: 8, animation: 'pulse 1s ease-in-out infinite' }}>●</span> LIVE
            </span>
          ) : isDone ? (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>FULL TIME</span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>{formatTime(match.match_date)}</span>
          )}
        </div>

        {/* Teams + score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TeamBlock flag={match.flag_home || flag(match.team_home)} name={match.team_home} winner={homeWin} align="left" />

          <div style={{ textAlign: 'center', minWidth: 60, flexShrink: 0 }}>
            {hasResult ? (
              <div style={{
                fontSize: 26, fontWeight: 900, letterSpacing: '-1px',
                color: isLive ? FIFA_RED : colors.white,
              }}>
                {match.score_home} – {match.score_away}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em' }}>VS</div>
              </div>
            )}
          </div>

          <TeamBlock flag={match.flag_away || flag(match.team_away)} name={match.team_away} winner={awayWin} align="right" />
        </div>

        {/* My prediction badge */}
        {myPrediction && (
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px',
              color: myPrediction.is_correct === true ? '#22c55e' : myPrediction.is_correct === false ? '#f87171' : FIFA_GOLD,
              background: myPrediction.is_correct === true ? 'rgba(34,197,94,0.12)' : myPrediction.is_correct === false ? 'rgba(248,113,113,0.12)' : 'rgba(240,192,48,0.12)',
              border: `1px solid ${myPrediction.is_correct === true ? 'rgba(34,197,94,0.25)' : myPrediction.is_correct === false ? 'rgba(248,113,113,0.25)' : 'rgba(240,192,48,0.25)'}`,
            }}>
              {myPrediction.is_correct === true ? '✅ Got it!' : myPrediction.is_correct === false ? '❌ ' : '📌 '}
              {myPrediction.prediction === 'home' ? match.team_home : myPrediction.prediction === 'away' ? match.team_away : 'Draw'}
            </span>
          </div>
        )}

        {/* Prediction bar */}
        {total > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', height: 4 }}>
              {homePreds > 0 && <div style={{ flex: homePreds, background: FIFA_GOLD, opacity: 0.8 }} />}
              {drawPreds > 0 && <div style={{ flex: drawPreds, background: 'rgba(255,255,255,0.3)' }} />}
              {awayPreds > 0 && <div style={{ flex: awayPreds, background: '#60a5fa', opacity: 0.8 }} />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              <span style={{ color: `${FIFA_GOLD}cc` }}>{Math.round(homePreds / total * 100)}%</span>
              <span>{total} pick{total !== 1 ? 's' : ''}</span>
              <span style={{ color: '#60a5facc' }}>{Math.round(awayPreds / total * 100)}%</span>
            </div>
          </div>
        )}

        {!locked && total === 0 && (
          <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
            Tap to predict →
          </div>
        )}
      </div>
    </Link>
  )
}

function TeamBlock({ flag: f, name, winner, align }) {
  return (
    <div style={{ flex: 1, textAlign: align === 'right' ? 'right' : 'left' }}>
      <div style={{ fontSize: 34, lineHeight: 1, marginBottom: 5 }}>{f}</div>
      <div style={{
        fontSize: 12, fontWeight: winner ? 800 : 600,
        color: winner ? colors.white : 'rgba(255,255,255,0.65)',
        lineHeight: 1.2,
      }}>
        {name}
      </div>
      {winner && <div style={{ fontSize: 9, color: FIFA_GOLD, fontWeight: 800, letterSpacing: '0.1em', marginTop: 2 }}>WINNER</div>}
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ label, color, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
      {accent && <div style={{ width: 3, height: 14, borderRadius: 2, background: color || colors.muted, flexShrink: 0 }} />}
      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: color || 'rgba(255,255,255,0.35)',
        flex: 1,
      }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color || 'rgba(255,255,255,0.06)'}, transparent)`, opacity: 0.4 }} />
    </div>
  )
}

// ── Leaderboard ────────────────────────────────────────────────────────────────
function Leaderboard({ board }) {
  const hasResults = board.some(p => p.correct > 0)

  if (!board || board.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '40px 20px',
        background: 'linear-gradient(145deg, rgba(0,32,91,0.3), rgba(6,13,24,0.95))',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16,
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <p style={{ color: colors.white, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No predictions yet</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Go to Matches and pick your winners</p>
      </div>
    )
  }

  if (!hasResults) {
    return (
      <>
        <div style={{
          background: 'rgba(240,192,48,0.08)', border: '1px solid rgba(240,192,48,0.2)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>⏳</div>
          <p style={{ color: FIFA_GOLD, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Predictions locked in — waiting for results</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Leaderboard updates after matches finish</p>
        </div>
        <PredictorList board={board} hasResults={false} />
      </>
    )
  }

  return <PredictorList board={board} hasResults={true} />
}

function PredictorList({ board, hasResults }) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {board.map((p, i) => {
        const pct = p.total > 0 ? Math.round(p.correct / p.total * 100) : 0
        const isTop = i < 3
        return (
          <div key={p.name} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: isTop && hasResults
              ? `linear-gradient(135deg, rgba(0,32,91,0.5), rgba(6,13,24,0.98))`
              : 'rgba(255,255,255,0.03)',
            border: isTop && hasResults
              ? `1px solid rgba(240,192,48,${0.3 - i * 0.08})`
              : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <span style={{ fontSize: isTop ? 22 : 14, minWidth: 28, textAlign: 'center', flexShrink: 0 }}>
              {medals[i] || <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{i + 1}</span>}
            </span>
            <Avatar name={p.name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: colors.white }}>{p.name}</div>
              {hasResults ? (
                <>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${FIFA_GOLD}, #d4960a)`, borderRadius: 2, transition: 'width 0.6s ease' }} />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{p.total} prediction{p.total !== 1 ? 's' : ''} pending</div>
              )}
            </div>
            {hasResults && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: isTop ? FIFA_GOLD : colors.white }}>{p.correct}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>/{p.total} · {pct}%</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function WorldCupPage({ initialMatches, initialPredictions, initialBoard }) {
  const [matches] = useState(initialMatches)
  const [predictions] = useState(initialPredictions)
  const [board] = useState(initialBoard)
  const [tab, setTab] = useState('matches')
  const [playerName, setPlayerName] = useState('')
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('pitchup_player')
    if (saved) { try { setPlayerName(JSON.parse(saved).name || '') } catch {} }
  }, [])

  const liveMatches     = matches?.filter(m => m.status === 'live') || []
  const todayMatches    = matches?.filter(m => m.status !== 'live' && isToday(m.match_date)) || []
  const upcomingMatches = matches?.filter(m => m.status === 'upcoming' && !isToday(m.match_date)) || []
  const pastMatches     = matches?.filter(m => m.status === 'finished' && !isToday(m.match_date)) || []
  const upcomingGrouped = groupByDate(upcomingMatches)

  function renderCard(m) {
    const matchPreds = predictions?.[m.id] || []
    const myPred = playerName ? matchPreds.find(p => p.player_name.toLowerCase() === playerName.toLowerCase()) : null
    return <MatchCard key={m.id} match={m} myPrediction={myPred} preds={matchPreds} />
  }

  return (
    <Layout title="FIFA World Cup 2026 — PitchUp" description="Predict FIFA World Cup 2026 matches and chat with your squad.">
      <WCHero />

      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 12, padding: 4, marginBottom: 20,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[['matches', '⚽ Matches'], ['predictions', '🏅 Leaderboard']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1,
            background: tab === t
              ? `linear-gradient(135deg, ${FIFA_NAVY} 0%, #001a4d 100%)`
              : 'transparent',
            color: tab === t ? colors.white : 'rgba(255,255,255,0.4)',
            border: tab === t ? `1px solid rgba(240,192,48,0.25)` : '1px solid transparent',
            borderRadius: 9, padding: '9px 0',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: tab === t ? '0 2px 12px rgba(0,32,91,0.5)' : 'none',
          }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'matches' && (
        <>
          {matches?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏟️</div>
              <p style={{ fontSize: 14 }}>No matches yet.</p>
            </div>
          )}

          {/* Live now */}
          {liveMatches.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <SectionHeader label="🔴 Live Now" color={FIFA_RED} accent />
              {liveMatches.map(renderCard)}
            </div>
          )}

          {/* Today */}
          {todayMatches.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <SectionHeader label="Today" color={FIFA_GOLD} accent />
              {todayMatches.map(renderCard)}
            </div>
          )}

          {/* Next up when no today/live */}
          {liveMatches.length === 0 && todayMatches.length === 0 && upcomingMatches.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <SectionHeader label="Next up" color={FIFA_GOLD} accent />
              {Object.entries(upcomingGrouped).slice(0, 1).flatMap(([, ms]) => ms.map(renderCard))}
            </div>
          )}

          {/* Upcoming */}
          {Object.entries(upcomingGrouped).slice(liveMatches.length === 0 && todayMatches.length === 0 ? 1 : 0).map(([day, dayMatches]) => (
            <div key={day} style={{ marginBottom: 16 }}>
              <SectionHeader label={day} />
              {dayMatches.map(renderCard)}
            </div>
          ))}

          {/* Past results */}
          {pastMatches.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setShowPast(p => !p)}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10,
                  color: 'rgba(255,255,255,0.35)', padding: '10px 0', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', marginBottom: showPast ? 12 : 0, letterSpacing: '0.04em',
                }}
              >
                {showPast ? '▲ Hide past results' : `▼ Past results (${pastMatches.length})`}
              </button>
              {showPast && Object.entries(groupByDate([...pastMatches].reverse())).map(([day, dayMatches]) => (
                <div key={day} style={{ marginBottom: 12 }}>
                  <SectionHeader label={day} />
                  {dayMatches.map(renderCard)}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'predictions' && <Leaderboard board={board} />}
    </Layout>
  )
}

export async function getServerSideProps() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const [mRes, pRes, bRes] = await Promise.all([
      fetch(`${base}/api/worldcup/matches`),
      fetch(`${base}/api/worldcup/all-predictions`),
      fetch(`${base}/api/worldcup/leaderboard`),
    ])
    return {
      props: {
        initialMatches:     mRes.ok ? await mRes.json() : [],
        initialPredictions: pRes.ok ? await pRes.json() : {},
        initialBoard:       bRes.ok ? await bRes.json() : [],
      },
    }
  } catch {
    return { props: { initialMatches: [], initialPredictions: {}, initialBoard: [] } }
  }
}
