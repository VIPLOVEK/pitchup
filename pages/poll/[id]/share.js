import { formatSlot } from '../../../lib/teams'
import { colors } from '../../../lib/tokens'

function AvatarShare({ name, src }) {
  const initials = (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const hue = [...(name || '')].reduce((h, c) => h + c.charCodeAt(0), 0) % 360
  if (src) return <img src={src} alt={name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  return (
    <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: `hsl(${hue},40%,35%)`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
      {initials}
    </span>
  )
}

export default function SharePage({ poll, error }) {
  if (error || !poll || poll.status !== 'confirmed') {
    return (
      <div style={{ minHeight: '100vh', background: colors.pitch, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.muted, fontFamily: 'system-ui, sans-serif' }}>
        Not available
      </div>
    )
  }

  const { teamA = [], teamB = [] } = poll.teams || {}
  const nameA = poll.team_a_name || 'Team A'
  const nameB = poll.team_b_name || 'Team B'

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${colors.pitch} 0%, ${colors.pitchMid} 100%)`,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28, paddingTop: 16 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⚽</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: colors.white, margin: '0 0 4px', letterSpacing: '-0.5px' }}>{poll.title}</h1>
        <p style={{ color: colors.muted, fontSize: 13, margin: 0 }}>📅 {formatSlot(poll.game_time)} · 📍 {poll.location}</p>
        {poll.score_a != null && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: poll.score_a > poll.score_b ? colors.teamA : colors.white }}>{poll.score_a}</span>
            <span style={{ color: colors.muted, fontWeight: 700, fontSize: 18 }}>—</span>
            <span style={{ fontSize: 36, fontWeight: 900, color: poll.score_b > poll.score_a ? colors.teamB : colors.white }}>{poll.score_b}</span>
          </div>
        )}
      </div>

      {/* Teams */}
      <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 480 }}>
        {/* Team A */}
        <div style={{ flex: 1, background: `${colors.teamA}18`, border: `2px solid ${colors.teamA}44`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: colors.teamA, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            🟦 {nameA}
          </div>
          {teamA.filter(p => !p.isGuest).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: colors.white, padding: '5px 0', borderBottom: i < teamA.filter(x=>!x.isGuest).length - 1 ? `1px solid ${colors.teamA}22` : 'none' }}>
              <AvatarShare name={p.name} src={p.avatar_url} />
              {p.name}
            </div>
          ))}
        </div>

        {/* Team B */}
        <div style={{ flex: 1, background: `${colors.teamB}18`, border: `2px solid ${colors.teamB}44`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: colors.teamB, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            🟥 {nameB}
          </div>
          {teamB.filter(p => !p.isGuest).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: colors.white, padding: '5px 0', borderBottom: i < teamB.filter(x=>!x.isGuest).length - 1 ? `1px solid ${colors.teamB}22` : 'none' }}>
              <AvatarShare name={p.name} src={p.avatar_url} />
              {p.name}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 28, fontSize: 12, color: colors.muted, textAlign: 'center' }}>
        pitchup.app · screenshot &amp; share ⚽
      </div>
    </div>
  )
}

export async function getServerSideProps({ params }) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/poll/${params.id}`)
    if (!res.ok) return { props: { error: true } }
    const poll = await res.json()
    if (poll.error) return { props: { error: true } }
    return { props: { poll } }
  } catch {
    return { props: { error: true } }
  }
}
