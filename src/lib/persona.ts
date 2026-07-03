// Persona is derived purely from profile.country vs loved_one.city.
// It gates COPY only — features and flow are identical for all personas.

export type Persona = 'abroad' | 'diff-city' | 'same-city'

const INDIA_CITY_KEYWORDS = [
  'india', 'hyderabad', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'chennai',
  'pune', 'kolkata', 'ahmedabad', 'jaipur', 'lucknow', 'surat', 'visakhapatnam',
  'vizag', 'chandigarh', 'kochi', 'coimbatore', 'nagpur', 'bhopal', 'indore',
  'patna', 'vadodara', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot',
  'kalyan', 'vasai', 'thane', 'noida', 'gurgaon', 'gurugram', 'aurangabad',
  'solapur', 'hubli', 'dharwad', 'tiruchirappalli', 'trichy', 'madurai',
  'coimbatore', 'mysuru', 'mysore', 'thiruvananthapuram', 'trivandrum',
]

function isInIndia(location: string): boolean {
  const l = location.toLowerCase()
  return INDIA_CITY_KEYWORDS.some(kw => l.includes(kw))
}

function cityRoot(location: string): string {
  // Extract the city component (before commas, e.g. "Chennai, Tamil Nadu" → "chennai")
  return location.split(',')[0].toLowerCase().trim()
}

export function getPersona(
  userCountry: string | null | undefined,
  parentCity: string | null | undefined,
): Persona {
  const c = (userCountry || '').trim()
  if (!c || !isInIndia(c)) return 'abroad'
  if (!parentCity) return 'diff-city'
  const userRoot   = cityRoot(c)
  const parentRoot = cityRoot(parentCity)
  if (userRoot && parentRoot && (userRoot.includes(parentRoot) || parentRoot.includes(userRoot))) {
    return 'same-city'
  }
  return 'diff-city'
}

// ── Copy tokens per persona ───────────────────────────────────────────────────

export interface PersonaCopy {
  heroSub: string           // short subtitle on the wellbeing card
  emptyStateSub: string     // sub-text in state B (no visits yet)
  askShortcutSub: string    // Ask Close Eye shortcut description
  askInputHint: string      // textarea placeholder in Ask page
  showUsdPrice: boolean     // show USD alongside INR in pricing
}

export function getPersonaCopy(
  persona: Persona,
  { parentName, parentCity, userCity }: {
    parentName?: string | null
    parentCity?: string | null
    userCity?: string | null
  } = {},
): PersonaCopy {
  const pn = parentName || 'your parent'
  const pc = parentCity || 'India'
  const uc = userCity?.split(',')[0] || 'where you are'

  switch (persona) {
    case 'abroad':
      return {
        heroSub:         'Your eyes in India, always',
        emptyStateSub:   `Close Eye will be your trusted presence for ${pn} — no timezone worry.`,
        askShortcutSub:  `Ask about ${pn} — our team is available day and night`,
        askInputHint:    `e.g. Is it okay to give ${pn.split(' ')[0]} paracetamol with BP medicine?`,
        showUsdPrice:    true,
      }
    case 'diff-city':
      return {
        heroSub:         `Your eyes in ${pc} while you're in ${uc}`,
        emptyStateSub:   `Close Eye is your trusted presence for ${pn} in ${pc}.`,
        askShortcutSub:  `Ask about ${pn} from wherever you are in India`,
        askInputHint:    `e.g. Is it okay to give ${pn.split(' ')[0]} paracetamol with BP medicine?`,
        showUsdPrice:    false,
      }
    case 'same-city':
      return {
        heroSub:         `On-demand care for ${pn}`,
        emptyStateSub:   `We're close by — book a visit whenever ${pn} needs a check-in.`,
        askShortcutSub:  `A question about ${pn}? Ask CloseEye`,
        askInputHint:    `e.g. Is it okay to give ${pn.split(' ')[0]} paracetamol with BP medicine?`,
        showUsdPrice:    false,
      }
  }
}
