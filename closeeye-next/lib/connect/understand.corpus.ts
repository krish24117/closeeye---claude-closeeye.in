/**
 * The permanent 1,000-conversation regression corpus for the Connect engine.
 *
 * Deterministic (seeded) so the exact same 1,000 first-time visitors replay on
 * every run. Each case carries ground-truth labels (intent / name / relationship)
 * so understand.test.ts can prove the engine never regresses. Covers: NRIs asking
 * about parents, elders about spouses, parents about children, emergencies,
 * non-English names, transliteration, voice-to-text, typos, broken English,
 * relationship-only, name-only, no-name, multiple people, angry/meta, and more.
 */

export interface Case {
  id: number
  text: string
  cat: string
  xIntent: string
  xName: string | null   // canonical expected name, or null when none is present
  xRel: string | null    // canonical expected relationship, or null when none is present
  multi: boolean
  meta: boolean
  answerName: string     // what the simulated visitor replies if asked for a name
}

const cap = (w: string) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)

// canonical relationship for scoring (superset incl. transliterations)
const CANON: Record<string, string> = {
  mother:'mother',mom:'mother',mum:'mother',mummy:'mother',mommy:'mother',ma:'mother',amma:'mother',mumma:'mother',ammi:'mother',
  father:'father',dad:'father',daddy:'father',papa:'father',pa:'father',appa:'father',baba:'father',abba:'father',bapu:'father',nanna:'father',
  grandmother:'grandmother',grandma:'grandmother',granny:'grandmother',nani:'grandmother',dadi:'grandmother',ajji:'grandmother',aaji:'grandmother',
  grandfather:'grandfather',grandpa:'grandfather',grandad:'grandfather',nana:'grandfather',dada:'grandfather',thatha:'grandfather',tata:'grandfather',ajoba:'grandfather',
  daughter:'daughter',son:'son',wife:'wife',husband:'husband',
  sister:'sister',behn:'sister',didi:'sister',akka:'sister',brother:'brother',bhai:'brother',
  aunt:'aunt',chachi:'aunt',mausi:'aunt',pinni:'aunt',uncle:'uncle',chacha:'uncle',mamu:'uncle',
  grandparents:'grandparents',parents:'parents',
}
const GENDER: Record<string, string> = {
  mother:'she',father:'he',grandmother:'she',grandfather:'he',daughter:'she',son:'he',wife:'she',husband:'he',
  sister:'she',brother:'he',aunt:'she',uncle:'he',grandparents:'they',parents:'they',
}
const NAMES = ['Lakshmi','Bhaskar','Ramesh','Siya','Aarav','Priya','Anjali','Venkat','Meena','Rajesh','Kavya','Arjun','Deepa','Sundari',
  'John','Mary','Robert','Linda','James','Emma','Michael','Sophia','David','Nora',
  'Wei','Mei','Hiroshi','Yuki','Chen','Sanghmitra','Fatima','Ahmed','Omar','Aisha','Zainab','Kwame','Amara','Chidi']

export function buildCorpus(n = 1000): Case[] {
  let s = 987654321
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)] as T
  const cases: Case[] = []
  const relIn = Object.keys(CANON).filter((r) => !['grandparents', 'parents'].includes(r))
  const push = (c: Partial<Case> & { text: string; cat: string; xIntent: string }) =>
    cases.push({ id: cases.length + 1, xName: null, xRel: null, multi: false, meta: false, answerName: c.xName || pick(NAMES), ...c } as Case)
  const wellFmt = [(r: string) => `How is ${r}?`, (r: string) => `How is ${r} doing?`, (r: string) => `Is ${r} okay?`, (r: string) => `How has ${r} been?`, (r: string) => `Did ${r} sleep well?`]
  const emgFmt = [(r: string) => `${cap(r)} fell down.`, (r: string) => `${cap(r)} is in the hospital.`, (r: string) => `Emergency — ${r} is not breathing.`, (r: string) => `${cap(r)} had chest pain.`]
  const poss = (g: string) => (g === 'she' ? 'her' : g === 'he' ? 'his' : 'their')

  while (cases.length < n) {
    const bucket = pick(['name_rel_well','name_rel_well','name_only_well','rel_only_well','name_rel_med','rel_only_med',
      'name_rel_doc','emergency_name','emergency_rel','pronoun_only','multi_rel','multi_name','translit','broken','typo',
      'voice','long_emotional','short','meta','grandparents','special','photos_mem','visits_care'])
    const nm = pick(NAMES), rel = pick(relIn), canon = CANON[rel] as string, g = GENDER[canon] ?? 'they'
    if (bucket === 'name_rel_well') push({ text:`How is my ${rel} ${nm}?`, cat:bucket, xIntent:'wellbeing', xName:nm, xRel:canon })
    else if (bucket === 'name_only_well') push({ text:pick(wellFmt)(nm), cat:bucket, xIntent:'wellbeing', xName:nm, xRel:null })
    else if (bucket === 'rel_only_well') push({ text:pick(wellFmt)(rel), cat:bucket, xIntent:'wellbeing', xName:null, xRel:canon })
    else if (bucket === 'name_rel_med') push({ text:`Is my ${rel} ${nm} taking ${poss(g)} medicine?`, cat:bucket, xIntent:'medicine', xName:nm, xRel:canon })
    else if (bucket === 'rel_only_med') push({ text:pick([`Is ${rel} taking ${poss(g)} medicine?`,`Did ${rel} take ${poss(g)} pills?`,`${cap(rel)} missed ${poss(g)} BP tablet.`]), cat:bucket, xIntent:'medicine', xName:null, xRel:canon })
    else if (bucket === 'name_rel_doc') push({ text:`Can you keep my ${rel} ${nm}'s reports?`, cat:bucket, xIntent:'documents', xName:nm, xRel:canon })
    else if (bucket === 'emergency_name') push({ text:pick(emgFmt)(nm), cat:bucket, xIntent:'emergency', xName:nm, xRel:null })
    else if (bucket === 'emergency_rel') push({ text:pick(emgFmt)(rel), cat:bucket, xIntent:'emergency', xName:null, xRel:canon })
    else if (bucket === 'pronoun_only') push({ text:pick([`Is she okay?`,`Is he alright?`,`Are they fine?`]), cat:bucket, xIntent:'wellbeing', xName:null, xRel:null })
    else if (bucket === 'multi_rel') { const r2 = pick(relIn); push({ text:`How are ${rel} and ${r2}?`, cat:bucket, xIntent:'wellbeing', xName:null, xRel:canon, multi:true }) }
    else if (bucket === 'multi_name') { const n2 = pick(NAMES); push({ text:`How are ${nm} and ${n2}?`, cat:bucket, xIntent:'wellbeing', xName:nm, xRel:null, multi:true }) }
    else if (bucket === 'translit') { const t = pick([['amma','mother'],['appa','father'],['thatha','grandfather'],['nani','grandmother'],['baba','father'],['ajji','grandmother']] as [string,string][]); const ph = pick([['medicine teesukunnara','medicine'],['ela unnaru','wellbeing'],['theek hai na','wellbeing'],['kaisi hai','wellbeing'],['dawai li','medicine']] as [string,string][]); push({ text:`${cap(t[0])} ${ph[0]}?`, cat:bucket, xIntent:ph[1], xName:null, xRel:t[1] }) }
    else if (bucket === 'broken') { const b = pick([[`my mother she okay or not`,'wellbeing',null,'mother'],[`father medicine taking na`,'medicine',null,'father'],[`${nm} she is doing good ah`,'wellbeing',nm,null],[`how my ${rel} ${nm}`,'wellbeing',nm,canon]]) as [string,string,string|null,string|null]; push({ text:b[0], cat:bucket, xIntent:b[1], xName:b[2], xRel:b[3] }) }
    else if (bucket === 'typo') { const b = pick([[`How is my mther ${nm}?`,'wellbeing',nm],[`Is ${rel} taking medcine?`,'medicine',null],[`How is my granma?`,'wellbeing',null],[`Hows my ${rel} ${nm} doin`,'wellbeing',nm]]) as [string,string,string|null]; push({ text:b[0], cat:bucket, xIntent:b[1], xName:b[2], xRel:null }) }
    else if (bucket === 'voice') { const b = pick([[`how is my father ${nm.toLowerCase()}`,'wellbeing',nm,'father'],[`is amma taking her medicine`,'medicine',null,'mother'],[`how is my ${rel} ${nm.toLowerCase()}`,'wellbeing',nm,canon]]) as [string,string,string|null,string|null]; push({ text:b[0], cat:bucket, xIntent:b[1], xName:b[2], xRel:b[3] }) }
    else if (bucket === 'long_emotional') push({ text:`I am so worried, I live far away in the US and I keep thinking about my ${rel} ${nm}, is ${poss(g)==='her'?'she':'he'} eating and sleeping?`, cat:bucket, xIntent:'wellbeing', xName:nm, xRel:canon })
    else if (bucket === 'short') { const b = pick([[`${rel}?`,null],[`${rel} ok?`,null],[`${nm}?`,nm]]) as [string,string|null]; push({ text:b[0], cat:bucket, xIntent:'wellbeing', xName:b[1], xRel:null }) }
    else if (bucket === 'meta') push({ text:pick([`who are you?`,`this is stupid`,`is this a real person?`,`what is this`,`hello`,`hi`]), cat:bucket, xIntent:'meta', xName:null, xRel:null, meta:true })
    else if (bucket === 'grandparents') push({ text:`How are my grandparents in India?`, cat:bucket, xIntent:'wellbeing', xName:null, xRel:'grandparents' })
    else if (bucket === 'special') { const b = pick([[`How is my autistic son ${nm}?`,'son'],[`How is my daughter ${nm} studying in London?`,'daughter'],[`How is my elderly husband ${nm}?`,'husband']]) as [string,string]; push({ text:b[0], cat:bucket, xIntent:'wellbeing', xName:nm, xRel:b[1] }) }
    else if (bucket === 'photos_mem') { const b = pick([[`Keep our family photos safe.`,'photos',null],[`Remember ${nm}'s stories.`,'memories',nm],[`Save ${nm}'s pictures.`,'photos',nm]]) as [string,string,string|null]; push({ text:b[0], cat:bucket, xIntent:b[1], xName:b[2], xRel:null }) }
    else if (bucket === 'visits_care') { const b = pick([[`Can someone visit my ${rel} ${nm}?`,'visits',nm,canon],[`${cap(rel)} is lonely.`,'visits',null,canon],[`Please look after ${nm}.`,'care',nm,null]]) as [string,string,string|null,string|null]; push({ text:b[0], cat:bucket, xIntent:b[1], xName:b[2], xRel:b[3] }) }
  }
  return cases.slice(0, n)
}
