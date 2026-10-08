// This file configures the Sentry SDK for edge runtime code (middleware,
// edge API routes — PitchUp doesn't currently use any, but Next.js loads
// this file if the runtime hook fires, so it needs to exist).
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})
