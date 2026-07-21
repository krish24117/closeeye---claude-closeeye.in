/**
 * The ONE Cloza engine — role-aware, provider-dispatched. The UI talks only to this; each role plugs
 * in a snapshot + provider. Founder is implemented today; Admin / PM / Guardian / Customer are
 * declared roles whose providers land later — the same engine and the same UI mount for them with no
 * duplication. Deterministic and grounded: answers come from role providers computing over live data.
 */
import type { ClozaAnswer, ClozaQuestion, ClozaRole } from './types'
import { FOUNDER_QUESTIONS, founderAnswer, founderAsk, founderBriefing, type FounderSnapshot } from './founder'

export type { FounderSnapshot }

export interface ClozaContext {
  role: ClozaRole
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

export function clozaAnswer(ctx: ClozaContext, questionId: string): ClozaAnswer {
  if (ctx.role === 'founder' && ctx.founder) return founderAnswer(ctx.founder, questionId)
  return notReadyForRole()
}

export function clozaAsk(ctx: ClozaContext, question: string): ClozaAnswer {
  if (ctx.role === 'founder' && ctx.founder) return founderAsk(ctx.founder, question)
  return notReadyForRole()
}

function notReadyForRole(): ClozaAnswer {
  return {
    title: 'Cloza isn’t available here yet',
    segments: [{ kind: 'unavailable', text: 'Cloza is live for the Founder Workspace first. Admin, Presence Manager, Guardian and Customer are coming — same copilot, their own view.' }],
    source: 'Cloza',
  }
}
