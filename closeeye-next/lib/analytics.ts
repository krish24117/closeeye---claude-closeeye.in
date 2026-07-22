/**
 * Product analytics — DORMANT unless NEXT_PUBLIC_POSTHOG_KEY is set. A complete no-op with no key.
 *
 * We measure customer VALUE (product-market fit), not marketing metrics:
 *  - autocapture, pageviews, pageleave, and session recording are all OFF.
 *  - only the eight PMF events below are ever sent, with a strict, non-PII property allow-list.
 *  - person profiles are `identified_only`: events flow under an ANONYMOUS id until consent allows
 *    identification (identifyUser is wired by the consent layer in Phase 3 — never called before).
 *
 * No name, email, phone, address, question text, or health content is ever sent — the sanitizer
 * drops any such key and keeps only short scalar product signals.
 */
import type { PostHog } from 'posthog-js'

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

export const analyticsEnabled = !!KEY

/** The only events we send — the PMF funnel. Anything else is out of scope by construction. */
export type AnalyticsEvent =
  | 'signed_up'
  | 'onboarding_completed'
  | 'loved_one_added'
  | 'first_question_asked'
  | 'answer_received'
  | 'follow_up_asked'
  | 'conversation_reopened'
  | 'memory_added'

type Props = Record<string, string | number | boolean>

// Keys that must NEVER reach analytics, even if a caller passes them by mistake.
const PII_KEY = /name|email|phone|mobile|address|question|text|body|content|note|city|dob|token/i

export function sanitize(props: Props): Props {
  const out: Props = {}
  for (const [k, v] of Object.entries(props)) {
    if (PII_KEY.test(k)) continue
    if (typeof v === 'string') out[k] = v.slice(0, 64)
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v
  }
  return out
}

// The SDK is DYNAMICALLY imported only when a key exists, so with no key posthog-js is never fetched,
// parsed, or added to the first-load bundle — a complete no-op with zero client impact.
let ph: PostHog | null = null
let initStarted = false
// Events fired before the async SDK import resolves are buffered here and replayed on load, so an
// early event (e.g. signed_up, moments after page load) is never dropped.
const queue: Array<[AnalyticsEvent, Props]> = []

/** Initialise PostHog once, client-side, only if a key is present. Called by <AnalyticsProvider>. */
export function initAnalytics(): void {
  if (!KEY || initStarted || typeof window === 'undefined') return
  initStarted = true
  void import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        person_profiles: 'identified_only',
        persistence: 'localStorage+cookie',
        // Even PostHog's own default properties must not carry family-identifying data: redact any
        // id in the URL/path (e.g. /space/people/<uuid> → /space/people/:id), drop query strings and
        // referrers. Belt-and-braces with the per-event sanitizer above.
        sanitize_properties: (props) => {
          const redact = (u: unknown) =>
            typeof u === 'string'
              ? u.split('?')[0]!.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '/:id')
              : u
          if (props.$current_url) props.$current_url = redact(props.$current_url)
          if (props.$pathname) props.$pathname = redact(props.$pathname)
          delete props.$referrer
          delete props.$referring_domain
          delete props.$initial_referrer
          delete props.$initial_referring_domain
          return props
        },
      })
      ph = posthog
      // Replay anything captured before the SDK finished loading.
      for (const [e, prProps] of queue.splice(0)) {
        try { posthog.capture(e, prProps) } catch { /* ignore */ }
      }
    })
    .catch(() => {
      initStarted = false
    })
}

/** Send a PMF event. Buffered until PostHog loads, then flushed. Properties are sanitized to non-PII. */
export function track(event: AnalyticsEvent, props: Props = {}): void {
  if (!KEY || typeof window === 'undefined') return
  const clean = sanitize(props)
  if (!ph) {
    queue.push([event, clean])
    return
  }
  try {
    ph.capture(event, clean)
  } catch {
    /* analytics must never break a user flow */
  }
}

/** Associate events with a stable id — ONLY once consent permits identification (Phase 3). */
export function identifyUser(id: string): void {
  if (!ph || !id) return
  try {
    ph.identify(id)
  } catch {
    /* no-op */
  }
}

/** Clear the identity on sign-out so a shared device doesn't blend two people's funnels. */
export function resetAnalytics(): void {
  if (!ph) return
  try {
    ph.reset()
  } catch {
    /* no-op */
  }
}
