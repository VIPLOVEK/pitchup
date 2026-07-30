import { useState, useEffect } from 'react'
import { colors } from '../lib/tokens'

const STORAGE_KEY = 'pitchup_onboarded'

// ── Mini UI mockups shown inside each slide ────────────────────────────────────

function WelcomeVisual() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
      {['📅 Schedule games', '✅ Vote on times', '⚽ Auto-balanced teams', '🔔 Push alerts', '⏳ Waitlist', '⭐ MVP voting'].map(f => (
        <span key={f} style={{ background: colors.pitchCard, border: `1px solid ${colors.grass}44`, borderRadius: 20, padding: '7px 13px', fontSize: 12, color: colors.white, fontWeight: 600 }}>{f}</span>
      ))}
    </div>
  )
}

function JoinVisual() {
  const [selected, setSelected] = useState([0])
  const slots = ['Sat 2 Aug · 7:00 pm', 'Sun 3 Aug · 10:00 am', 'Sat 2 Aug · 9:00 pm']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {slots.map((slot, i) => {
        const on = selected.includes(i)
        return (
          <div
            key={i}
            onClick={() => setSelected(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: `2px solid ${on ? colors.grassLight : colors.grass + '33'}`,
              background: on ? colors.grassLight + '18' : colors.pitchMid,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 12, color: on ? colors.grassLight : colors.muted, fontWeight: 600 }}>{slot}</span>
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              border: `2px solid ${on ? colors.grassLight : colors.grass + '44'}`,
              background: on ? colors.grassLight : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: on ? colors.pitch : 'transparent', fontWeight: 800,
            }}>✓</span>
          </div>
        )
      })}
      <p style={{ fontSize: 11, color: colors.muted, textAlign: 'center', margin: '2px 0 0' }}>👆 Try tapping a slot!</p>
    </div>
  )
}

function ConfirmedVisual() {
  return (
    <div>
      <div style={{ background: colors.grassLight + '18', border: `1px solid ${colors.grassLight}44`, borderRadius: 10, padding: '8px 12px', textAlign: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: colors.grassLight, letterSpacing: 1 }}>⚽ GAME CONFIRMED · SAT 2 AUG 7:00 PM</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: colors.pitchMid, borderRadius: 10, padding: '10px 12px', border: `1px solid ${colors.accent}44` }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: colors.accent, marginBottom: 7, letterSpacing: 0.5 }}>TEAM A</div>
          {['Dushyanth', 'Stephan', 'Viplove', 'Kachan'].map(n => (
            <div key={n} style={{ fontSize: 11, color: colors.white, padding: '2px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: colors.accent, display: 'inline-block' }} />{n}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, background: colors.pitchMid, borderRadius: 10, padding: '10px 12px', border: `1px solid ${colors.teamB}44` }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: colors.teamB, marginBottom: 7, letterSpacing: 0.5 }}>TEAM B</div>
          {['Yahit', 'Bhaskar', 'Xavi', 'Omkar J'].map(n => (
            <div key={n} style={{ fontSize: 11, color: colors.white, padding: '2px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: colors.teamB, display: 'inline-block' }} />{n}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WaitlistVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ background: colors.pitchMid, borderRadius: 12, padding: '14px 16px', border: `1px solid #3b82f644`, textAlign: 'center' }}>
        <div style={{ fontSize: 26, marginBottom: 6 }}>⏳</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.white }}>You're on the waitlist</div>
        <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>Position #2 · You'll be promoted automatically if a spot opens up</div>
      </div>
      <div style={{ background: '#f59e0b15', border: '1px solid #f59e0b44', borderRadius: 10, padding: '10px 14px' }}>
        <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, marginBottom: 3 }}>📲 PUSH NOTIFICATION</div>
        <div style={{ fontSize: 12, color: colors.white }}>You've moved from the waitlist to active — you're in! ⚽</div>
      </div>
    </div>
  )
}

function ProfileVisual() {
  return (
    <div style={{ background: colors.pitchMid, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: `hsl(120,40%,28%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', border: `2px solid ${colors.accent}44`, flexShrink: 0 }}>VK</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: colors.white }}>Viplove K</div>
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>📱 +61 412 345 678</div>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: colors.muted, fontWeight: 700, marginBottom: 5, letterSpacing: 0.5 }}>POSITIONS</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Defender', 'Midfielder'].map(p => (
            <span key={p} style={{ fontSize: 11, background: colors.accent + '22', color: colors.accent, borderRadius: 6, padding: '4px 10px', fontWeight: 700 }}>{p}</span>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: colors.muted, fontWeight: 700, marginBottom: 5, letterSpacing: 0.5 }}>SKILL LEVEL</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: i <= 4 ? colors.accent : colors.pitchCard, border: `1px solid ${i <= 4 ? colors.accent : colors.grass + '33'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i <= 4 ? colors.pitch : colors.muted }}>{i}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NotificationsVisual() {
  const notifs = [
    { icon: '✅', label: 'Game confirmed', body: 'Friday Night Futsal is on at 7pm — Powerleague' },
    { icon: '⏰', label: 'Voting closes soon', body: 'Tuesday 5-a-side needs more players before it closes!' },
    { icon: '⭐', label: 'Man of the Match', body: 'Who stood out tonight? Tap to cast your vote!' },
    { icon: '⚽', label: 'Player dropped out', body: 'Xavi just dropped out — less than 2h to kickoff!' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {notifs.map(n => (
        <div key={n.label} style={{ background: colors.pitchMid, borderRadius: 10, padding: '8px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18, lineHeight: 1.3, flexShrink: 0 }}>{n.icon}</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.white, marginBottom: 1 }}>{n.label}</div>
            <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.4 }}>{n.body}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MvpVisual() {
  const players = [
    { name: 'Dushyanth', votes: 5, medal: '🥇' },
    { name: 'Stephan', votes: 3, medal: '🥈' },
    { name: 'Viplove', votes: 2, medal: '🥉' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ background: colors.accent + '18', border: `1px solid ${colors.accent}44`, borderRadius: 10, padding: '8px 14px', textAlign: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: colors.accent, letterSpacing: 0.5 }}>⭐ VOTE FOR MAN OF THE MATCH</span>
      </div>
      {players.map((p, i) => (
        <div key={p.name} style={{
          background: i === 0 ? colors.accent + '14' : colors.pitchMid,
          borderRadius: 10, padding: '9px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
          border: i === 0 ? `1px solid ${colors.accent}44` : `1px solid transparent`,
        }}>
          <span style={{ fontSize: 20 }}>{p.medal}</span>
          <span style={{ flex: 1, fontSize: 13, color: colors.white, fontWeight: 700 }}>{p.name}</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {Array.from({ length: p.votes }).map((_, j) => (
              <span key={j} style={{ fontSize: 11 }}>⭐</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Slide definitions ──────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: 'welcome',
    icon: '🏟️',
    accent: colors.accent,
    title: 'Welcome to PitchUp',
    subtitle: 'Your home for 5-a-side football',
    body: 'Organise games, vote on times, get balanced teams, and stay in the loop — all in one place. Here\'s a quick guide to get started.',
    Visual: WelcomeVisual,
  },
  {
    id: 'join',
    icon: '📅',
    accent: colors.grassLight,
    title: 'How to Join a Game',
    subtitle: 'Three simple steps',
    steps: [
      { icon: '1️⃣', text: 'Open a game from the Home screen' },
      { icon: '2️⃣', text: 'Tap the time slots that work for you — you can pick multiple!' },
      { icon: '3️⃣', text: 'Enter your name and hit "I\'m in!"' },
    ],
    tip: '💡 Pick ALL times that work — more flexibility = better chance the game happens.',
    Visual: JoinVisual,
  },
  {
    id: 'confirmed',
    icon: '⚽',
    accent: colors.grassLight,
    title: 'Auto-Confirmed Games',
    subtitle: 'No admin needed',
    steps: [
      { icon: '✅', text: 'Once enough players join, the game is automatically confirmed' },
      { icon: '⚖️', text: 'Teams are balanced by skill rating using a snake draft' },
      { icon: '🔔', text: 'Everyone gets a push notification when it\'s confirmed' },
      { icon: '❌', text: 'If not enough players join by the cutoff, the game is cancelled automatically' },
    ],
    Visual: ConfirmedVisual,
  },
  {
    id: 'waitlist',
    icon: '⏳',
    accent: '#3b82f6',
    title: 'Waitlist & Dropping Out',
    subtitle: 'Be a good team player',
    steps: [
      { icon: '🪑', text: 'Game full? Join the waitlist — you\'ll be promoted automatically if a spot opens up' },
      { icon: '📲', text: 'You\'ll get a push notification the moment you move up' },
      { icon: '🙏', text: 'Can\'t make it? Update the poll ASAP so someone waiting gets your spot' },
    ],
    tip: '⚠️ No-shows block others from playing. Always update the poll if your plans change!',
    Visual: WaitlistVisual,
  },
  {
    id: 'profile',
    icon: '👤',
    accent: colors.accent,
    title: 'Create Your Profile',
    subtitle: 'Unlock the best features',
    steps: [
      { icon: '⚡', text: 'Auto-join games you\'re available for — no action needed' },
      { icon: '🎯', text: 'Set your positions & skill level for better team splits' },
      { icon: '🔒', text: 'Secured with a PIN — only you can make changes' },
      { icon: '📸', text: 'Add a photo so teammates know who you are' },
    ],
    tip: '👇 Tap "Me" in the bottom nav to create your profile.',
    Visual: ProfileVisual,
  },
  {
    id: 'notifications',
    icon: '🔔',
    accent: '#a78bfa',
    title: 'Push Notifications',
    subtitle: 'Stay in the loop',
    body: 'Enable push notifications to get instant alerts for:',
    steps: [
      { icon: '✅', text: 'Game confirmed (or cancelled)' },
      { icon: '⏰', text: 'Voting closes soon — not enough players yet' },
      { icon: '⭐', text: 'MVP voting opens after the final whistle' },
      { icon: '⚽', text: 'A player drops out close to kickoff' },
    ],
    tip: '🔔 Go to "Me" → Enable notifications to switch it on.',
    Visual: NotificationsVisual,
  },
  {
    id: 'mvp',
    icon: '⭐',
    accent: '#f59e0b',
    title: 'Man of the Match',
    subtitle: 'Vote after every game',
    body: 'About an hour after kickoff, a push notification goes out and everyone gets to vote for the star player of the game.',
    steps: [
      { icon: '📲', text: 'Tap the notification to open the game page' },
      { icon: '⭐', text: 'Vote for the player who stood out most' },
      { icon: '🏆', text: 'MVP tallies are tracked on the Rankings page over time' },
    ],
    Visual: MvpVisual,
  },
]

// ── Main slideshow component ───────────────────────────────────────────────────

export default function OnboardingSlideshow({ open, onClose }) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = back
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  if (!open) return null

  const slide = SLIDES[index]
  const isLast = index === SLIDES.length - 1

  function go(next) {
    if (animating) return
    setDirection(next > index ? 1 : -1)
    setAnimating(true)
    setTimeout(() => { setIndex(next); setAnimating(false) }, 180)
  }

  function finish() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch (_) {}
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(4,8,20,0.96)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 0 16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) finish() }}
    >
      <div style={{
        background: '#0a1628',
        border: `1px solid ${slide.accent}33`,
        borderRadius: 24,
        width: '100%',
        maxWidth: 480,
        margin: '0 12px',
        boxShadow: `0 -4px 60px ${slide.accent}15, 0 0 0 1px rgba(255,255,255,0.04)`,
        overflow: 'hidden',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {SLIDES.map((_, i) => (
              <div
                key={i}
                onClick={() => go(i)}
                style={{
                  width: i === index ? 22 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === index ? slide.accent : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.25s',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <button
            onClick={finish}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: colors.muted, borderRadius: 20, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            Skip
          </button>
        </div>

        {/* Slide content */}
        <div style={{
          padding: '20px 22px',
          overflowY: 'auto',
          flex: 1,
          opacity: animating ? 0 : 1,
          transform: animating ? `translateX(${direction * 18}px)` : 'translateX(0)',
          transition: animating ? 'none' : 'opacity 0.18s ease, transform 0.18s ease',
        }}>
          {/* Icon + heading */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 10 }}>{slide.icon}</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 4px', color: slide.accent, letterSpacing: '-0.3px' }}>
              {slide.title}
            </h2>
            <p style={{ fontSize: 13, color: colors.muted, margin: 0, fontWeight: 600 }}>
              {slide.subtitle}
            </p>
          </div>

          {/* Visual mockup */}
          <div style={{ background: colors.pitchMid + '80', borderRadius: 14, padding: 14, marginBottom: 16, border: `1px solid ${slide.accent}22` }}>
            <slide.Visual />
          </div>

          {/* Body text */}
          {slide.body && (
            <p style={{ fontSize: 13, color: colors.white, lineHeight: 1.65, margin: '0 0 12px' }}>
              {slide.body}
            </p>
          )}

          {/* Steps */}
          {slide.steps && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: slide.tip ? 12 : 0 }}>
              {slide.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 16, lineHeight: 1.3, flexShrink: 0 }}>{s.icon}</span>
                  <span style={{ fontSize: 13, color: colors.white, lineHeight: 1.55 }}>{s.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tip */}
          {slide.tip && (
            <div style={{ background: slide.accent + '14', border: `1px solid ${slide.accent}33`, borderRadius: 10, padding: '10px 13px', marginTop: 12 }}>
              <p style={{ fontSize: 12, color: slide.accent, margin: 0, lineHeight: 1.55, fontWeight: 600 }}>{slide.tip}</p>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 20px 16px', borderTop: `1px solid rgba(255,255,255,0.06)` }}>
          {index > 0 && (
            <button
              onClick={() => go(index - 1)}
              style={{
                flex: 1, padding: '13px 0', borderRadius: 12,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: colors.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={() => isLast ? finish() : go(index + 1)}
            style={{
              flex: 2, padding: '13px 0', borderRadius: 12,
              background: `linear-gradient(135deg, ${slide.accent} 0%, ${slide.accent}bb 100%)`,
              border: 'none',
              color: slide.accent === colors.accent || slide.accent === '#f59e0b' ? colors.pitch : '#fff',
              fontSize: 14, fontWeight: 800, cursor: 'pointer',
              boxShadow: `0 4px 20px ${slide.accent}40`,
            }}
          >
            {isLast ? "Let's play! ⚽" : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

export { STORAGE_KEY as ONBOARDING_KEY }
