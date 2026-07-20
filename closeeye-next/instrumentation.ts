// Next.js instrumentation hook. Sentry is DYNAMICALLY imported only when a DSN is present, so with
// no env var the Sentry SDK is never bundled into the server/edge runtime — zero impact while dormant.

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config')
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config')
}

// Captures errors thrown in server components / route handlers. No-op (and no import) without a DSN.
export async function onRequestError(...args: unknown[]) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  const Sentry = await import('@sentry/nextjs')
  return (Sentry.captureRequestError as (...a: unknown[]) => void)(...args)
}
