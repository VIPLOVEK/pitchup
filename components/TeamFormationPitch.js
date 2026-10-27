import { colors } from '../lib/tokens'
import { Avatar } from './UI'

const RAINBOW = ['#ef4444', '#f97316', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa']

function RainbowText({ text }) {
  return <>{[...text].map((ch, i) => <span key={i} style={{ color: RAINBOW[i % RAINBOW.length] }}>{ch}</span>)}</>
}

// Groups a team's players into position rows (goalkeeper nearest their own
// goal, forwards nearest the halfway line). Anyone with no position
// preference set is folded into the midfield row — midfield is the most
// tactically neutral spot, so an unset position doesn't visually read as
// "this player is a forward". Guests are included, using whatever position
// they signed up under (or midfield, if none).
function rowsFromTeam(team) {
  const buckets = { Goalkeeper: [], Defender: [], Midfielder: [], Forward: [] }
  team.forEach(p => {
    const pos = p.positions?.[0]
    ;(buckets[pos] ? buckets[pos] : buckets.Midfielder).push(p)
  })
  const rows = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward']
    .map(k => buckets[k])
    .filter(row => row.length > 0)
  return rows.length ? rows : [[]]
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

function PlayerToken({ p, isColors, isMe, size, style }) {
  const ringColor = isMe
    ? colors.accent
    : isColors ? RAINBOW[(p.name?.length || 0) % RAINBOW.length] : 'rgba(248,244,234,0.55)'
  const displayName = p.isGuest ? p.name.split("'s Guest")[0] + ' +1' : p.name
  return (
    <div style={{ position: 'absolute', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, ...style }}>
      <div style={{ borderRadius: '50%', border: `${isMe ? 2.5 : 2}px solid ${ringColor}`, boxShadow: isMe ? `0 0 10px ${colors.accent}88` : 'none', lineHeight: 0 }}>
        <Avatar name={p.name} src={p.avatar_url} size={size.avatar} />
      </div>
      <span style={{
        fontSize: size.font, fontWeight: isMe ? 800 : 600,
        background: 'rgba(6,13,24,0.68)', padding: '1px 6px', borderRadius: 8,
        whiteSpace: 'nowrap', maxWidth: size.labelW, overflow: 'hidden', textOverflow: 'ellipsis',
        color: isColors ? undefined : (isMe ? colors.accent : colors.white),
      }}>
        {isColors ? <RainbowText text={displayName} /> : displayName}
        {isMe && !isColors && ' (you)'}
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
      height: 480, marginBottom: 16,
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
