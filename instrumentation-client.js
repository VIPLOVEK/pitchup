// This file configures the Sentry browser SDK — it loads automatically on
// every page. Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  // Share of page loads/navigations sent for performance monitoring.
  tracesSampleRate: 0.1,

  // Session replay is off by default — it's the fastest way to burn
  // through a free-tier quota on a low-traffic app. Turn on only if
  // you're actively debugging a hard-to-reproduce player-reported bug.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
})

// Required by the SDK to instrument Next.js client-side route transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
