/**
 * Recognise when someone typed a RELATIONSHIP as a name ("mother", "amma", "father") so the add
 * flow can gently ask what they actually CALL that person — a real name like "Lakshmi" — and then
 * show "Lakshmi · Mother" everywhere. Mirrors the connect engine's relationship dictionary
 * (English + common multilingual forms) but stays self-contained and UI-safe.
 */
export type RelGender = 'she' | 'he' | 'they'

const GROUPS: Array<{ canon: string; gender: RelGender; words: string[] }> = [
  { canon: 'mother', gender: 'she', words: ['mother', 'mum', 'mummy', 'mommy', 'mom', 'ma', 'mama', 'amma', 'ammi', 'mumma', 'madre'] },
  { canon: 'father', gender: 'he', words: ['father', 'dad', 'daddy', 'papa', 'pa', 'pop', 'appa', 'abba', 'baba', 'bapu', 'nanna', 'padre'] },
  { canon: 'grandmother', gender: 'she', words: ['grandmother', 'grandma', 'granny', 'nani', 'dadi', 'ajji', 'aaji', 'nonna', 'oma'] },
  { canon: 'grandfather', gender: 'he', words: ['grandfather', 'grandpa', 'grandad', 'thatha', 'ajoba', 'nonno', 'opa'] },
  { canon: 'daughter', gender: 'she', words: ['daughter'] },
  { canon: 'son', gender: 'he', words: ['son'] },
  { canon: 'wife', gender: 'she', words: ['wife'] },
  { canon: 'husband', gender: 'he', words: ['husband'] },
  { canon: 'sister', gender: 'she', words: ['sister', 'sis', 'didi', 'behn', 'akka', 'hermana'] },
  { canon: 'brother', gender: 'he', words: ['brother', 'bro', 'bhai', 'hermano'] },
  { canon: 'aunt', gender: 'she', words: ['aunt', 'auntie', 'aunty', 'chachi', 'mausi', 'pinni'] },
  { canon: 'uncle', gender: 'he', words: ['uncle', 'chacha', 'mamu'] },
  { canon: 'parents', gender: 'they', words: ['parents'] },
  { canon: 'grandparents', gender: 'they', words: ['grandparents'] },
]

const LOOKUP: Record<string, { canon: string; gender: RelGender }> = (() => {
  const m: Record<string, { canon: string; gender: RelGender }> = {}
  for (const g of GROUPS) for (const w of g.words) m[w] = { canon: g.canon, gender: g.gender }
  return m
})()

/** Returns the relationship (canon + gender) if `input` is JUST a relationship word — e.g.
 *  "Mother", "your mother", "amma" → mother/she. Otherwise null (it's a real name). */
export function relationshipWord(input: string): { canon: string; gender: RelGender } | null {
  const w = (input || '').trim().toLowerCase().replace(/^(your|my|our)\s+/, '')
  return LOOKUP[w] ?? null
}

export const objectPronoun = (g: RelGender) => (g === 'she' ? 'her' : g === 'he' ? 'him' : 'them')
export const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
