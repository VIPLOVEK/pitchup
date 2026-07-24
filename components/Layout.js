import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { colors } from '../lib/tokens'

// ── SVG nav icons ─────────────────────────────────────────────────────────────
function HomeIcon({ active }) {
  const c = active ? colors.accent : colors.muted
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
    </svg>
  )
}

function TrophyIcon({ active }) {
  const c = active ? colors.accent : colors.muted
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12v8c0 3.314-2.686 6-6 6s-6-2.686-6-6V3z" />
      <path d="M6 5H4a2 2 0 00-2 2v1c0 1.657 1.343 3 3 3h1" />
      <path d="M18 5h2a2 2 0 012 2v1c0 1.657-1.343 3-3 3h-1" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  )
}

function PersonIcon({ active }) {
  const c = active ? colors.accent : colors.muted
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  )
}

function GlobeIcon({ active }) {
  const c = active ? colors.accent : colors.muted
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/', label: 'Home',      Icon: HomeIcon   },
  { href: '/leaderboard', label: 'Rankings', Icon: TrophyIcon },
  { href: '/profile', label: 'Me',       Icon: PersonIcon },
]

function DisclaimerModal() {
  const [player, setPlayer] = useState(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pitchup_player')
      if (!saved) return
      const p = JSON.parse(saved)
      if (!p.terms_accepted_at) setPlayer(p)
    } catch (_) {}
  }, [])

  if (!player) return null

  const accept = async () => {
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptTerms: true }),
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('pitchup_player', JSON.stringify({ ...player, terms_accepted_at: data.terms_accepted_at }))
      }
    } catch (_) {}
    setPlayer(null)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#0a1628',
        border: `1px solid ${colors.grass}33`,
        borderRadius: 16,
        padding: 28,
        maxWidth: 400,
        width: '100%',
      }}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>⚽</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px', textAlign: 'center', color: colors.white }}>
          One quick thing before you play
        </h2>
        <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.7, margin: '0 0 14px' }}>
          Football is a contact sport and participation carries an inherent risk of injury.
        </p>
        <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.7, margin: '0 0 24px' }}>
          By continuing, you confirm you are participating <strong style={{ color: colors.white }}>voluntarily and at your own risk</strong>. PitchUp and its organisers accept no liability for any injury, loss, or damage arising from participation. Please ensure you are fit to play.
        </p>
        <button
          onClick={accept}
          style={{
            width: '100%',
            background: `linear-gradient(135deg, ${colors.accent} 0%, #d4960a 100%)`,
            color: '#0a1628',
            border: 'none',
            borderRadius: 10,
            padding: '14px 20px',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          I understand — let's play
        </button>
      </div>
    </div>
  )
}

export default function Layout({ children, title = 'PitchUp', description = 'PitchUp — pickup soccer organizer', ogImageUrl }) {
  const router = useRouter()
  const isAdmin = router.pathname.startsWith('/admin')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const ogImage = ogImageUrl || (appUrl ? `${appUrl}/logo.png` : '/logo.png')

  function isActive(href) {
    if (href === '/') return router.pathname === '/'
    return router.pathname.startsWith(href)
  }

  return (
    <>
      <DisclaimerModal />
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={description} />
        <link rel="icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content={colors.pitch} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PitchUp" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={ogImage} />
      </Head>

      {/* Frosted glass header */}
      <header style={{
        background: 'rgba(6, 13, 24, 0.88)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid rgba(240, 192, 48, 0.18)',
        boxShadow: '0 1px 0 rgba(240,192,48,0.06), 0 4px 24px rgba(0,0,0,0.5)',
        padding: '0 20px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>
          <img
            className="brand-logo"
            src="/logo.png"
            alt="PitchUp"
            style={{
              height: 34, width: 34, borderRadius: '50%',
              boxShadow: `0 0 0 2px ${colors.accent}44, 0 0 14px ${colors.accent}22`,
            }}
          />
          <span>Pitch<span style={{ color: colors.accent }}>Up</span></span>
        </Link>
        <Link
          href={isAdmin ? '/' : '/admin'}
          style={{
            background: isAdmin ? 'transparent' : `linear-gradient(135deg, ${colors.accent} 0%, #d4960a 100%)`,
            color: isAdmin ? colors.muted : colors.pitch,
            border: isAdmin ? '1px solid rgba(255,255,255,0.1)' : 'none',
            borderRadius: 8,
            padding: '6px 16px',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: isAdmin ? 'none' : `0 2px 12px ${colors.accent}40`,
            letterSpacing: '0.01em',
          }}
        >
          {isAdmin ? '← Back' : 'Admin'}
        </Link>
      </header>

      <main style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 118px' }}>
        {children}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link href="/feedback" style={{ color: colors.muted, fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>
            💡 Suggest a feature
          </Link>
        </div>
      </main>

      {/* Floating island bottom navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 16,
        left: 14,
        right: 14,
        zIndex: 100,
        background: 'rgba(8, 16, 36, 0.94)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 28,
        display: 'flex',
        padding: '4px 6px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 0',
                textDecoration: 'none',
                gap: 4,
                position: 'relative',
                borderRadius: 22,
              }}
            >
              {active && (
                <div style={{
                  position: 'absolute',
                  inset: '4px 8px',
                  background: `linear-gradient(145deg, rgba(240,192,48,0.18) 0%, rgba(240,192,48,0.08) 100%)`,
                  border: '1px solid rgba(240,192,48,0.22)',
                  borderRadius: 18,
                }} />
              )}
              <span style={{ position: 'relative', zIndex: 1, lineHeight: 1 }}>
                <Icon active={active} />
              </span>
              <span style={{
                position: 'relative',
                zIndex: 1,
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                color: active ? colors.accent : colors.muted,
                letterSpacing: '0.03em',
              }}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
