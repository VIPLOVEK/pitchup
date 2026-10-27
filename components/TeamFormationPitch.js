import { colors } from '../lib/tokens'

const RAINBOW = ['#ef4444', '#f97316', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa']

function RainbowText({ text }) {
  return <>{[...text].map((ch, i) => <span key={i} style={{ color: RAINBOW[i % RAINBOW.length] }}>{ch}</span>)}</>
}

function initialsFor(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// Popular outfield formations, as [defenders, forwards] keyed by outfield
// player count (GK not counted) — midfielders always fill the remainder,
// so the three counts are guaranteed to add up to outfieldCount exactly
// rather than risking a hand-typed total that's quietly wrong. Chosen to
// match recognizable small-sided and full-sided shapes — e.g. 10 outfield
// is the classic 4-4-2, 6 outfield is 7-a-side's 3-2-1.
const DEF_FWD_TABLE = {
  3: [1, 1], 4: [1, 1], 5: [2, 1], 6: [3, 1], 7: [3, 1], 8: [3, 2], 9: [3, 2],
  10: [4, 2], 11: [4, 3], 12: [4, 3], 13: [5, 3], 14: [5, 4],
}

// For rosters bigger than the table covers, fall back to a proportional
// defense/forward split instead of a named formation.
function formationCounts(outfieldCount) {
  if (outfieldCount <= 0) return []
  if (outfieldCount === 1) return [1]
  if (outfieldCount === 2) return [1, 1]
  const [rawDef, rawFwd] = DEF_FWD_TABLE[outfieldCount] || [
    Math.round(outfieldCount * 0.36), Math.round(outfieldCount * 0.28),
  ]
  const def = Math.max(1, Math.min(rawDef, outfieldCount - 2))
  const fwd = Math.max(1, Math.min(rawFwd, outfieldCount - def - 1))
  const mid = outfieldCount - def - fwd
  return [def, mid, fwd]
}

function labelsFor(counts) {
  if (counts.length === 1) return ['Midfielder']
  if (counts.length === 2) return ['Defender', 'Forward']
  return ['Defender', 'Midfielder', 'Forward']
}

// Slots players into formation lines, preferring each player's own stated
// position for the matching line. Overflow beyond a line's slot count (too
// many players who picked the same position) spills into a shared pool
// that backfills any line still short — including players with no position
// set — so the final line sizes always match the formation exactly. If the
// counts ever don't add up to the full roster, any leftover never just
// vanishes — it's tacked onto the last line rather than silently dropped.
function assignToLines(players, labels, counts) {
  const pools = labels.map(() => [])
  const flex = []
  players.forEach(p => {
    const li = labels.indexOf(p.positions?.[0])
    ;(li === -1 ? flex : pools[li]).push(p)
  })
  pools.forEach((pool, i) => { while (pool.length > counts[i]) flex.push(pool.pop()) })
  pools.forEach((pool, i) => { while (pool.length < counts[i] && flex.length) pool.push(flex.shift()) })
  if (flex.length) pools[pools.length - 1].push(...flex)
  return pools
}

// Builds a team's lineup as a popular formation for its size (e.g. a
// 10-outfield team gets 4-4-2), reserving a goalkeeper line only when
// someone on the team has actually set Goalkeeper as their position.
// Each player lands on the line matching their own position when
// possible; an admin's per-game position edit (see the team editor)
// changes who fills which slot the next time this renders.
function buildFormation(team) {
  if (team.length === 0) return []
  const gkIdx = team.length >= 2 ? team.findIndex(p => p.positions?.[0] === 'Goalkeeper') : -1
  const gk = gkIdx === -1 ? null : team[gkIdx]
  const remaining = gk ? team.filter((_, i) => i !== gkIdx) : team
  const counts = formationCounts(remaining.length)
  const labels = labelsFor(counts)
  const pools = assignToLines(remaining, labels, counts)
  const lines = []
  if (gk) lines.push({ label: 'Goalkeeper', players: [gk] })
  labels.forEach((label, i) => { if (counts[i] > 0) lines.push({ label, players: pools[i] }) })
  return lines
}

// Fixed Y position (px from the team's own goal line) for each line type,
// so the formation always reads like a real lineup — a line's vertical
// slot never shifts just because another line (e.g. no GK) is absent.
const LINE_Y = { Goalkeeper: 28, Defender: 95, Midfielder: 160, Forward: 222 }
const HALF_HEIGHT = 278

function lineY(label, fromBottom) {
  const t = LINE_Y[label]
  return fromBottom ? HALF_HEIGHT * 2 - t : t
}

// Avatar/font size shrinks only for a genuinely wide line (formation line
// counts are small for most team sizes, so this rarely kicks in).
function sizeForWidth(maxLineSize) {
  if (maxLineSize <= 3) return { avatar: 36, font: 11, labelW: 82 }
  if (maxLineSize <= 5) return { avatar: 28, font: 9, labelW: 60 }
  return { avatar: 22, font: 8, labelW: 46 }
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
 * A single vertical pitch, split into two halves, with each team laid out
 * as a popular formation for its size (e.g. 10 outfield players reads as
 * a 4-4-2) — a visual complement to the detailed team list below it.
 * Players land on the line matching their own preferred position where
 * possible; admin position edits (team editor) reshuffle who's on which
 * line the next time this renders, not the formation shape itself.
 */
export default function TeamFormationPitch({ teamA, teamB, nameA, nameB, myName }) {
  const linesA = buildFormation(teamA)
  const linesB = buildFormation(teamB)
  const maxLineSize = Math.max(1, ...linesA.map(l => l.players.length), ...linesB.map(l => l.players.length))
  const size = sizeForWidth(maxLineSize)
  const pitchHeight = HALF_HEIGHT * 2

  const renderLines = (lines, isColors, fromBottom) =>
    lines.map(({ label, players }) => players.map((p, pi) => {
      const x = ((pi + 1) / (players.length + 1)) * 100
      const y = lineY(label, fromBottom)
      return (
        <PlayerToken
          key={p.name}
          p={p}
          isColors={isColors}
          isMe={myName && p.name === myName}
          size={size}
          style={{ left: `${x}%`, top: `${y}px` }}
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
        {renderLines(linesA, false, false)}
        {renderLines(linesB, true, true)}
      </div>
    </div>
  )
}
