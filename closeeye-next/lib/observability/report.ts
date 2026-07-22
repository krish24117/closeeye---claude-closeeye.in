/**
 * Report a caught error to Sentry from an error boundary. When no DSN is configured this returns
 * immediately and the Sentry SDK is never imported — so error boundaries add zero bundle weight while
 * dormant. Wrapped so a reporting failure never breaks the boundary.
 */
export function reportError(error: unknown): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  void import('@sentry/nextjs')
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => {
      /* never let telemetry crash the UI */
    })
}
