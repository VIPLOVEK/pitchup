import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { colors } from '../lib/tokens'

export default function Layout({ children, title = 'Aldie FC' }) {
  const router = useRouter()
  const isAdmin = router.pathname.startsWith('/admin')

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Aldie FC pickup soccer organizer" />
        <link rel="icon" href="/logo.png" />
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
          <img src="/logo.png" alt="Aldie FC" style={{ height: 32, width: 32, borderRadius: '50%', boxShadow: `0 0 0 2px ${colors.accent}33` }} />
          <span>Aldie <span style={{ color: colors.accent }}>FC</span></span>
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
      </header>

      <main style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 80px', animation: 'fadeInUp 0.3s ease' }}>
        {children}
      </main>
    </>
  )
}
