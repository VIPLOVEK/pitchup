// This file configures the Sentry server-side SDK. It runs whenever a
// server-side API route, getServerSideProps, or cron handler executes.
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  // Share of transactions sent for performance monitoring. 0.1 = 10%,
  // plenty for a low-traffic community app without burning through the
  // free-tier event quota. Raise this if you need deeper performance data.
  tracesSampleRate: 0.1,

  // Errors are always captured in full regardless of tracesSampleRate.
  // No DSN configured yet? The SDK silently no-ops — safe to leave as-is
  // until you set NEXT_PUBLIC_SENTRY_DSN in Vercel.
})
