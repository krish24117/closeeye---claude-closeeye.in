/**
 * Track 2, Step 3 gate — the pipeline. The canonical order holds: safety is first and
 * unconditional (a crisis never spends an LLM call), unsure asks, help routes to Care, and stated
 * facts are remembered only where the family actually shared something.
 */
import { describe, it, expect, vi } from 'vitest'
import { understand, type PipelineDeps } from './pipeline'
import type { Understanding } from './comprehension'

const mk = (p: Partial<Understanding>): Understanding => ({
  intent: 'share',
  subject: { who: 'my mother', relationship: 'mother' },
  situation: 'travelling',
  need: 'none_stated',
  locations: {},
  facts: [],
  confidence: 'high',
  clarifying_question: null,
  reflection: null,
  safety_signal: false,
  ...p,
})

const deps = (over: Partial<PipelineDeps>): PipelineDeps => ({
  safetyCheck: () => null,
  comprehend: async () => mk({}),
  ...over,
})

describe('safety is first and unconditional (Law 4)', () => {
  it('a crisis escalates and NEVER calls the model', async () => {
    const comprehend = vi.fn(async () => mk({}))
    const d = await understand('she is not breathing', deps({
      safetyCheck: () => ({ message: 'Call emergency services', ambulanceNumber: '108' }),
      comprehend,
    }))
    expect(d.lane).toBe('escalate')
    expect(comprehend).not.toHaveBeenCalled()
  })
})

describe('disposal routes correctly', () => {
  it('a clear share → answer, and remembers the stated facts', async () => {
    const remember = vi.fn(async () => {})
    const d = await understand('my mother is travelling', deps({
      comprehend: async () => mk({ facts: [{ label: 'situation', value: 'travelling', provenance: 'stated' }] }),
      remember,
    }))
    expect(d.lane).toBe('answer')
    expect(remember).toHaveBeenCalledOnce()
  })

  it('low confidence → ask, with the model’s question, and does NOT remember', async () => {
    const remember = vi.fn(async () => {})
    const d = await understand('Amma', deps({
      comprehend: async () => mk({ confidence: 'low', clarifying_question: 'Who is Amma to you?', facts: [{ label: 'x', value: 'y', provenance: 'stated' }] }),
      remember,
    }))
    expect(d.lane).toBe('ask')
    if (d.lane === 'ask') expect(d.question).toBe('Who is Amma to you?')
    expect(remember).not.toHaveBeenCalled()
  })

  it('unclear intent → ask (with a default question when none given)', async () => {
    const d = await understand('asdfgh', deps({ comprehend: async () => mk({ intent: 'unclear', clarifying_question: null }) }))
    expect(d.lane).toBe('ask')
    if (d.lane === 'ask') expect(d.question.length).toBeGreaterThan(0)
  })

  it('a request for help → Care', async () => {
    const d = await understand('can someone visit my father', deps({ comprehend: async () => mk({ intent: 'request_help', need: 'someone to visit' }) }))
    expect(d.lane).toBe('care')
  })

  it('a presence need phrased as a share → Care', async () => {
    const d = await understand('…', deps({ comprehend: async () => mk({ need: 'a hand to help her settle in' }) }))
    expect(d.lane).toBe('care')
  })

  it('a greeting → decline', async () => {
    const d = await understand('hi there', deps({ comprehend: async () => mk({ intent: 'greeting' }) }))
    expect(d.lane).toBe('decline')
  })
})

describe('retrieve is best-effort — a failure degrades, never blocks', () => {
  it('a retrieve error still yields a grounded-answer lane', async () => {
    const d = await understand('my mother is well', deps({
      comprehend: async () => mk({}),
      retrieve: async () => { throw new Error('db down') },
    }))
    expect(d.lane).toBe('answer')
    if (d.lane === 'answer') expect(d.context).toBeNull()
  })
})
