// Ask Close Eye · Red-flag detection (Lane 3 safety floor)
//
// Runs BEFORE any model call. Bias is toward recall — a false positive only
// offers help that wasn't strictly needed; a false negative could miss a real emergency.
//
// OWNED BY THE MEDICAL TEAM. Dr. Sidharth should review and extend this list.

export interface RedFlagHit { matched: true; category: string; phrase: string }
export interface NoRedFlag  { matched: false }
export type RedFlagResult = RedFlagHit | NoRedFlag;

const RED_FLAGS: { category: string; patterns: RegExp[] }[] = [
  {
    category: "cardiac",
    patterns: [
      /chest (pain|tight|tightness|pressure|heavy|heaviness|discomfort)/,
      /(tight|tightness|pressure|heaviness|pain) (in|on) (his|her|their|the) chest/,
      /chest\b.{0,25}\b(tight|pressure|heav|crush|squeez)/,
      /\b(tight|pressure|crush|squeez)\w*\b.{0,25}\bchest/,
      /(clutch\w*|holding|grabbing|gripping) (his|her|their|the) chest/,
      /pain (in|down) (his|her|their|the) (left )?arm/,
      /heart (attack|racing|pounding)/,
    ],
  },
  {
    category: "breathing",
    patterns: [
      /(can('| ?)t|cannot|trouble|difficulty|struggling to) breath/,
      // Absent / stopped breathing — the most textbook emergency phrasing, which
      // the patterns above (which require can't/trouble/etc.) did not catch.
      /(not|isn('| ?)t|aren('| ?)t|wasn('| ?)t|won('| ?)t|hasn('| ?)t|no longer|hardly|barely) breath/,
      /(stopped|stops|ceased|quit) breath/,
      /short(ness)? of breath/,
      /gasping|choking|suffocat/,
      /(lips|face|skin|fingers|nails|hands)\b.{0,15}\b(blue|grey|gray|purple)/,
      /\b(blue|grey|gray|purple)\b.{0,10}\b(lips|face|skin|fingers|nails)/,
      /breathing (very |really )?(fast|rapid|heavy|hard)/,
    ],
  },
  {
    category: "stroke",
    patterns: [
      // The bare word "stroke" — recall-biased: a historical/benign mention is an
      // acceptable false positive; a missed "he's having a stroke" is not.
      /\bstroke\b/,
      /face (is |looks |looking )?(drooping|droopy|crooked|twisted)/,
      /slurred speech|can('| ?)t speak|words? (are )?jumbled|speech (is )?slurred/,
      /one side (of (his|her|the) )?(body|face) (is )?(weak|numb|paralys|drooping)/,
      /sudden(ly)? (numb|weak)(ness)? (on|in) one side/,
      /(arm|leg) (went |is )?numb (and|on) one side/,
    ],
  },
  {
    category: "consciousness",
    patterns: [
      /(passed out|pass(ed|es)? out|black(ed)? out|faint(ed|ing)|unconscious|unresponsive|not responding|won('| ?)t wake|can('| ?)t wake|not waking|collaps(e|ed|es|ing))/,
      /(suddenly )?(very )?confused|doesn('| ?)t know (where|who)/,
      /seizure|convuls|fitting/,
    ],
  },
  {
    category: "fall_injury",
    patterns: [
      /(fell|fallen|had a fall).*(can('| ?)t get up|hurt|bleeding|head|hip|broke|broken|unconscious|not moving)/,
      /(can('| ?)t get up|unable to get up).*(fell|fall)/,
      /hit (his|her|their) head/,
      // Bare falls — a leading cause of elder emergencies. Qualified enough to avoid
      // "fell asleep" / "fell ill" / "fell in love" false positives.
      /(had|has|have|took|having) (a|an|another) (bad |hard |serious |big |nasty |sudden |terrible )?fall\b/,
      /(fell|slipped|tripped) (down|over|badly|hard|flat)\b/,
      /(fell|slipped) (in the|on the|from|off|out of) /,
    ],
  },
  {
    category: "bleeding",
    patterns: [
      /(heavy|severe|won('| ?)t stop|(a )?lot of|lots of|uncontrolled|excessive|profuse|badly|heavily) bleed/,
      /bleed(ing)? (heavily|badly|a lot|lot|profusely|uncontrollably|everywhere|non ?stop)/,
      /(still|keeps|keep|not stopping|non ?stop|constant(ly)?|continuous(ly)?) bleed/,
      /bleeding (from|out of) (his|her|their|the)? ?(head|mouth|ear|eyes?|nose and|chest|stomach|gut|rectum|wound|badly)/,
      /(losing|lost) (a lot of |lots of )?blood/,
      /blood (everywhere|all over|gushing|pouring)/,
      /vomit(ing|ed)? blood|throwing up blood|coughing (up )?blood/,
      /blood in (his|her|the|its|it)\b/,
    ],
  },
  {
    category: "accident_trauma",
    patterns: [
      /(met with|had|in|been in|there('| ?)s been) (an |a )?accident/,
      /(road|car|bike|scooter|bus|train|traffic) accident/,
      /(badly|seriously|severely|critically) (hurt|injured|wounded)/,
      /(serious|severe|major|bad|deep) (injury|wound|cut|gash|head injury)/,
      /(hit|knocked|run) (by|over|down) (a |by a )?(car|bike|vehicle|bus|truck)/,
      /\baccident\b.{0,30}\b(bleed|blood|unconscious|hurt|injured|not moving|head|broke|broken)/,
    ],
  },
  {
    category: "overdose",
    patterns: [
      /overdose/,
      /took too many (pill|tablet)/,
      /(whole|entire|full) (strip|sheet|packet|bottle|box) of (the )?(pill|tablet|medicine|sleeping|tabl)/,
    ],
  },
  {
    category: "allergic",
    patterns: [
      /(throat|tongue|face|lips) (is |are )?swell/,
      /anaphyla|severe allergic|can('| ?)t swallow/,
    ],
  },
  {
    category: "self_harm",
    patterns: [
      /(wants?|wanting|trying) to (die|kill (him|her|them)self|end (his|her|their) life)/,
      /suicid|self[- ]harm|hurt (him|her|them)self/,
      /doesn('| ?)t want to live/,
    ],
  },
  {
    category: "severe_pain",
    patterns: [
      /(worst|unbearable|extreme|severe) (pain|headache)/,
      /sudden (severe|terrible) (pain|headache)/,
    ],
  },

  // Multilingual (romanized Hindi / Hinglish + Telugu)
  { category: "ml_consciousness", patterns: [/\bbehosh\b|\bbesudh\b/, /spruha thapp/, /gir ke behosh/] },
  {
    category: "ml_breathing",
    patterns: [
      /saans (nahi|nai|band|ruk|tez|takleef)/,
      /saans lene me(i)?n? (takleef|dikkat|problem)/,
      /dam ghut/,
      /oopiri (andatledu|raavatledu|aadatledu|raatledu)/,
    ],
  },
  {
    category: "ml_cardiac",
    patterns: [
      /(seene|seena|chhati|chhaati|chaati|chati) me(i)?n? .{0,12}dard/,
      /gunde no(p|op)pi/,
      /dil ka daura/,
      /heart .{0,6}daura/,
    ],
  },
  {
    category: "ml_fall",
    patterns: [
      /gir ga(ya|yi|ye|e).{0,30}(uth nahi|utha nahi|uth nai|chot|sar|khoon|bleeding)/,
      /padipoy.{0,40}(lechi|lecha|nilab|leva|lekapo|noppi|levalek)/,
    ],
  },
  { category: "ml_bleeding",  patterns: [/khoon .{0,15}(beh|ruk nahi|ruk nai|zyada|bahut)/, /(bahut|zyada) khoon/] },

  // Blood glucose crisis — qualitative and clinical terms only; no number regex (too context-dependent)
  {
    category: "blood_glucose",
    patterns: [
      // Qualitative hypo: "blood sugar crashed", "sugar very low", "glucose dropped"
      // Known false positive: "sugar intake dropped" — accepted per recall-bias policy
      /(blood )?(sugar|glucose).{0,20}(dropped|crashed|very low|too low|dangerously low)/,
      // Clinical terms (both spellings); also fires on managed/historical mentions — accepted
      /hypoglyc[ae]mi|hyperglyc[ae]mi/,
    ],
  },
  { category: "ml_seizure",   patterns: [/daura (pada|aaya|aa raha|padaa)/, /\bmirgi\b/, /fit aa ?(gayi|gaya|raha)/] },
  { category: "ml_self_harm", patterns: [/(marna|mar jana) chahta/, /jeena nahi chahta|jeena nai chahta/] },
];

function normalise(text: string): string {
  return text
    .toLowerCase()
    // iOS / smart keyboards emit curly apostrophes (’) — normalise them to a
    // straight ' so patterns like can't / won't / doesn't match regardless.
    .replace(/[’‘‛`´ʼ]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectRedFlag(rawMessage: string): RedFlagResult {
  const message = normalise(rawMessage);
  for (const flag of RED_FLAGS) {
    for (const pattern of flag.patterns) {
      const m = message.match(pattern);
      if (m) return { matched: true, category: flag.category, phrase: m[0] };
    }
  }
  return { matched: false };
}
