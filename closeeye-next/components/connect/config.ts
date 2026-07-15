/**
 * Close Eye Connect — launch-mode configuration.
 *
 * ONE switch drives whether /connect is indexed through its launch lifecycle.
 * Set NEXT_PUBLIC_CONNECT_MODE in the environment; defaults to `preview` so the
 * page can NEVER be indexed by accident before the public launch.
 *
 *   preview          — internal review only (not indexed)
 *   early_access     — invite-only, before the public launch (not indexed)
 *   public           — the public launch (indexed)
 *   closed_waitlist  — after the first places are taken (not indexed)
 */
export type LaunchMode = 'preview' | 'early_access' | 'public' | 'closed_waitlist'

const MODES: readonly LaunchMode[] = ['preview', 'early_access', 'public', 'closed_waitlist']

export function getLaunchMode(): LaunchMode {
  const m = (process.env.NEXT_PUBLIC_CONNECT_MODE || '').toLowerCase()
  return (MODES as readonly string[]).includes(m) ? (m as LaunchMode) : 'preview'
}

/** Only the public launch is indexable by search engines. */
export function isConnectIndexable(): boolean {
  return getLaunchMode() === 'public'
}
