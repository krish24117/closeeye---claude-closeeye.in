/**
 * Shared Sentry configuration — DORMANT unless NEXT_PUBLIC_SENTRY_DSN is set.
 *
 * Everything Sentry keys off this one flag. With no DSN, init() is never called (see the three
 * runtime config files), withSentryConfig is not applied (next.config), and there is zero runtime
 * impact. Adding the DSN env var + a redeploy is the only step to activate it — no code change.
 *
 * Privacy (founder requirement): sendDefaultPii is OFF, and beforeSend/beforeBreadcrumb strip
 * cookies, headers, query strings, request bodies, and any user field except an opaque id — so no
 * personal or family content ever leaves the app in an error report.
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
export const sentryEnabled = !!SENTRY_DSN

const num = (v: string | undefined, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function scrubEvent(event: any): any | null {
  const req = event?.request
  if (req) {
    delete req.cookies
    delete req.headers
    delete req.data
    delete req.query_string
    if (typeof req.url === 'string') req.url = req.url.split('?')[0]
  }
  if (event?.user) {
    event.user = event.user.id ? { id: String(event.user.id) } : {}
  }
  return event
}

function scrubBreadcrumb(bc: any): any | null {
  if (bc?.data) {
    delete bc.data.body
    delete bc.data.arguments
    delete bc.data.input
  }
  return bc
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Options shared by the client, server, and edge Sentry inits. */
export const commonSentryOptions = {
  dsn: SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.VERCEL_ENV || 'development',
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || undefined,
  tracesSampleRate: num(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),
  sendDefaultPii: false,
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
}
