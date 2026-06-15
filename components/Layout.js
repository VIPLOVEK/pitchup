import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { colors } from '../lib/tokens'

export default function Layout({ children, title = 'PitchUp', description = 'PitchUp — pickup soccer organizer' }) {
  const router = useRouter()
  const isAdmin = router.pathname.startsWith('/admin')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const ogImage = appUrl ? `${appUrl}/logo.png` : '/logo.png'

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={description} />
        <link rel="icon" href="/logo.png" />

        {/* PWA / "Add to Home Screen" support */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content={colors.pitch} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PitchUp" />

        {/* Open Graph / WhatsApp link preview */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
      </Head>

      <header style={{
        background: `linear-gradient(180deg, ${colors.pitchMid} 0%, ${colors.pitch} 100%)`,
        borderBottom: `2px solid ${colors.accent}`,
        boxShadow: '0 2px 16px rgba(0,0,0,0.35)',
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
          <img className="brand-logo" src="/logo.png" alt="PitchUp" style={{ height: 32, width: 32, borderRadius: '50%', boxShadow: `0 0 0 2px ${colors.accent}33` }} />
          <span>Pitch<span style={{ color: colors.accent }}>Up</span></span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/profile"
            style={{
              color: colors.muted,
              border: `1px solid ${colors.grass}44`,
              borderRadius: 6,
              padding: '6px 14px',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            👤 Profile
          </Link>
          <Link
            href={isAdmin ? '/' : '/admin'}
            style={{
              background: isAdmin ? 'transparent' : colors.accent,
              color: isAdmin ? colors.muted : colors.pitch,
              border: isAdmin ? `1px solid ${colors.grass}44` : 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontWeight: 600,
              fontSize: 13,
              boxShadow: isAdmin ? 'none' : `0 2px 10px ${colors.accent}33`,
            }}
          >
            {isAdmin ? '← Vote' : 'Admin'}
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 80px', animation: 'fadeInUp 0.3s ease' }}>
        {children}
      </main>
    </>
  )
}
