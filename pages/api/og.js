// GET /api/og?id=<pollId> — dynamic OG image for WhatsApp/iMessage link previews
import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pitchup-soccer.vercel.app'

  let title = 'PitchUp ⚽'
  let location = 'Pickup Soccer'
  let dateStr = ''
  let playerLine = ''
  let statusLabel = 'Vote now'
  let statusColor = '#f5c518'

  if (id) {
    try {
      const res = await fetch(`${baseUrl}/api/poll/${id}`)
      if (res.ok) {
        const poll = await res.json()
        title = poll.title || title
        location = poll.location || location

        if (poll.game_time) {
          const d = new Date(poll.game_time)
          dateStr = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
            ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
        } else if (poll.slots?.length) {
          const d = new Date(poll.slots[0])
          dateStr = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
        }

        const active = (poll.players || []).length
        const max = poll.max_players || 18
        playerLine = `${active} / ${max} players`

        if (poll.status === 'confirmed') {
          statusLabel = 'Game confirmed ✅'
          statusColor = '#4ade80'
        } else if (poll.status === 'cancelled') {
          statusLabel = 'Cancelled ❌'
          statusColor = '#ef4444'
        } else {
          statusLabel = 'Tap to vote ⚽'
          statusColor = '#f5c518'
        }
      }
    } catch (_) {}
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0d1f0f 0%, #1a3a1e 60%, #0d2b12 100%)',
          padding: '48px 56px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top: logo + app name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#f5c518',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>
            ⚽
          </div>
          <span style={{ color: '#a3c9a8', fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>
            Pitch<span style={{ color: '#f5c518' }}>Up</span>
          </span>
        </div>

        {/* Middle: poll title + location */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#ffffff', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            {title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 26, color: '#a3c9a8', fontWeight: 500 }}>
              📍 {location}
            </div>
            {dateStr ? (
              <div style={{ fontSize: 24, color: '#a3c9a8', fontWeight: 500 }}>
                📅 {dateStr}
              </div>
            ) : null}
          </div>
        </div>

        {/* Bottom: player count + status pill */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {playerLine ? (
            <div style={{ fontSize: 22, color: '#6b8f6e', fontWeight: 600 }}>
              👥 {playerLine}
            </div>
          ) : <div />}
          <div style={{
            background: statusColor + '22',
            border: `2px solid ${statusColor}66`,
            borderRadius: 50,
            padding: '10px 24px',
            fontSize: 20,
            fontWeight: 700,
            color: statusColor,
          }}>
            {statusLabel}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
