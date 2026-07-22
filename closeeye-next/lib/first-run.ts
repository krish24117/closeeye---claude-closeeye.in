/**
 * First-run hand-off — a one-shot pointer to the person a user just created in onboarding.
 *
 * AuthGate authoritatively routes a freshly-onboarded family user to the Workspace home
 * (/space). To open that first person's Space instead (the guided first task) without fighting
 * the gate, onboarding leaves this marker and the Workspace home consumes it from inside its own
 * context — a clean hand-off, no redirect race. Read-once: it clears itself on take.
 */
const KEY = 'closeeye.firstPerson'

export function markFirstPerson(id: string): void {
  if (typeof window === 'undefined' || !id) return
  try { localStorage.setItem(KEY, id) } catch {}
}

/** Return the pending first-person id (once), clearing it so it never fires twice. */
export function takeFirstPerson(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const v = localStorage.getItem(KEY)
    if (v) localStorage.removeItem(KEY)
    return v || null
  } catch { return null }
}
