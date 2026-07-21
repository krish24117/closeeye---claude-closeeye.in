/**
 * The ONE Cloza engine — a role PROVIDER REGISTRY. Adding a role = add a provider + one `bind` case;
 * the UI, the intent layer and the epistemic contract are shared, so nothing duplicates. The engine
 * orchestrates the layers (intent → provider) and threads scope + conversation history.
 *
 *   clozaAsk = resolveIntent(scope, question, provider.keywords, history) → provider.respond(intent)
 *
 * Founder and Presence Manager are implemented; Admin / Guardian / Customer slot in the same way.
 */
import type { ClozaAnswer, ClozaQuestion, ClozaRole, ClozaScope, ClozaIntent, ClozaTurn } from './types'
import { resolveIntent, type CapabilityKeywords } from './intent'
import { FOUNDER_QUESTIONS, FOUNDER_KEYWORDS, founderBriefing, founderRespond, type FounderSnapshot } from './founder'
import { PM_QUESTIONS, PM_KEYWORDS, presenceBriefing, presenceRespond, type PresenceSnapshot } from './pm'

export type { FounderSnapshot, PresenceSnapshot }

export interface ClozaContext {
  role: ClozaRole
  scope: ClozaScope
  founder?: FounderSnapshot
  presence?: PresenceSnapshot
}

interface Bound {
  questions: ClozaQuestion[]
  keywords: CapabilityKeywords
  briefing: () => ClozaAnswer
  respond: (intent: ClozaIntent) => ClozaAnswer
}

/** Resolve the context to a provider bound to its snapshot — the one place roles are wired. */
function bind(ctx: ClozaContext): Bound | null {
  if (ctx.role === 'founder' && ctx.founder) {
    const s = ctx.founder
    return { questions: FOUNDER_QUESTIONS, keywords: FOUNDER_KEYWORDS, briefing: () => founderBriefing(s), respond: (i) => founderRespond(s, ctx.scope, i) }
  }
  if (ctx.role === 'presence_manager' && ctx.presence) {
    const s = ctx.presence
    return { questions: PM_QUESTIONS, keywords: PM_KEYWORDS, briefing: () => presenceBriefing(s), respond: (i) => presenceRespond(s, ctx.scope, i) }
  }
  return null
}

export function clozaQuestions(ctx: ClozaContext): ClozaQuestion[] {
  return bind(ctx)?.questions ?? []
}

export function clozaBriefing(ctx: ClozaContext): ClozaAnswer | null {
  return bind(ctx)?.briefing() ?? null
}

export function clozaCapability(ctx: ClozaContext, capabilityId: string): ClozaAnswer {
  const b = bind(ctx)
  return b ? b.respond({ capability: capabilityId, isFollowUp: false }) : notReadyForRole()
}

export function clozaAsk(ctx: ClozaContext, question: string, history: ClozaTurn[] = []): ClozaAnswer {
  const b = bind(ctx)
  if (!b) return notReadyForRole()
  return b.respond(resolveIntent(ctx.scope, question, b.keywords, history))
}

function notReadyForRole(): ClozaAnswer {
  return {
    title: 'Cloza isn’t available here yet',
    segments: [{ kind: 'unavailable', text: 'Cloza is live for the Founder and Presence Manager workspaces first. Admin, Guardian and Customer are coming — same copilot, their own view.' }],
    source: 'Cloza',
  }
}
