/**
 * The single owner of "which hosts are the global Connect front door vs the India door."
 *
 * One codebase serves multiple front doors (closeeye.app + connect.closeeye.in = global Connect;
 * closeeye.in = India). Several places need this classification — the routing middleware (what a
 * path means per host) and the sitemap (which pages to list per host). They MUST agree, so the set
 * lives here once and both import it. Never re-hardcode the host list elsewhere.
 */
export const CONNECT_FRONT_DOORS: ReadonlySet<string> = new Set([
  'closeeye.app',
  'www.closeeye.app',
  'connect.closeeye.in',
])

/** True when the request host is a global Connect front door (not the India marketing site). */
export function isConnectHost(host: string | null | undefined): boolean {
  const h = (host ?? '').toLowerCase().split(':')[0] ?? ''
  return CONNECT_FRONT_DOORS.has(h)
}
