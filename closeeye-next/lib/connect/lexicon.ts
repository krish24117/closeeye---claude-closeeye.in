/**
 * Close Eye Connect — the shared word classes that are NOT a person.
 *
 * The name slot used to accept any capitalised token that wasn't in a hand-written
 * stop-list, so every noun outside that list was a candidate person. The audit of
 * 2026-07-17 measured it: "my mother Sugar is high" → someone you love called **Sugar**.
 * Also Fever, Cancer, Kidney, Dementia, Arthritis, Blood, Pension, Passport, Aadhaar.
 *
 * The generalization is not a longer blocklist — it is a class: a word this engine
 * ALREADY understands as a health term or a document is not a person's name. That
 * vocabulary existed (ledger.ts: fever|sugar|diabet in the medical pattern,
 * pension|passport|visa|insurance in PROFESSIONAL) — it just wasn't shared with the name
 * slot. It lives here now so the two can't drift, which is the same mistake crisis.ts
 * was created to end.
 *
 * ── WHY SOME OBVIOUS WORDS ARE DELIBERATELY ABSENT ──
 * A word only belongs here if it is not ALSO a name somebody's mother actually has.
 * "bill" and "will" are documents — and Bill and Will are men. "pooja"/"puja" is a
 * prayer — and Pooja is one of the most common given names in India. "asha" is hope;
 * Asha is a person. Excluding those would silently delete real families from their own
 * family space, which is a worse failure than the one we are fixing: a wrong name gets
 * corrected in one tap, a refused name looks like the product doesn't know you exist.
 * When a word is genuinely both, the engine asks. That is what the ask flow is for.
 */

/* ── health: conditions, symptoms, treatment. None of these is a person. ── */
export const HEALTH_TERMS: string[] = (
  'fever temperature sugar diabetes diabetic cancer kidney liver dementia alzheimer alzheimers ' +
  'arthritis asthma infection wound cough cold vomiting diarrhea diarrhoea headache migraine ' +
  'swelling rash nausea dizziness giddiness weakness fatigue insomnia ' +
  'medicine medicines medication tablet tablets pills capsule dose doses insulin injection ' +
  'prescription scan scans xray checkup surgery treatment therapy physio physiotherapy dialysis ' +
  'chemo chemotherapy operation ulcer thyroid cholesterol anemia anaemia hernia fracture ' +
  'paralysis stroke seizure tumour tumor bp pressure blood pulse sputum phlegm ' +
  'wheelchair walker dentures hearing eyesight cataract glaucoma'
).split(' ')

/* ── documents / admin. "bill", "will", "mark", "grace" are excluded on purpose — see above. ── */
export const DOCUMENT_TERMS: string[] = (
  'pension passport visa insurance aadhaar aadhar ration policy claim paperwork form forms ' +
  'tax taxes itr gst deed certificate licence license registration subscription recharge ' +
  'invoice receipt statement cheque premium pancard'
).split(' ')

/* ── activities / places-of-doing. "pooja"/"puja" excluded on purpose — see above. ── */
export const ACTIVITY_TERMS: string[] = (
  'yoga exercise gym walking gardening physio meditation prayers appointment appointments ' +
  'class classes session sessions visit visits routine schedule'
).split(' ')

const NOT_A_PERSON = new Set<string>([...HEALTH_TERMS, ...DOCUMENT_TERMS, ...ACTIVITY_TERMS])

/** Is this word one the engine already understands as a thing, rather than a person? */
export const isNotPersonWord = (lower: string): boolean => NOT_A_PERSON.has(lower)
