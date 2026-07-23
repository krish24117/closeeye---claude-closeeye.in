import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import { WORKSPACE_REDIRECTS } from './lib/routing/redirects'

const appDir = path.dirname(fileURLToPath(import.meta.url))

// Content-Security-Policy — locks down where resources may load from.
// `'unsafe-inline'` on script/style is required by the Next.js App Router
// (streamed RSC bootstrap + JSON-LD) which has no nonce middleware here; every
// other vector is tightly scoped. `blob:`/`data:` cover user-captured photos and
// MediaRecorder audio; the Supabase hosts are the future backend swap-boundary.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.posthog.com https://*.i.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  // Observability egress (Sentry + PostHog) is allow-listed here so events aren't CSP-blocked when the
  // integrations are enabled; harmless while dormant (nothing connects without a DSN/key).
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://*.posthog.com https://*.i.posthog.com",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ')

const nextConfig: NextConfig = {
  // The crisis floor is ONE file shared with the Deno edge functions
  // (supabase/functions/_shared/crisis.ts). Compiling a file outside this directory
  // needs externalDir; tsconfig includes that ONE file, never the whole _shared dir —
  // its neighbours reference the `Deno` global and break the build.
  experimental: { externalDir: true },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // This app lives beside the legacy site; pin tracing to its own root so
  // Vercel bundles only what Close Eye Next needs.
  outputFileTracingRoot: appDir,
  // Linting runs in CI via `npm run lint`, not on the critical build path.
  eslint: { ignoreDuringBuilds: true },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },
  // Canonical IA back-compat (permanent 308s). Console → PM, founder funnel → /join,
  // Founder story retired → /about (company-voice "why we exist"). Specific rules
  // precede the /console/:path* catch-all.
  async redirects() {
    return [
      { source: '/console/calendar', destination: '/pm/schedule', permanent: true },
      { source: '/console/settings', destination: '/pm', permanent: true },
      { source: '/console', destination: '/pm', permanent: true },
      { source: '/console/:path*', destination: '/pm/:path*', permanent: true },
      // Commerce consolidation — Pricing + Services + Membership merged into /plans (IA audit,
      // founder-approved). Guest booking is retired; /book resolves to the one truthful start.
      { source: '/pricing', destination: '/plans', permanent: true },
      { source: '/services', destination: '/plans', permanent: true },
      { source: '/membership', destination: '/plans', permanent: true },
      { source: '/book', destination: '/auth?intent=join', permanent: true },
      { source: '/founder', destination: '/about', permanent: true },
      { source: '/founder-story', destination: '/about', permanent: true },
      { source: '/founder/start', destination: '/join', permanent: true },
      { source: '/founder/welcome', destination: '/join/welcome', permanent: true },
      { source: '/founder/membership', destination: '/join/membership', permanent: true },
      { source: '/founder/done', destination: '/join/done', permanent: true },
      // Workspace home consolidation — the single source of truth (lib/routing/redirects).
      // Empty in Phase 0; Phase 4 fills it as capabilities re-home under /space.
      ...WORKSPACE_REDIRECTS,
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            // Same-origin only. The app itself uses camera/mic (Guardian voice
            // notes, permission priming) and geolocation, so `self` — NOT the
            // empty allowlist, which would silently break those features.
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self)',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

// Sentry build wrapping is applied ONLY when a DSN is present at build time, so a build with no
// Sentry env vars is byte-for-byte the original config (zero impact). Source maps upload only when
// SENTRY_AUTH_TOKEN + org/project are also set; otherwise it silently no-ops.
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : nextConfig
