/**
 * Concierge slot regression — Phase 2 (founder-approved 2026-07-24).
 *
 * THE FIX RULE (same law as cases.test.ts): a failing case is fixed by GENERALIZING the slot,
 * never by matching the sentence — every slot pins ≥2 paraphrase siblings so an overfit fix
 * breaks a sibling. Append-only: never delete a case.
 *
 * MUST-NOTS are the safety contract: crisis text, medical questions and family-fact questions
 * must NEVER produce a concierge card (crisis is handled a layer above — answer.ts only reaches
 * the concierge after the escalate lane returned — but the classifier itself must also refuse).
 */
import { describe, it, expect } from 'vitest'
import { detectConcierge } from './concierge'

const CHIP = (q: string) => detectConcierge(q)?.chips[0] ?? null
const LEAD = (q: string) => detectConcierge(q)?.lead ?? null

describe('concierge slots — each with paraphrase siblings', () => {
  it.each([
    // slot: admin (taxes / paperwork / banking)
    ['How can Close Eye help with my family’s taxes?', 'Administration'],
    ['Can you help file my mother’s ITR?', 'Administration'],
    ['Need help with dad’s income tax filing this year', 'Administration'],
    ['Can someone help with her bank KYC paperwork?', 'Administration'],
    // slot: legal
    ['Can you help find a trusted lawyer near my family?', 'Legal coordination'],
    ['How do I find an advocate for the property papers?', 'Legal coordination'],
    ['We need legal help with property registration for amma', 'Legal coordination'],
    // slot: errand
    ['Can someone get groceries for my mother this week?', 'Custom Request'],
    ['Need medicines picked up from the pharmacy for dad', 'Custom Request'],
    ['Could you arrange the shopping and errands for her?', 'Custom Request'],
    // slot: hospital
    ['Can someone be with mom for her hospital admission?', 'Hospital Companion'],
    ['I need a companion for my father’s surgery day', 'Hospital Companion'],
    ['Who can help when she is admitted next week?', 'Hospital Companion'],
    // slot: visit
    ['Can you book a wellbeing visit for my mother?', 'Wellbeing visit'],
    ['I want someone to check in on dad this weekend', 'Wellbeing visit'],
    ['Please arrange a companion to spend time with amma', 'Wellbeing visit'],
  ])('%s → %s', (q, chip) => {
    expect(CHIP(q)).toBe(chip)
  })

  it.each([
    // slot: plan question (generic cost/plan asks → the one-question flow)
    'What would this cost for my mother?',
    'How much do you charge?',
    'What are your plans and pricing?',
    'Tell me the subscription fees please',
  ])('plan question: %s → the one-question flow', (q) => {
    expect(LEAD(q)).toBe('Let me ask one thing first.')
  })

  it.each([
    ['Help occasionally, when we need it', 'Pay as You Go'],
    ['Keep us prepared, just in case', 'Close Eye Membership'],
    ['Someone consistently looking after them', 'Close Eye Presence'],
  ])('plan choice: %s → %s', (q, chip) => {
    expect(CHIP(q)).toBe(chip)
  })
})

describe('MUST-NOT — the concierge refuses what is not its job', () => {
  it.each([
    // crisis text — the floor owns these a layer above; the classifier must also refuse
    'My mother is not breathing',
    'Help — she has collapsed and is unconscious',
    'Severe chest pain right now, what do we do',
    // medical questions — the medical guard owns these
    'What medicine should my mother take for her BP?',
    'Can you tell me the right dose of metformin?',
    // family-fact questions — the grounded path owns these
    'How is Amma today?',
    'Did the Guardian visit my mother yesterday?',
    'What did my father eat this week?',
    // greetings / statements
    'Hello',
    'My mother loves her morning walks',
  ])('%s → null', (q) => {
    expect(detectConcierge(q)).toBeNull()
  })
})
