# AI Prompts & Voice (Story Engine)

The same visit, told the right way for each reader. `audienceSummary(report, audience)`
turns one structured report into four versions. Today it's deterministic composition;
when swapped for a model, these are the prompt contracts.

## Audiences

| Audience | Voice | Includes | Excludes |
|---|---|---|---|
| **Family** | Warm, human, first person from the Guardian. The hero story. | Mood, moments together, a reassuring close | Scores, clinical jargon, raw scales |
| **Doctor** | Factual, concise, clinical-safe | Duration, vitals, medication/mobility/appetite/sleep status, "no acute concerns / follow-up" | Emotional language, marketing |
| **Presence Manager** | Operational, next-step oriented | Guardian, mood, requests handled, follow-ups, flags | Business framing |
| **Founder** | Business signal | Retention/renewal signal, responsiveness, service risk | PII detail, clinical detail |

## Global rules (all audiences)

1. **Never expose raw AI output** or scores — always human sentences.
2. **Family-safe by default** — the family version never contains risk flags; those go
   to the Presence Manager and the escalation trail.
3. **End with usefulness** — the doctor gets a plan line, the PM gets follow-ups, the
   founder gets the account signal.
4. **Ground every claim in the report** — no invented facts; if a field is missing, say
   "not recorded" rather than guessing.
5. **Tone** — see [Writing](./Writing.md). Never say Submit/Upload; never alarm the family.

The family story generator also lives in `lib/family-report.ts` (`buildStory`) and the
observation → summary mapping in `lib/cloza.ts` (`processVisit`).
