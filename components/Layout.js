import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { colors } from '../lib/tokens'

export default function Layout({ children, title = 'PitchUp' }) {
  const router = useRouter()
  const isAdmin = router.pathname.startsWith('/admin')

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Pickup soccer organizer" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚽</text></svg>" />
      </Head>

      <header style={{
        background: colors.pitchMid,
        borderBottom: `2px solid ${colors.grass}`,
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
          <span>⚽</span>
          <span>Pitch<span style={{ color: colors.accent }}>Up</span></span>
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
          }}
        >
          {isAdmin ? '← Vote' : 'Admin'}
        </Link>
      </header>

      <main style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 80px' }}>
        {children}
      </main>
    </>
  )
}
