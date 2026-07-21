# Collaboration & Delegation — Real-Family UAT Protocol

**Purpose.** Validate that families understand and adopt the collaboration workflow *before* Phase 4.
The 1,000-persona simulation is a structural signal only; this is the human gate. Run it after the
five refinements are live on UAT (auto-seeded network, inline add, value-first, Home coordination card).

**Rule for the facilitator:** do **not** explain the UI. Silence is data. If a participant is stuck for
~30s, note it, then offer the smallest possible hint and record that a hint was needed.

---

## Recruit (6–8 families)

Aim for spread, not volume — the simulation already covers scale. Recruit for the segments that struggled:

- **≥3 low-technical-ability** participants (the caregiver's parent, a non-app-native adult).
- **≥2 aged 60+.**
- **≥2 first-time** (never seen Close Eye) and **≥2 returning** users.
- Mix of scenarios: at least one non-health (property/finance/legal) alongside elder-care.

Each session: ~30 minutes, screen-recorded (with consent), think-aloud.

---

## Tasks & success criteria

Give each task as a *goal*, never as UI steps. Mark **Pass** only if completed unaided.

| # | Task (say it like this) | Pass = | Watch for |
|---|---|---|---|
| 1 | "Ask Close Eye how your mother is doing." | Gets a grounded answer | Do they find Connect? Trust the answer? |
| 2 | "You've read the answer — what would you do next?" | Notices & taps a Recommended Next Step **unprompted** | Do they *see* the section? Understand the groups? |
| 3 | "Share this with your sister." | Completes Share (incl. adding her inline if needed) | Any hesitation at picking/adding a person? |
| 4 | "Ask a doctor to look at it." | Completes Invite with a purpose | Does the required *purpose* feel natural or annoying? Does "will receive" build trust? |
| 5 | "Ask someone to pick up her medicines by tomorrow." | Completes Assign | Is Today/Tomorrow/This-week intuitive? |
| 6 | "Who are the people you can involve here?" | Finds & recognizes the Trusted Network | Do they grasp what it is *without* being told? |
| 7 | "Show me what's happened with your family recently." | Finds the coordination timeline (Home card or Activity) | Does "Family Knowledge Updated" mean anything to them? |

---

## Record per participant

- **Completion** (Pass / Pass-with-hint / Fail) for each task.
- **Time** to complete each task (from goal stated to done).
- **Hesitations** (count pauses >5s) and **wrong turns** (taps that didn't advance the goal).
- **Misread labels** — quote them: which words did they misunderstand? ("Trusted help"? "Presence Manager"? "Estimated completion"?)
- **Expectation gaps** — "I expected X to happen but Y did." Quote verbatim.
- One question at the end: **"Would this be easier than doing it over WhatsApp? Why?"**

---

## Go / No-Go rubric (maps to the CTO acceptance criteria)

Proceed to Phase 4 **only if**, across participants:

1. **≥80%** complete the core journey (tasks 1→2→ one of 3/4/5) unaided.
2. **≥70%** engage a Recommended Next Step in task 2 **without** being pointed to it.
3. **≥60%** correctly describe what the Trusted Network is in task 6 (value-first — they don't need the name, they need the concept).
4. **No task** fails for **>1/3** of participants (no shared blocker).
5. **A majority** say the flow is easier than WhatsApp for *completing* a responsibility (not just chatting).

- **All five met →** Proceed to Phase 4.
- **1–2 missed, all fixable copy/flow tweaks →** Refine those, re-test the failing tasks only.
- **Core journey <60% or a shared hard blocker →** stop and escalate; do not proceed.

---

## Notes

- The simulation predicts the walls are gone but **low-tech (≈51%) and Trusted-Network comprehension (≈29%)** stay the weakest — these are exactly what real sessions must confirm or refute.
- Keep the deferred non-blocker in mind but don't fix it mid-UAT: care-framed copy on non-health domains (~17% of non-care users). Note if participants trip on it; batch the copy fix afterward.
