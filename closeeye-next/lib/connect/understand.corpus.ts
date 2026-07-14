/**
 * The permanent regression corpus for the Connect engine — 10,000 realistic
 * first-time conversations, deterministic (seeded) so the exact same population
 * replays on every run.
 *
 * These are not random strings. Each is assembled from real-world building blocks:
 * relationship terms across many languages, given names from every major region,
 * intent phrasings, and STYLE transforms that mimic how real people type —
 * Indian / American / British / Australian English, ESL & broken English,
 * voice-to-text, typos, emoji, mixed-language, ultra-short, and long emotional
 * messages. Ground-truth labels (intent / name / relationship) travel with each
 * case so understand.test.ts can prove the engine never fabricates and never
 * regresses. Deliberate TRAPS (place names, "fell in love", name/kinship
 * collisions like "Lola"/"Tia") stress the never-invent guarantees.
 */

export interface Case {
  id: number
  text: string
  style: string
  region: string
  truthIntent: string
  truthName: string | null   // a real person-name present in the text, else null
  truthRel: string | null    // canonical relationship present in the text, else null
  multi: boolean
  meta: boolean
  trap: boolean              // intent is not asserted (only the never-invent gates are)
  answerName: string         // what the visitor replies if asked for a name
}

const cap = (w: string) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)
const upFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/* ── names by region ── */
const NAMES: Record<string, string[]> = {
  indian:['Lakshmi','Bhaskar','Ramesh','Siya','Aarav','Priya','Anjali','Venkat','Meena','Rajesh','Kavya','Arjun','Deepa','Sundari','Aditya','Ananya'],
  american:['John','Mary','Robert','Linda','James','Emma','Michael','Sophia','David','Nora','Ethan','Olivia'],
  british:['Oliver','Amelia','Harry','Charlotte','George','Isla','Jack','Poppy','Alfie','Evie'],
  australian:['Cooper','Ruby','Oscar','Mia','Archie','Chloe','Lachlan','Ivy'],
  arabic:['Fatima','Ahmed','Omar','Aisha','Zainab','Yusuf','Layla','Khalid','Mariam','Hassan'],
  spanish:['Sofia','Mateo','Lucia','Diego','Valentina','Santiago','Camila','Alejandro','Isabella','Carlos'],
  filipino:['Angelo','Bea','Jose','Maria','Andres','Liza','Ramon','Cristina'],
  african:['Kwame','Amara','Chidi','Zola','Kofi','Nia','Thabo','Ada','Emeka','Fatou'],
  european:['Luca','Sophie','Hans','Elena','Pierre','Marta','Lars','Freya','Nikola','Ingrid'],
  eastasian:['Wei','Mei','Hiroshi','Yuki','Chen','Min','Haruto','Sakura','Jin','Ling'],
}
const REGIONS = Object.keys(NAMES)
// ambiguous given names that are ALSO kinship words elsewhere — used to test the gate
const AMBIG_NAMES = ['Lola','Tia','Anna','Gigi','Mimi']
const CITIES = ['India','London','America','Canada','Dubai','Australia','Singapore','Manila','Lagos','Madrid','Sydney','Boston']

/* ── relationships: token, canonical, gender, ambiguous? ── */
interface Rel { t: string; canon: string; g: string; ambig: boolean }
const RELS: Rel[] = [
  { t:'mother',canon:'mother',g:'she',ambig:false },{ t:'mum',canon:'mother',g:'she',ambig:false },{ t:'amma',canon:'mother',g:'she',ambig:false },{ t:'ammi',canon:'mother',g:'she',ambig:false },{ t:'madre',canon:'mother',g:'she',ambig:false },{ t:'nanay',canon:'mother',g:'she',ambig:false },
  { t:'father',canon:'father',g:'he',ambig:false },{ t:'dad',canon:'father',g:'he',ambig:false },{ t:'appa',canon:'father',g:'he',ambig:false },{ t:'padre',canon:'father',g:'he',ambig:false },{ t:'tatay',canon:'father',g:'he',ambig:false },
  { t:'grandmother',canon:'grandmother',g:'she',ambig:false },{ t:'nani',canon:'grandmother',g:'she',ambig:false },{ t:'dadi',canon:'grandmother',g:'she',ambig:false },{ t:'nonna',canon:'grandmother',g:'she',ambig:false },
  { t:'grandfather',canon:'grandfather',g:'he',ambig:false },{ t:'thatha',canon:'grandfather',g:'he',ambig:false },{ t:'nonno',canon:'grandfather',g:'he',ambig:false },
  { t:'daughter',canon:'daughter',g:'she',ambig:false },{ t:'son',canon:'son',g:'he',ambig:false },{ t:'wife',canon:'wife',g:'she',ambig:false },{ t:'husband',canon:'husband',g:'he',ambig:false },
  { t:'sister',canon:'sister',g:'she',ambig:false },{ t:'didi',canon:'sister',g:'she',ambig:false },{ t:'hermana',canon:'sister',g:'she',ambig:false },
  { t:'brother',canon:'brother',g:'he',ambig:false },{ t:'bhai',canon:'brother',g:'he',ambig:false },{ t:'hermano',canon:'brother',g:'he',ambig:false },
  { t:'aunt',canon:'aunt',g:'she',ambig:false },{ t:'chachi',canon:'aunt',g:'she',ambig:false },{ t:'uncle',canon:'uncle',g:'he',ambig:false },{ t:'chacha',canon:'uncle',g:'he',ambig:false },
  // ambiguous — only a relationship when possessive-qualified ("my nana")
  { t:'mama',canon:'mother',g:'she',ambig:true },{ t:'papa',canon:'father',g:'he',ambig:true },{ t:'baba',canon:'father',g:'he',ambig:true },
  { t:'lola',canon:'grandmother',g:'she',ambig:true },{ t:'nana',canon:'grandfather',g:'he',ambig:true },{ t:'tia',canon:'aunt',g:'she',ambig:true },{ t:'tio',canon:'uncle',g:'he',ambig:true },
]
const SAFE_RELS = RELS.filter((r) => !r.ambig)
const poss = (g: string) => (g === 'she' ? 'her' : g === 'he' ? 'his' : 'their')
const subjPron = (g: string) => (g === 'she' ? 'she' : g === 'he' ? 'he' : 'they')

const STYLES = ['clean','clean','clean','indian','british','aus','voice','typo','emoji','broken','short','long','mixed','esl','arabic_esl','spanish_esl','filipino_esl']

export function buildCorpus(n = 10000): Case[] {
  let s = 20260715
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)] as T
  const chance = (p: number) => rnd() < p
  const cases: Case[] = []
  const push = (c: Omit<Case, 'id' | 'multi' | 'meta' | 'trap' | 'answerName'> & Partial<Pick<Case, 'multi' | 'meta' | 'trap' | 'answerName'>>) =>
    cases.push({ id: cases.length + 1, multi: false, meta: false, trap: false, answerName: c.truthName || pick(NAMES[pick(REGIONS)] as string[]), ...c })

  // subject builders → { who, truthName, truthRel, g }  ('who' is a mid-sentence phrase, lower-case start)
  type Subj = { who: string; truthName: string | null; truthRel: string | null; g: string }
  const subj = (region: string): Subj => {
    const nm = pick(NAMES[region] as string[])
    const rel = pick(RELS)
    const roll = rnd()
    if (roll < 0.34) return { who:`my ${rel.t} ${nm}`, truthName:nm, truthRel:rel.canon, g:rel.g }        // rel + name
    if (roll < 0.55) return { who:`my ${rel.t}`, truthName:null, truthRel:rel.canon, g:rel.g }             // possessive rel only
    if (roll < 0.70) { const r = pick(SAFE_RELS); return { who:r.t, truthName:null, truthRel:r.canon, g:r.g } } // bare safe rel
    if (roll < 0.86) return { who:nm, truthName:nm, truthRel:null, g:'they' }                              // name only
    return { who: pick(['she','he','they']) as string, truthName:null, truthRel:null, g:'they' }           // pronoun
  }

  const buildIntent = (who: string, g: string): { text: string; intent: string } => {
    const r = rnd()
    if (r < 0.34) { const f = pick([`How is ${who}?`,`How is ${who} doing?`,`Is ${who} okay?`,`Hope ${who} is well.`,`How has ${who} been lately?`]); return { text:f, intent:'wellbeing' } }
    if (r < 0.50) { const f = pick([`Is ${who} taking ${poss(g)} medicine?`,`Has ${who} taken ${poss(g)} tablets?`,`Did ${who} take ${poss(g)} pills today?`,`${upFirst(who)} needs a prescription refill.`]); return { text:f, intent:'medicine' } }
    if (r < 0.60) { const f = pick([`Can you keep ${who}'s reports?`,`Where are ${who}'s prescriptions?`,`Please store ${who}'s blood test.`]); return { text:f, intent:'documents' } }
    if (r < 0.68) { const f = pick([`Save ${who}'s photos.`,`Keep our family photos safe.`,`I want to keep ${who}'s pictures.`]); return { text:f, intent:'photos' } }
    if (r < 0.76) { const f = pick([`Remember ${who}'s stories.`,`Keep our family memories.`,`${upFirst(who)} loves telling old stories.`]); return { text:f, intent:'memories' } }
    if (r < 0.84) { const f = pick([`Can someone visit ${who}?`,`${upFirst(who)} feels lonely.`,`Please send someone to sit with ${who}.`]); return { text:f, intent:'visits' } }
    if (r < 0.90) { const f = pick([`Please look after ${who}.`,`${upFirst(who)} needs care.`,`Can you care for ${who}?`]); return { text:f, intent:'care' } }
    if (r < 0.94) { const f = pick([`Tell me our family history.`,`Where did our family come from?`,`I want to record our family tree.`]); return { text:f, intent:'history' } }
    const f = pick([`${upFirst(who)} fell down.`,`${upFirst(who)} is in the hospital.`,`Emergency — ${who} is not breathing.`,`${upFirst(who)} had chest pain.`,`${upFirst(who)} collapsed.`]); return { text:f, intent:'emergency' }
  }

  /* ── STYLE transforms (never corrupt the name token; only function words / add noise) ── */
  const typoMap: [RegExp, string][] = [[/\bhow\b/gi,'hw'],[/\bis\b/gi,'iz'],[/\btaking\b/gi,'takin'],[/\bmedicine\b/gi,'medcine'],[/\bdoing\b/gi,'doin'],[/\bplease\b/gi,'pls'],[/\bmother\b/gi,'mther'],[/\byour\b/gi,'ur']]
  const styleText = (style: string, text: string): string => {
    switch (style) {
      case 'indian': return text.replace(/\?$/, ' na?').replace(/\.$/, ' only.')
      case 'british': return text.replace(/\bmum\b/gi,'mum').replace(/\?$/, ', is she alright?')
      case 'aus': return text.replace(/\bmy\b/gi,'me').replace(/\?$/, ', ay?')
      case 'voice': return text.toLowerCase().replace(/[?.!,—]/g,'').trim()
      case 'typo': { let t=text; for (const [re,to] of typoMap) if (chance(0.6)) t=t.replace(re,to); return t }
      case 'emoji': return text + ' ' + pick(['🙏','❤️','😟','🥺','😊','🙏🏽'])
      case 'broken': return text.replace(/\bis\b/gi,'').replace(/\bthe\b/gi,'').replace(/\?$/,' or not?').replace(/\s+/g,' ').trim()
      case 'short': return text.replace(/^(how is |hope |can you |please )/i,'').replace(/\?.*$/,'?')
      case 'long': return `I'm really worried and I keep thinking about it — ${text.charAt(0).toLowerCase()+text.slice(1)} I just want to know ${subjPron('they')} are okay.`
      case 'mixed': return chance(0.5) ? `${text} theek hai na?` : `${pick(['kem cho','kaise ho','ela unnaru','kamusta'])}, ${text.charAt(0).toLowerCase()+text.slice(1)}`
      case 'esl': return text.replace(/\?$/,'? is good?')
      case 'arabic_esl': return `${text} inshallah ${subjPron('they')} fine.`
      case 'spanish_esl': return `${text} ${subjPron('they')} is bien no?`
      case 'filipino_esl': return `${text} po, salamat.`
      default: return text
    }
  }

  while (cases.length < n) {
    const roll = rnd()
    // 8% meta (greetings / who-are-you / abuse / emoji-only)
    if (roll < 0.08) {
      const t = pick([`who are you?`,`what is this?`,`is this a real person?`,`this is stupid`,`hello`,`hi there`,`namaste`,`hola`,`🙏`,`❤️❤️`,`???`,`is this a bot`])
      push({ text:t, style:'meta', region:'na', truthIntent:'meta', truthName:null, truthRel:null, meta:true })
      continue
    }
    // 6% TRAPS — must never invent a person / relationship / emergency
    if (roll < 0.14) {
      const region = pick(REGIONS), nm = pick(NAMES[region] as string[]), rel = pick(SAFE_RELS)
      const t = pick([
        `My ${rel.t} fell in love in ${pick(CITIES)}.`,        // "fell" but not a crisis; city not a name
        `I missed my ${rel.t} so much today.`,                 // "missed" ≠ medicine, emotional
        `My ${rel.t} works at the hospital.`,                  // "hospital" but not an emergency
        `${cap(rel.t)} fell asleep early last night.`,         // "fell asleep" ≠ crisis
        `How are my grandparents in ${pick(CITIES)}?`,         // city must not become a name
        `How is ${pick(AMBIG_NAMES)}?`,                        // ambiguous NAME, not a relationship
        `Is ${pick(AMBIG_NAMES)} doing okay in ${pick(CITIES)}?`,
      ])
      const isAmbigName = /How is (Lola|Tia|Anna|Gigi|Mimi)|Is (Lola|Tia|Anna|Gigi|Mimi)/.test(t)
      const isGrandparents = /grandparents/.test(t)
      const relInText = /fell in love|missed my|works at the hospital|fell asleep/.test(t)
      push({
        text: t, style:'trap', region,
        truthIntent:'wellbeing', trap:true,
        truthName: isAmbigName ? (t.match(/\b(Lola|Tia|Anna|Gigi|Mimi)\b/)?.[0] ?? null) : null,
        truthRel: isGrandparents ? 'grandparents' : (relInText ? rel.canon : null),
      })
      continue
    }
    // 4% explicit multi-person
    if (roll < 0.18) {
      const region = pick(REGIONS)
      if (chance(0.5)) { const r1 = pick(SAFE_RELS), r2 = pick(SAFE_RELS); push({ text:`How are my ${r1.t} and my ${r2.t}?`, style:'multi', region, truthIntent:'wellbeing', truthName:null, truthRel:r1.canon, multi:true }) }
      else { const a = pick(NAMES[region] as string[]), b = pick(NAMES[region] as string[]); push({ text:`How are ${a} and ${b}?`, style:'multi', region, truthIntent:'wellbeing', truthName:a, truthRel:null, multi:true }) }
      continue
    }
    // remainder: a real subject + intent + style
    const region = pick(REGIONS)
    const style = pick(STYLES)
    const sj = subj(region)
    const { text, intent } = buildIntent(sj.who, sj.g)
    // voice makes a name-only lowercase name unrecoverable → engine will (correctly) ask; keep truth honest
    const styled = styleText(style, text)
    push({ text: upFirst(styled), style, region, truthIntent: intent, truthName: sj.truthName, truthRel: sj.truthRel })
  }
  return cases.slice(0, n)
}
