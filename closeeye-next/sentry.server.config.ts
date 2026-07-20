// Sentry — SERVER (Node.js) runtime init. Dormant unless NEXT_PUBLIC_SENTRY_DSN is set.
// Imported by instrumentation.ts register() only when a DSN is present.
import * as Sentry from '@sentry/nextjs'
import { SENTRY_DSN, commonSentryOptions } from '@/lib/observability/sentry.shared'

if (SENTRY_DSN) {
  Sentry.init({ ...commonSentryOptions })
}
