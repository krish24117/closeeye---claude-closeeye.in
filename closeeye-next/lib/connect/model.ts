/**
 * Track 2, Step 4 — the real ModelCaller (Architecture Constitution, Article IX: provider behind
 * one seam). A dependency-free call to Anthropic's Messages API on the FIRST CAPABLE tier (Haiku);
 * the regression eval decides if that tier is capable, else we bump the id here — nothing else moves.
 *
 * If the key is absent or the call fails, this THROWS — comprehend() catches it and returns the
 * ask-fallback, so a misconfiguration degrades to "Close Eye asks", never a crash or a fabrication.
 */
import type { ModelCaller } from './comprehend'

/** First capable tier. Bump only if the regression eval proves Haiku isn't enough. */
const MODEL = 'claude-haiku-4-5-20251001'

export const anthropicCaller: ModelCaller = async (system, user) => {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      temperature: 0, // comprehension is extraction, not creativity — keep it deterministic
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })

  if (!res.ok) throw new Error(`anthropic ${res.status}`)
  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  const text = data.content?.find((b) => b.type === 'text')?.text ?? ''
  if (!text) throw new Error('anthropic empty response')
  return text
}
