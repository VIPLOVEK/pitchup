// Next.js instrumentation hook — loads the right Sentry config for whichever
// runtime the server is executing in. Requires experimental.instrumentationHook
// in next.config.js (Next.js 14; this becomes unconditional in Next.js 15+).
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export async function onRequestError(...args) {
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureRequestError(...args)
}
