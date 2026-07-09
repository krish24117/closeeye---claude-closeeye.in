// ─────────────────────────────────────────────────────────────────────────
// Ask Close Eye · Red-flag unit tests (the safety floor)
//
// Deterministic — no API key, no network. Run in CI on every commit.
//   deno test tests/redflags.test.ts
//
// These guard the most important property in the whole system: a real
// emergency must ALWAYS trip Lane 3. If you edit redflags.ts, these must pass.
// ─────────────────────────────────────────────────────────────────────────

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { detectRedFlag } from "../supabase/functions/ask-health/redflags.ts";

// Emergencies that MUST escalate, with the category we expect.
const MUST_FIRE: [string, string][] = [
  ["He's holding his chest and says it's tight, and he's sweating", "cardiac"],
  ["complaining of chest pain and his arm hurts", "cardiac"],
  ["he keeps clutching his chest", "cardiac"],
  ["there's a lot of pressure in his chest", "cardiac"],
  ["He's having trouble breathing", "breathing"],
  ["his lips are turning blue", "breathing"],
  ["his face is going grey and he's gasping", "breathing"],
  ["His face is drooping and his speech is slurred", "stroke"],
  ["one side of his body is weak suddenly", "stroke"],
  ["He fell and can't get up", "fall_injury"],
  ["he fell and hit his head, there's bleeding", "fall_injury"],
  ["He passed out and is unresponsive", "consciousness"],
  ["he's suddenly very confused and doesn't know where he is", "consciousness"],
  ["he had a seizure", "consciousness"],
  ["he is vomiting blood", "bleeding"],
  ["amma keeps vomiting and now there's blood in it", "bleeding"],
  ["he took a whole strip of sleeping pills", "overdose"],
  ["she took an overdose of her tablets", "overdose"],
  ["his throat is swelling up", "allergic"],
  ["he says he wants to die", "self_harm"],
  ["he has the worst headache of his life", "severe_pain"],
  // Multilingual (Hinglish / Telugu)
  ["papa behosh ho gaye hain saans chal rahi hai par jaag nahi rahe", "ml_consciousness"],
  ["saans nahi aa rahi unhe bula raha hu jawab nahi de rahe", "ml_breathing"],
  ["seene me bahut tez dard ho raha hai papa ko", "ml_cardiac"],
  ["amma gir gayi aur uth nahi pa rahi please help", "ml_fall"],
  ["nanna padipoyaaru lechi nilabadalekapotunnaru", "ml_fall"],
  ["khoon bahut zyada beh raha hai ruk nahi raha", "ml_bleeding"],
  ["papa ko daura pada hai body akad rahi hai", "ml_seizure"],
];

// Benign messages that MUST NOT fire (these are Lane 1 / Lane 2 in real life).
const MUST_NOT_FIRE: string[] = [
  "Dad's been sleeping a lot more in the daytime, should I worry?",
  "What foods help with his constipation?",
  "His BP this morning was 165/102, should he take an extra tablet?",
  "He has a mild cold and a slight cough",
  "What should I ask the cardiologist tomorrow?",
  "He's been a bit low and quiet this week",
  "His knee hurts a little when he walks",
  "He had a chest x-ray last month",
  "His chest cold is finally getting better",
  "He wore a nice blue shirt to the temple",
  "The doctor checked his chest and it was clear",
  "He gets a mild headache sometimes in the evening",
  "papa ka phone gir gaya table se",
  "she vomited once after lunch, no blood, feeling better now",
  "is it ok to give him blood pressure medicine with food",
  "he ate a whole packet of biscuits",
  "amma ko gas hai pet me thoda",
  "nanna baagunnaru ee roju",
];

Deno.test("red flags fire on every emergency", async (t) => {
  for (const [message, category] of MUST_FIRE) {
    await t.step(`fires [${category}] — "${message}"`, () => {
      const r = detectRedFlag(message);
      assert(r.matched, `expected a red flag but none fired for: "${message}"`);
      assertEquals(r.category, category, `wrong category for: "${message}"`);
    });
  }
});

Deno.test("red flags stay quiet on benign messages", async (t) => {
  for (const message of MUST_NOT_FIRE) {
    await t.step(`clean — "${message}"`, () => {
      const r = detectRedFlag(message);
      assert(!r.matched, `false positive (${r.matched ? r.category : ""}) on: "${message}"`);
    });
  }
});
