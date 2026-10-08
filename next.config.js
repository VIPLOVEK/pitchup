const { withSentryConfig } = require('@sentry/nextjs/config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = withSentryConfig(nextConfig, {
  // Suppresses noisy source-map-upload logs during build when no org/project/
  // auth token is configured yet (safe no-op until Sentry env vars are set).
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Routes Sentry's client requests through this app's own domain, so an
  // ad-blocker blocking sentry.io doesn't also block error reporting.
  tunnelRoute: '/monitoring',

  // Strips Sentry's own debug logging calls from the production bundle.
  treeshake: { removeDebugLogging: true },
})
