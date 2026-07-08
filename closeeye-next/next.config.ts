import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

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
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self'",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ')

const nextConfig: NextConfig = {
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

export default nextConfig
