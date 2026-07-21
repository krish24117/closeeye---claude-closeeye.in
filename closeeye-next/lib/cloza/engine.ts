/**
 * The ONE Cloza engine — it ORCHESTRATES the layers (intent → provider), stays role-aware, and is the
 * only thing the UI talks to. Founder is implemented; Admin / PM / Guardian / Customer are declared
 * roles whose providers land later and mount the same engine + UI with no duplication.
 *
 *   clozaAsk = resolveIntent(scope, question, history)  →  role provider (analysis + recommendation + actions)
 *
 * Multi-turn: pass the conversation `history` and follow-ups ("break that down", "compare X and Y")
 * inherit the previous turn's capability. Context: the `scope` on the context is threaded through, so
 * Cloza already knows the role, date range and city without being told.
 */
import type { ClozaAnswer, ClozaQuestion, ClozaRole, ClozaScope, ClozaTurn } from './types'
import { resolveIntent } from './intent'
import { FOUNDER_QUESTIONS, founderBriefing, founderRespond, type FounderSnapshot } from './founder'

export type { FounderSnapshot }

export interface ClozaContext {
  role: ClozaRole
  scope: ClozaScope
  /** Present for role 'founder'. Future roles add their own snapshot field. */
  founder?: FounderSnapshot
}

export function clozaQuestions(ctx: ClozaContext): ClozaQuestion[] {
  if (ctx.role === 'founder' && ctx.founder) return FOUNDER_QUESTIONS
  return []
}

export function clozaBriefing(ctx: ClozaContext): ClozaAnswer | null {
  if (ctx.role === 'founder' && ctx.founder) return founderBriefing(ctx.founder)
  return null
}

/** Answer a specific capability (a suggested-question chip). */
export function clozaCapability(ctx: ClozaContext, capabilityId: string): ClozaAnswer {
  if (ctx.role === 'founder' && ctx.founder) {
    return founderRespond(ctx.founder, ctx.scope, { capability: capabilityId, isFollowUp: false })
  }
  return notReadyForRole()
}

/** Answer a free-text question, in the context of the conversation so far. */
export function clozaAsk(ctx: ClozaContext, question: string, history: ClozaTurn[] = []): ClozaAnswer {
  if (ctx.role === 'founder' && ctx.founder) {
    const intent = resolveIntent(ctx.scope, question, history)
    return founderRespond(ctx.founder, ctx.scope, intent)
  }
  return notReadyForRole()
}

function notReadyForRole(): ClozaAnswer {
  return {
    title: 'Cloza isn’t available here yet',
    segments: [{ kind: 'unavailable', text: 'Cloza is live for the Founder Workspace first. Admin, Presence Manager, Guardian and Customer are coming — same copilot, their own view.' }],
    source: 'Cloza',
  }
}
