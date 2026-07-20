# CloseEye — DPDP Compliance Record (Founder Beta)

**Status:** Internal compliance record · **Last updated:** 2026-07-20 · **Scope:** CloseEye Connect (invite-only Founder Beta)
This is the internal companion to the user-facing [Privacy Notice](../app/(marketing)/privacy/page.tsx). It records how CloseEye
meets India's Digital Personal Data Protection (DPDP) Act obligations for the beta. Not legal advice; to be reviewed by counsel
before public launch.

## 1. Roles
- **Data Fiduciary:** CloseEye (the operating entity; legal entity + registered address to be finalised before public launch).
- **Grievance Officer (Founder Beta):** Close Eye (Founder) — **Hello@closeeye.in**. Published in the Privacy Notice.
  Personal email addresses are never published. A postal address will be added when the legal entity/operating address is final.
- **Data Processors (sub-processors):** Anthropic (AI answer generation), Supabase (database + storage + auth hosting),
  Vercel (application hosting), Sentry (error monitoring — PII-scrubbed), PostHog (anonymous product analytics),
  Twilio + Resend (care-team/emergency notifications, when Care is active).

## 2. Categories of personal data
- **Account:** name, email (auth).
- **Family data (personal, may include health):** loved ones' identity + relationship, wellbeing/health details the user adds
  (`elder_profiles`, `family_ledger`), questions asked (`member_queries`, `conversations`), memories/documents (`memories`).
- **Not collected for analytics:** analytics are anonymous — no name/email/phone/address/question text/health content leaves to
  PostHog (enforced by a tested sanitizer + `person_profiles: identified_only`, never `identify()` during the beta).

## 3. Lawful basis
- **Consent** for holding and processing family/health information. Captured before the first Connect processing event via a
  clear, plain-language notice (the trust-promise consent card), recorded durably and auditable in the append-only `consents`
  table (`consent_type='wellbeing_data'`, `policy_version='v1'`). A withdrawal is a new `granted=false` row (history is never
  edited). **Enforced server-side** in the `ask-health` edge function (fail-closed): no family/health question is processed
  without a granted consent. Crisis/emergency detection bypasses the gate (life-safety), and CloseEye-service questions carry
  no family data.
- **Legitimate/necessary use** for providing the account and the service the user requested (auth, delivering answers).

## 4. Notice
The Privacy Notice (plain language) states: what is held, how it is used, who can see it, sub-processors (incl. the AI provider),
storage/security, retention, the user's rights, consent + withdrawal, and the Grievance Officer. Presented before consent and
always reachable at `/privacy` on every front door.

## 5. Data-principal (data-subject) rights & how they are served
| Right | How |
|---|---|
| **Access / know** | Data is the user's own, visible in-app (their family, questions, memories). Access/export requests → Grievance Officer. |
| **Correction** | In-app editing of family/profile data; corrections to the Family Graph are append-only (`correction` entries; an inference never overrides a stated fact). |
| **Withdraw consent** | Profile → *Your data & consent → Withdraw my consent* (records a `granted=false` row; processing stops immediately server-side). |
| **Erasure** | Profile → *Close account* → `delete-account` edge function erases the user's data. A minimal audit record that an erasure occurred is retained (accountability), not the erased content. |
| **Grievance** | Grievance Officer at Hello@closeeye.in. |

## 6. Retention & deletion policy
- Family/account data is retained while the account is open (the service depends on durable memory — Architecture Constitution
  Article X: durable, not permanent).
- On **withdrawal of consent**: processing of new family/health questions stops; existing data is retained but not processed
  until consent is re-granted (the user may also delete).
- On **account closure**: data is deleted via `delete-account`; the immutable audit trail records *that* an erasure happened
  without retaining the content (Architecture Constitution Article V + X).
- Emergency/safety audit (`member_queries` escalation fields) is retained as required for safety accountability.

## 7. Security (summary)
Row-Level Security isolates each family's data (`family_user_id = auth.uid()`); encrypted storage; no service-role key reachable
from the client; origin-allowlisted edge functions; abuse protection enforced (`RATE_LIMIT_ENFORCE=true`); error reports are
PII-scrubbed. See the Launch Readiness Plan for the full posture.

## 8. Open items before PUBLIC launch (beyond the beta)
- Finalise legal entity + registered/operating address; add postal address to the notice.
- Legal review of this record and the notice.
- Data Processing Agreements on file with each sub-processor.
- Turnstile/CAPTCHA before public exposure; data-residency confirmation per region as markets expand.
