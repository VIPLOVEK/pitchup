import { colors } from '../lib/tokens'

const RAINBOW = ['#ef4444', '#f97316', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa']

function RainbowText({ text }) {
  return <>{[...text].map((ch, i) => <span key={i} style={{ color: RAINBOW[i % RAINBOW.length] }}>{ch}</span>)}</>
}

const POSITION_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Any']

function groupByPosition(team) {
  const groups = { Goalkeeper: [], Defender: [], Midfielder: [], Forward: [], Any: [] }
  team.filter(p => !p.isGuest).forEach(p => {
    const pos = p.positions?.[0]
    ;(groups[pos] ? groups[pos] : groups.Any).push(p)
  })
  return groups
}

function NameList({ players, isColors }) {
  if (players.length === 0) return <span style={{ fontSize: 11, color: colors.muted }}>—</span>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {players.map(p => (
        <span key={p.name} style={{ fontSize: 11, fontWeight: 600 }}>
          {isColors ? <RainbowText text={p.name} /> : <span style={{ color: colors.white }}>{p.name}</span>}
        </span>
      ))}
    </div>
  )
}

/**
 * Admin-only position-by-position comparison of both teams' current
 * lineup — a quick way to spot an imbalance (e.g. 5 defenders on one
 * side, 1 on the other) before saving. Reads straight from the editor's
 * live team-list state, so it updates as positions are changed, and is
 * a companion to the per-player position dropdowns, not a replacement.
 */
export default function PositionHeadToHead({ teamA, teamB, nameA, nameB }) {
  const groupsA = groupByPosition(teamA)
  const groupsB = groupByPosition(teamB)
  const rows = POSITION_ORDER
    .map(pos => ({ pos, a: groupsA[pos], b: groupsB[pos] }))
    .filter(r => r.a.length > 0 || r.b.length > 0)

  if (rows.length === 0) return null

  return (
    <div style={{ background: colors.pitchCard, border: `1px solid ${colors.grass}22`, borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.muted, marginBottom: 8 }}>
        ⚖️ Head to head by position
      </div>
      {rows.map(({ pos, a, b }) => {
        const mismatch = Math.abs(a.length - b.length) >= 2
        return (
          <div key={pos} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'start', gap: 8, padding: '7px 0', borderTop: `1px solid ${colors.grass}14` }}>
            <div style={{ textAlign: 'right' }}>
              <NameList players={a} isColors={false} />
            </div>
            <div style={{ textAlign: 'center', minWidth: 74, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{pos}</div>
              <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>
                <span style={{ color: mismatch ? colors.cardYellow : colors.white }}>{a.length}</span>
                <span style={{ color: colors.muted }}> vs </span>
                <span style={{ color: mismatch ? colors.cardYellow : colors.white }}>{b.length}</span>
              </div>
              {mismatch && <div style={{ fontSize: 9, color: colors.cardYellow, marginTop: 1 }}>⚠ lopsided</div>}
            </div>
            <div style={{ textAlign: 'left' }}>
              <NameList players={b} isColors={true} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
