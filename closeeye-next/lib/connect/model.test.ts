/**
 * Track 2, Step 4 — the real ModelCaller, proven with a mocked fetch (no key, no network).
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { anthropicCaller } from './model'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('anthropicCaller', () => {
  it('throws when the key is missing (→ comprehend degrades to ask)', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    await expect(anthropicCaller('sys', 'usr')).rejects.toThrow()
  })

  it('builds the request and extracts the text', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ content: [{ type: 'text', text: '{"ok":1}' }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const out = await anthropicCaller('SYSTEM', 'USER')
    expect(out).toBe('{"ok":1}')

    const [url, opts] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toContain('api.anthropic.com')
    const body = JSON.parse(opts.body as string)
    expect(body.system).toBe('SYSTEM')
    expect(body.messages[0].content).toBe('USER')
    expect(body.temperature).toBe(0)
  })

  it('throws on a non-ok response', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 500 })))
    await expect(anthropicCaller('s', 'u')).rejects.toThrow()
  })
})
