/**
 * Track 2, Step 4 — the client seam. The Connect UI (Step 5) calls this; it POSTs to the
 * understanding endpoint and returns the Decision. On any transport failure it degrades to an
 * honest "ask", never a fabricated answer.
 */
import type { Decision } from './pipeline'

export async function requestUnderstanding(input: string): Promise<Decision> {
  try {
    const res = await fetch('/api/understand', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input }),
    })
    if (!res.ok) throw new Error(`understand ${res.status}`)
    return (await res.json()) as Decision
  } catch {
    return { lane: 'ask', understanding: null as never, question: 'I couldn’t reach my thoughts just now — could you try again?' }
  }
}
