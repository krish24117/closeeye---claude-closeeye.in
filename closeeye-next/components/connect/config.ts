/**
 * Close Eye Connect — launch-mode configuration.
 *
 * ONE switch drives the whole /connect experience through its launch lifecycle.
 * Set NEXT_PUBLIC_CONNECT_MODE in the environment; defaults to `preview` so the
 * page can NEVER look publicly live by accident.
 *
 *   preview          — internal review only (ribbon shown, not indexed, no real sign-up)
 *   early_access     — invite-only, before the public launch
 *   public           — the August 1 public launch (Founding 1,000 open)
 *   closed_waitlist  — after the first 1,000 places are taken
 */
export type LaunchMode = 'preview' | 'early_access' | 'public' | 'closed_waitlist'

const MODES: readonly LaunchMode[] = ['preview', 'early_access', 'public', 'closed_waitlist']

export function getLaunchMode(): LaunchMode {
  const m = (process.env.NEXT_PUBLIC_CONNECT_MODE || '').toLowerCase()
  return (MODES as readonly string[]).includes(m) ? (m as LaunchMode) : 'preview'
}

export interface ModeConfig {
  /** Hero pill label. */
  pill: string
  /** Founding-section copy. */
  founding: { headline: string; body: string; cta: string; note: string }
  /**
   * When true, the founding form hands off to the existing founder sign-up
   * (/auth?intent=founding) — reusing the real registration flow. When false
   * (preview), it shows a client-side confirmation only and creates nothing.
   */
  handoff: boolean
  /** Show the fixed "internal preview" ribbon. */
  showRibbon: boolean
  /** Allow search engines to index the page (public launch only). */
  indexable: boolean
}

export const MODE_CONFIG: Record<LaunchMode, ModeConfig> = {
  preview: {
    pill: 'Preview · not yet public',
    founding: {
      headline: 'Be one of the first 1,000 families.',
      body: 'This is an internal preview of the Founding 1,000 experience. Public sign-up opens on August 1.',
      cta: 'Preview the sign-up',
      note: 'Internal preview — no account is created.',
    },
    handoff: false,
    showRibbon: true,
    indexable: false,
  },
  early_access: {
    pill: 'Early access · by invitation',
    founding: {
      headline: 'Reserve your family’s place.',
      body: 'You’ve been invited to join Close Eye Connect ahead of launch, as one of our first founding families. Your place is held.',
      cta: 'Reserve your place',
      note: 'By invitation. Nothing to pay today.',
    },
    handoff: true,
    showRibbon: false,
    indexable: false,
  },
  public: {
    pill: 'Founding 1,000 · Launching August 1',
    founding: {
      headline: 'Reserve your family’s place.',
      body: 'We’re holding a founding place for the first 1,000 families — the ones who help shape Close Eye Connect. Claim yours before we open on August 1.',
      cta: 'Reserve your family’s place',
      note: 'Your place, held to your email. Nothing to pay today.',
    },
    handoff: true,
    showRibbon: false,
    indexable: true,
  },
  closed_waitlist: {
    pill: 'Founding 1,000 — now full',
    founding: {
      headline: 'The first 1,000 places are taken.',
      body: 'Our founding families are in. Join the waitlist and we’ll hold the next place for the people you love.',
      cta: 'Join the waitlist',
      note: 'We’ll be in touch as places open.',
    },
    handoff: true,
    showRibbon: false,
    indexable: false,
  },
}
