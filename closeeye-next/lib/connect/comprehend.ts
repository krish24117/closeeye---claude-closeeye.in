/**
 * Track 2, Step 2 — the comprehension core.
 *
 * comprehend(input) → Understanding. The model sits behind ONE interface (ModelCaller), so the
 * provider is replaceable (Architecture Constitution, Article IX) and tests inject a mock. The
 * model's raw output is PARSED into the closed contract and run through the Step-1 net; anything
 * that fabricates or malforms is discarded and replaced with a safe "unclear → ask" — a violating
 * understanding is never returned (Understanding Constitution, Law 2).
 */
import { validateUnderstanding, UNKNOWN, type Understanding } from './comprehension'
import { COMPREHENSION_CASES, checkCase } from './comprehension.cases'

/** The only seam to the model. Real impl (Anthropic / gateway) is injected at the edge (Step 4). */
export type ModelCaller = (system: string, user: string) => Promise<string>

export interface ComprehendContext {
  /** Known people in this family — helps resolve "she"/"mother"/"Amma" to a real subject. */
  knownPeople?: { name: string; relationship: string | null }[]
}

/** The system prompt — the contract and the Constitution's rules, in the model's instructions. */
export function buildSystemPrompt(ctx?: ComprehendContext): string {
  const people = ctx?.knownPeople?.length
    ? `\nThis family already includes: ${ctx.knownPeople.map((p) => `${p.name}${p.relationship ? ` (${p.relationship})` : ''}`).join(', ')}. Resolve references to them when you can.`
    : ''
  return `You are Close Eye's understanding layer. Read one message from a family member and return ONLY a JSON object — no prose, no code fences — with EXACTLY this shape:

{
  "intent": "share" | "ask" | "request_help" | "greeting" | "unclear",
  "subject": { "who": "<the PERSON they mean: 'my mother', 'Amma', 'self'>" | "unknown",
               "relationship": "mother|father|…" | "unknown" },
  "situation": "<what is happening>" | "unknown",
  "need": "<a request they made>" | "none_stated" | "unknown",
  "locations": { "from": "…", "to": "…", "lives_in": "…" },   // include only those actually said
  "facts": [ { "label": "…", "value": "<their exact words>", "provenance": "stated" } ],
  "confidence": "high" | "low",
  "clarifying_question": "<one short question>" | null,
  "safety_signal": true | false
}

Rules, in order of importance:
1. subject.who is a PERSON. A city, a document, or a thing may NEVER go there. If you can't tell who the person is, use "unknown".
2. Never invent. "unknown" is always allowed and is better than a guess. need is "none_stated" unless they actually asked for something.
3. Keep travel and residence separate: "travelling from X to Y" fills locations.from / locations.to — never lives_in.
4. facts contain ONLY the family's actual words. Do not add readings or conclusions as facts.
5. If you are unsure of who or what they mean, set confidence "low" and ask ONE clarifying_question. Ask; never assume.
6. safety_signal is a soft hint only.${people}`
}

/** Extract and parse the JSON object from the model's reply. Returns null on anything unparseable. */
export function parseUnderstanding(raw: string): Understanding | null {
  if (!raw) return null
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null
  let obj: Record<string, unknown>
  try { obj = JSON.parse(raw.slice(start, end + 1)) } catch { return null }

  const subject = obj.subject as Record<string, unknown> | undefined
  const locations = (obj.locations as Record<string, unknown> | undefined) ?? {}
  const facts = Array.isArray(obj.facts) ? obj.facts : []
  // Minimal shape check — the required keys must be the right type, else it's not our contract.
  if (typeof obj.intent !== 'string' || !subject || typeof subject.who !== 'string') return null

  const str = (x: unknown, d: string = UNKNOWN): string => (typeof x === 'string' && x.trim() ? x : d)
  return {
    intent: str(obj.intent, 'unclear') as Understanding['intent'],
    subject: { who: str(subject.who), relationship: str(subject.relationship) },
    situation: str(obj.situation),
    need: str(obj.need, 'none_stated'),
    locations: {
      from: typeof locations.from === 'string' ? locations.from : undefined,
      to: typeof locations.to === 'string' ? locations.to : undefined,
      lives_in: typeof locations.lives_in === 'string' ? locations.lives_in : undefined,
    },
    facts: facts
      .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
      .map((f) => ({ label: str(f.label, ''), value: str(f.value, ''), provenance: 'stated' as const }))
      .filter((f) => f.value),
    confidence: obj.confidence === 'high' ? 'high' : 'low',
    clarifying_question: typeof obj.clarifying_question === 'string' && obj.clarifying_question.trim() ? obj.clarifying_question : null,
    safety_signal: obj.safety_signal === true,
  }
}

/** The safe fallback — Close Eye asks rather than assumes (Law 2). Never fabricates. */
export function askFallback(question = "I didn't quite follow — could you tell me a little more about who this is and what's happening?"): Understanding {
  return {
    intent: 'unclear',
    subject: { who: UNKNOWN, relationship: UNKNOWN },
    situation: UNKNOWN,
    need: UNKNOWN,
    locations: {},
    facts: [],
    confidence: 'low',
    clarifying_question: question,
    safety_signal: false,
  }
}

/**
 * Comprehend one message. Always returns a Constitution-compliant Understanding: if the model
 * errors, malforms, or fabricates (fails the net), the result is the ask-fallback — never the
 * bad understanding.
 */
export async function comprehend(input: string, callModel: ModelCaller, ctx?: ComprehendContext): Promise<Understanding> {
  let raw: string
  try {
    raw = await callModel(buildSystemPrompt(ctx), input)
  } catch {
    return askFallback()
  }
  const parsed = parseUnderstanding(raw)
  if (!parsed) return askFallback()
  if (validateUnderstanding(parsed, input).length > 0) return askFallback() // a violating understanding is never presented
  return parsed
}

export interface EvalResult { name: string; input: string; fails: string[] }

/**
 * The regression EVAL — run comprehend() over the pinned cases and score with checkCase. Pass a
 * MOCK caller in CI; pass the real (Anthropic) caller in the live gate to prove the first-capable
 * tier is "capable". A non-empty `fails` on any case blocks the merge.
 */
export async function evaluateComprehension(callModel: ModelCaller, ctx?: ComprehendContext): Promise<EvalResult[]> {
  const out: EvalResult[] = []
  for (const c of COMPREHENSION_CASES) {
    const u = await comprehend(c.input, callModel, ctx)
    out.push({ name: c.name, input: c.input, fails: checkCase(u, c) })
  }
  return out
}

