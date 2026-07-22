// Sentry — CLIENT runtime init. Dormant unless NEXT_PUBLIC_SENTRY_DSN is set.
// The SDK is DYNAMICALLY imported only when a DSN exists, so with no DSN it is never fetched,
// parsed, or added to the first-load bundle — truly zero client impact. No session replay / no PII.
import { SENTRY_DSN, commonSentryOptions } from '@/lib/observability/sentry.shared'

if (SENTRY_DSN) {
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({ ...commonSentryOptions })
  })
}
