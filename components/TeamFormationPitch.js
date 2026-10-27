import { colors } from '../lib/tokens'

const RAINBOW = ['#ef4444', '#f97316', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa']

function RainbowText({ text }) {
  return <>{[...text].map((ch, i) => <span key={i} style={{ color: RAINBOW[i % RAINBOW.length] }}>{ch}</span>)}</>
}

function initialsFor(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const POSITION_RANK = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3 }

// Spreads a team's players across several rows so no single row gets
// overcrowded into one long line. Players are loosely ordered by position
// first (defenders toward the team's own goal, forwards toward the
// halfway line — an unset position sorts as midfield, the most neutral
// placement) and then split into rows of at most ~3, so a large roster
// gets more rows instead of a wider, more cramped one.
function rowsFromTeam(team) {
  if (team.length === 0) return [[]]
  const rankOf = p => POSITION_RANK[p.positions?.[0]] ?? POSITION_RANK.Midfielder
  const sorted = [...team].sort((a, b) => rankOf(a) - rankOf(b))
  const rowCount = Math.min(6, Math.max(1, Math.ceil(team.length / 3)))
  const base = Math.floor(sorted.length / rowCount)
  let extra = sorted.length % rowCount
  const rows = []
  let idx = 0
  for (let r = 0; r < rowCount; r++) {
    const size = base + (extra > 0 ? 1 : 0)
    if (extra > 0) extra--
    rows.push(sorted.slice(idx, idx + size))
    idx += size
  }
  return rows
}

// Y position (%) for row `i` of `rowCount`, spread between the team's own
// goal line and the halfway line. `fromBottom` mirrors the spread for the
// team defending the bottom goal, so both teams' forwards end up closest
// to the halfway line in the middle of the pitch.
function rowY(i, rowCount, fromBottom) {
  const margin = 9, span = 39
  const t = margin + ((i + 0.5) / rowCount) * span
  return fromBottom ? 100 - t : t
}

// Shrinks avatar/label size as the busiest row gets more crowded, so names
// stay legible instead of overlapping on a narrow phone screen.
function sizeForDensity(maxRowSize) {
  if (maxRowSize <= 4) return { avatar: 34, font: 10, labelW: 76 }
  if (maxRowSize <= 6) return { avatar: 28, font: 9, labelW: 58 }
  return { avatar: 23, font: 8, labelW: 46 }
}

// Every player's avatar ring (and initials-fallback background) is tinted
// by team, not by player — so teammates read as one group at a glance,
// the same way a real photo would've shown team colors. "Me" gets a glow
// on top of the team color rather than a different color, so I'm still
// visibly on my own team.
function PlayerToken({ p, isColors, isMe, size, style }) {
  const teamColor = isColors ? colors.teamB : colors.teamA
  const displayName = p.isGuest ? p.name.split("'s Guest")[0] + ' +1' : p.name
  return (
    <div style={{ position: 'absolute', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, ...style }}>
      <div style={{
        width: size.avatar, height: size.avatar, borderRadius: '50%',
        border: `${isMe ? 2.5 : 2}px solid ${teamColor}`,
        boxShadow: isMe ? `0 0 10px ${teamColor}cc` : 'none',
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: teamColor, flexShrink: 0,
      }}>
        {p.avatar_url
          ? <img src={p.avatar_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: size.avatar * 0.4, fontWeight: 800, color: isColors ? colors.white : '#0a1526' }}>{initialsFor(p.name)}</span>}
      </div>
      <span style={{
        fontSize: size.font, fontWeight: isMe ? 800 : 600,
        background: 'rgba(6,13,24,0.68)', padding: '1px 6px', borderRadius: 8,
        whiteSpace: 'nowrap', maxWidth: size.labelW, overflow: 'hidden', textOverflow: 'ellipsis',
        color: isColors ? undefined : (isMe ? colors.accent : colors.white),
      }}>
        {isColors ? <RainbowText text={displayName} /> : displayName}
        {isMe && ' (you)'}
      </span>
    </div>
  )
}

/**
 * A single vertical pitch, split into two halves, with each team's players
 * laid out in position rows (GK near their own goal, forwards near the
 * halfway line) — a visual complement to the detailed team list below it.
 * Purely illustrative: row/column placement is derived from each player's
 * preferred position, not a literal tactical formation.
 */
export default function TeamFormationPitch({ teamA, teamB, nameA, nameB, myName }) {
  const rowsA = rowsFromTeam(teamA)
  const rowsB = rowsFromTeam(teamB)
  const maxRowSize = Math.max(1, ...rowsA.map(r => r.length), ...rowsB.map(r => r.length))
  const size = sizeForDensity(maxRowSize)
  const maxRows = Math.max(rowsA.length, rowsB.length)
  const pitchHeight = Math.max(480, 110 + maxRows * 95)

  const renderRows = (rows, isColors, fromBottom) =>
    rows.map((row, ri) => row.map((p, pi) => {
      const x = ((pi + 1) / (row.length + 1)) * 100
      const y = rowY(ri, rows.length, fromBottom)
      return (
        <PlayerToken
          key={p.name}
          p={p}
          isColors={isColors}
          isMe={myName && p.name === myName}
          size={size}
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      )
    }))

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0a1526 0%, #0d1e35 100%)',
      borderRadius: 16, border: '1px solid rgba(245,240,225,0.06)',
      position: 'relative', overflow: 'hidden', padding: 10,
      height: pitchHeight, marginBottom: 16,
    }}>
      {/* Pitch markings */}
      <div style={{ position: 'absolute', inset: 10, border: '1.5px solid rgba(245,240,225,0.09)', borderRadius: 6 }} />
      <div style={{ position: 'absolute', left: 10, right: 10, top: '50%', borderTop: '1.5px solid rgba(245,240,225,0.09)', transform: 'translateY(-50%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 90, height: 90, border: '1.5px solid rgba(245,240,225,0.09)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 5, height: 5, borderRadius: '50%', background: 'rgba(245,240,225,0.14)', transform: 'translate(-50%, -50%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: 10, width: '42%', height: 36, border: '1.5px solid rgba(245,240,225,0.09)', borderTop: 'none', transform: 'translateX(-50%)' }} />
      <div style={{ position: 'absolute', left: '50%', bottom: 10, width: '42%', height: 36, border: '1.5px solid rgba(245,240,225,0.09)', borderBottom: 'none', transform: 'translateX(-50%)' }} />

      {/* Team labels */}
      <div style={{ position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center', zIndex: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.06em', color: colors.teamA, background: 'rgba(6,13,24,0.55)', padding: '3px 10px', borderRadius: 20 }}>
          ⚪ {nameA.toUpperCase()}
        </span>
      </div>
      <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', zIndex: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.06em', background: 'rgba(6,13,24,0.55)', padding: '3px 10px', borderRadius: 20 }}>
          🎨 <RainbowText text={nameB.toUpperCase()} />
        </span>
      </div>

      {/* Players */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
        {renderRows(rowsA, false, false)}
        {renderRows(rowsB, true, true)}
      </div>
    </div>
  )
}
