/**
 * Track 2, Step 4 — the understanding service. Proves the real wiring end-to-end with a mocked
 * model: a crisis escalates BEFORE any model call (Law 4); a normal message comprehends and
 * answers. No API key, no network.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { understandOnce, safetyCheck } from './understand-service'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('safetyCheck maps the deterministic crisis floor', () => {
  it('a crisis phrase → an escalation verdict', () => {
    expect(safetyCheck('she is not breathing')).not.toBeNull()
  })
  it('a normal message → null', () => {
    expect(safetyCheck('My mother is travelling from Hyderabad to Bangalore')).toBeNull()
  })
})

describe('understandOnce', () => {
  it('a crisis escalates WITHOUT calling the model (Law 4)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const d = await understandOnce('she is not breathing')
    expect(d.lane).toBe('escalate')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a normal message comprehends via the model → answer, no fabrication', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    const good = JSON.stringify({
      intent: 'share',
      subject: { who: 'my mother', relationship: 'mother' },
      situation: 'travelling',
      need: 'none_stated',
      locations: { from: 'Hyderabad', to: 'Bangalore' },
      facts: [],
      confidence: 'high',
      clarifying_question: null,
      safety_signal: false,
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ content: [{ type: 'text', text: good }] }), { status: 200 })))

    const d = await understandOnce('My mother is travelling from Hyderabad to Bangalore')
    expect(d.lane).toBe('answer')
    if (d.lane === 'answer') {
      expect(d.understanding.subject.who).toBe('my mother') // a person, never the city
      expect(d.understanding.locations.from).toBe('Hyderabad')
    }
  })

  it('a model failure degrades to ask, never a crash or a guess', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })))
    const d = await understandOnce('My father lives in Pune')
    expect(d.lane).toBe('ask')
  })
})
