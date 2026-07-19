/**
 * Track 2, Step 4 — the understanding endpoint (POST /api/understand).
 *
 * A Next route handler, so it deploys with the normal git push (Vercel) — no Supabase CLI. It
 * runs the pipeline on the first-conversation input and returns the Decision the UI renders. The
 * only config it needs is ANTHROPIC_API_KEY in the Vercel environment; without it, comprehension
 * degrades to "Close Eye asks" (never a crash). Public + signed-out, so it is deliberately thin.
 */
import { understandOnce } from '@/lib/connect/understand-service'

export const runtime = 'nodejs'

// TEMP diagnostic — reports whether the key reached this deployment's runtime. Leaks NO value
// (only presence, length, and a 7-char prefix to confirm it looks like an Anthropic key). Remove
// once comprehension is confirmed live.
export async function GET(): Promise<Response> {
  const k = process.env.ANTHROPIC_API_KEY
  return Response.json({ keyPresent: !!k, keyLength: k?.length ?? 0, prefix: k ? k.slice(0, 7) : null })
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  const input = typeof (body as { input?: unknown })?.input === 'string' ? (body as { input: string }).input.trim() : ''
  if (!input || input.length > 2000) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    const decision = await understandOnce(input)
    return Response.json(decision)
  } catch {
    // The pipeline itself is fail-safe (comprehend catches model errors); this guards the unexpected.
    return Response.json({ lane: 'ask', understanding: null, question: 'Something interrupted me — could you say that again?' })
  }
}
