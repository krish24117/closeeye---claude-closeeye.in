/**
 * INTENT layer — the first stage, kept separate from data + analysis, and now ROLE-GENERIC: it takes
 * the calling role's capability keyword map, so the same resolver serves Founder, PM, Guardian, etc.
 * It turns a question (plus scope and the conversation so far) into a resolved ClozaIntent: which
 * capability, any city, whether it's a breakdown/comparison, and whether it's a follow-up that
 * inherits the previous turn. It touches no data and makes no claims — an unknown or uncovered city
 * becomes an honest "no data" downstream, never a guess.
 */
import type { ClozaScope, ClozaIntent, ClozaTurn } from './types'

/** A role provides its own capability keyword map (regex → capability id). */
export type CapabilityKeywords = [RegExp, string][]

// Cities Cloza recognises in a question. Detection only — the ANSWER always comes from live data.
const CITY_WORDS: [RegExp, string][] = [
  [/hyderabad|\bhyd\b/i, 'Hyderabad'],
  [/bengaluru|bangalore|\bblr\b/i, 'Bangalore'],
  [/mumbai/i, 'Mumbai'],
  [/delhi/i, 'Delhi'],
  [/chennai/i, 'Chennai'],
  [/pune/i, 'Pune'],
  [/kolkata/i, 'Kolkata'],
]

function detectCities(text: string): string[] {
  const found: string[] = []
  for (const [re, name] of CITY_WORDS) if (re.test(text) && !found.includes(name)) found.push(name)
  return found
}

export function resolveIntent(scope: ClozaScope, text: string, keywords: CapabilityKeywords, history: ClozaTurn[] = []): ClozaIntent {
  const q = text.trim()
  const prior = history[history.length - 1]

  const wantsBreakdown = /break\s+(that|it|this)?\s*down|by city|per city|split by/i.test(q)
  const cities = detectCities(q)
  const compareAsked = /\bcompare\b|\bversus\b|\bvs\.?\b/i.test(q) || cities.length >= 2

  let capability = ''
  for (const [re, id] of keywords) if (re.test(q)) { capability = id; break }

  // A pure refinement ("break that down", "compare Hyderabad and Bangalore", "and Bangalore?") carries
  // NO capability of its own — it inherits the previous turn's. That is the conversation.
  const isRefinement = !capability && (wantsBreakdown || compareAsked || cities.length > 0)
  if (isRefinement && prior?.answer.capability) capability = prior.answer.capability
  if (!capability) capability = 'unknown'

  return {
    capability,
    city: cities[0] ?? scope.city,
    // Only break down by city when it's actually a city question — an explicit "by city" or a
    // two-city comparison. "Compare this month to last month" must NOT become a city chart.
    breakdown: wantsBreakdown || (compareAsked && cities.length >= 2) ? 'city' : undefined,
    compare: compareAsked && cities.length >= 2 ? cities : undefined,
    isFollowUp: isRefinement && !!prior,
  }
}
