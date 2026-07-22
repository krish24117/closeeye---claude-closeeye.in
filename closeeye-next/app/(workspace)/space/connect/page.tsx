/**
 * Connect (Owner: Connect, /space/connect). The product's conversational intelligence — it
 * understands before it answers, and never fabricates. Renders the Track-2 understanding-first
 * experience (components/connect/understanding-conversation) via /api/understand. The older
 * ask-health chat is superseded; grounded-answer composition + history is the next increment.
 *
 * `?q=` seeds the conversation — that is how the orb's Connect sheet (the dock's fast lane) hands
 * a question off to the real engine without the person retyping.
 */
import { UnderstandingConversation } from '@/components/connect/understanding-conversation'


export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams
  const seed = Array.isArray(q) ? q[0] : q

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-h2 text-ink">Connect</h1>
        <p className="mt-1 text-body-sm text-muted">Your family’s intelligence — it understands before it answers.</p>
      </div>
      <UnderstandingConversation seed={seed} />
    </div>
  )
}
