# Phase C — Finance & Insurance Intelligence: Implementation Proposal

> **STATUS (2026-07-20): APPROVED IN PRINCIPLE · IMPLEMENTATION DEFERRED.** The founder accepted the
> architectural direction and decided D1–D5, but **deferred building Phase C** to first prove product-market
> fit for CloseEye Connect. Decisions on record: **D1** one `finance` domain plugin (split later if needed);
> **D2** start with insurance policy + pension + one structured financial record; **D3** structured + graph +
> domain routing, pgvector deferred; **D4** professional advice = stub (know when to stop, recommend a pro);
> **D5** actionables = renewal reminders + nominee review. **No production code until Connect launch is proven.**
> Next focus: the Launch Readiness Plan (`LAUNCH_READINESS_PLAN.md`).

**Status:** PROPOSAL for founder approval · **Date:** 2026-07-20 · **Author:** Phase C planning
**Governs under:** Architecture Constitution **v1.1** (Articles XI Domain-as-Plugin, XII Trust Contract,
XIII Actionable Knowledge, XIV Life-Stage Awareness) + all prior principles.
**This is a proposal. No production code is written until you approve it.**

---

## 0. Why this phase, and what it must prove

Phase C is not "add a finance feature." It is **the proof that CloseEye is genuinely domain-agnostic** — that a
second, very different domain can be added **as a plugin (Article XI)** without changing the retrieval or
reasoning pipeline. Finance & Insurance is the right proof because families already *hold* these documents,
the value is high, the documents are *strongly structured*, and the professional boundary is *clean*.

**Definition of Done (the proof):**
> A family uploads their insurance policies, nomination forms, pension statements, and a financial record →
> CloseEye extracts structured facts (as **inferred, confirmable** knowledge) → answers finance/insurance
> questions **grounded on the family's own documents**, with the correct **trust class and confidence band** →
> **hands off** cleanly when the question needs a licensed advisor → and **every verified fact yields at least
> one action** (a renewal reminder, a nominee review). **And the retrieval/reasoning pipeline code is not
> changed in shape to make any of this work** — only a domain plugin and additive tables are added.

If that holds, the architecture is proven multi-domain, and Legal / Property / Government follow the same mould.

---

## 1. The Finance domain as a plugin (Article XI)

Per Article XI, the domain contributes **only** schemas, extraction rules, retrieval policies, reasoning
policies, trust boundaries, and care bindings — declared, not forked. Concretely, `Domain{ id:'finance' }`:

```
Domain finance {
  id: 'finance'                       # one domain; insurance/pension/accounts are entity subtypes
  entitySchemas:
     policy   { insurer, policy_no, kind(life|health|motor|other), sum_assured,
                premium, premium_frequency, start_date, renewal_date, nominees[], status }
     pension  { provider, scheme, account_no(masked), vesting_date, nominee, status }
     account  { institution, kind(savings|deposit|loan|investment), ref(masked), maturity_date? }
     bill     { biller, kind, amount, due_cycle, autopay? }
  extractors:                         # LLM extraction, deterministic validation, always `inferred`
     classifyDocument → docType
     extract(docType) → structured fields (constrained JSON schema) + per-field confidence
  retrievalHints:                     # what to co-retrieve when a question routes to finance
     entities: policy, pension, account, bill ; relationships: owns, insured_by, nominee_of, issued_by
  reasoningPolicy:
     may:  explain the family's OWN coverage, renewals, nominees, dues, maturities from their documents
     must: apply confidence bands; cite provenance; never invent numbers
     must-not: give investment/tax advice, interpret disputed policy terms, recommend products
  trustRules (professional boundary):
     tax planning · investment advice · claim disputes · legal interpretation → handoff (CA / advisor)
  careBindings:                       # design only in Phase C
     'financial' care module (mode: remote, region: India) → renewal errand · claim-assist · concierge
}
```

**The whole feature is this package + additive data.** No new branch in Retrieval, Reasoning, or Orchestration.
That is the Article XI test, and Phase C's central claim.

**Decision requested (D1):** treat Finance & Insurance as **one** domain (`finance`, insurance as an entity
subtype) — recommended, simpler and truer to "one intelligence" — or split into two plugins?

---

## 2. Knowledge representation & actionability (Articles XIII)

A document becomes a small graph, and **every verified fact carries an action** (Article XIII).

**Example — an insurance policy PDF:**
```
Document(policy.pdf)  ─evidence_of→  Asset:policy { insurer: HDFC Life, no: ****1234,
                                                     sum_assured: ₹50L, renewal_date: 2027-03-12,
                                                     nominees: [person:Anita] }
  person:Ramesh ─owns→ policy        policy ─insured_by→ org:HDFC Life     policy ─nominee_of→ person:Anita
  knowledge_entries (domain=finance, type=document_extract, provenance=inferred, confidence, document_ref):
     "Renewal date: 12 Mar 2027" · "Sum assured: ₹50,00,000" · "Nominee: Anita (daughter)"
  derived_actions (Article XIII):
     renewal_reminder { trigger: renewal_date − 30d, subject: policy, source: renewal_date fact }
     nominee_review   { trigger: on_confirm, subject: policy, source: nominees fact }
```

**The Actionable primitive (new, minimal):**
```
derived_action { id, family_id, subject_entity, kind, trigger(date|condition),
                 source_entry_id, status(suggested|active|done|dismissed), created_at }
```
Actionables are *derived from verified facts*, not free-floating features — this is exactly Article XIII: the
fact and the action are linked by provenance. Phase C ships **two** actionables (renewal reminder, nominee
review) to prove the article; the primitive generalises to every domain (a passport → expiry reminder, a
prescription → medication reminder) without new machinery.

---

## 3. Data model deltas — additive only (§2g)

Everything reuses the blueprint's generalised graph; nothing existing is rewritten.

| Change | Kind | Notes |
|---|---|---|
| `knowledge_entries` (= widened `family_ledger`) used with `domain='finance'`, `structured` jsonb | reuse | append-only, provenance, RLS preserved |
| `entities` rows `type∈{asset,organization,document}` (subtypes policy/pension/account/bill) | additive | people already exist as entities |
| `relationships` rows: `owns, insured_by, nominee_of, issued_by` | additive | the finance graph fragment |
| `documents` + `document_extractions` | additive | ingestion + evidence provenance |
| `derived_actions` | additive (new, small) | Article XIII actionables |
| `consent_grants` rows scoping finance entries | additive | finance is sensitive → purpose-scoped |
| `subscriptions`/entitlements gate finance domain | reuse | which families have Finance Intelligence |

RLS: identical owner-scoped pattern (`family_id = auth.uid()`), staff never see finance data (no PM/Guardian
widening for this domain). Residency + erasure honour Article X. **No change to any existing table's reads.**

---

## 4. Ingestion & extraction (LLM extracts; deterministic validates; trust preserved)

```
Upload → store (private bucket, residency-aware)
  → classifyDocument (LLM)                          # policy | pension | account | bill | unknown
  → extract(docType) (LLM, constrained JSON)        # fields + per-field confidence
  → validate (deterministic)                        # schema, date sanity, masking, provenance
  → write: Document + entities + relationships + knowledge_entries(provenance=inferred, confidence, doc_ref)
  → derive: derived_actions from verified/high-confidence facts
  → surface for CONFIRMATION                         # family confirms → provenance rises, confidence ↑ (Article XII)
```
- Extraction output is **always `inferred`** until a human confirms it (Article XII). Confirmation is the moment
  an extract becomes a *Verified Family Fact*.
- The LLM never decides anything irreversible; it proposes structured candidates that deterministic code
  validates and the family confirms. (Principle 4, 7 preserved.)
- PII discipline: mask account/policy numbers at rest and in prompts; store only what the family shares for a
  stated purpose.

**Decision requested (D2):** first document types to support — recommend **insurance policy + pension statement
+ one financial record** (bank/loan summary). Enough to prove breadth without boiling the ocean.

---

## 5. Retrieval — the proof that the pipeline does NOT change

Phase C's most important claim. The retrieve v2 steps (blueprint §5) already accommodate finance with **data +
policy only**:

```
"When does Ramesh's insurance renew?"
  resolve   → subject: person:Ramesh (existing resolver, unchanged)
  route     → domain: finance         (LLM intent → domain set; deterministic fallback)   ← plugin's job
  retrieve  → STRUCTURED: policy entities owned by Ramesh, newest-current   ← plugin retrievalHints
              GRAPH: policy ─insured_by→ insurer, ─nominee_of→ person
  merge     → provenance-ranked (unchanged)
  annotate  → coverage: finance care availability (unchanged shape)
  → RetrievedContext.v2 (domains:['finance'])       ← same contract, new value
```
The grounding-turn pattern in `answer.ts` is **unchanged** — it simply carries finance facts. **No new code path
in `retrieve()` or `answerFamilyQuestion()`; only the domain plugin's routing + hints.** This is the Article XI
proof, demonstrated on a real question.

**Decision requested (D3):** retrieval depth for Phase C — recommend **structured + graph retrieval + domain
routing now**, and **defer pgvector semantic retrieval** to Phase B/D (documents are structured enough that
semantic recall isn't required to prove the domain). Bring pgvector forward only if extraction coverage needs it.

---

## 6. Reasoning & the Trust Contract (Article XII)

Finance answers are grounded on the family's **own** documents, and every answer is trust-classed and
confidence-banded — conservatively, per your ratified rule:

| Situation | Class | Confidence band | Example answer |
|---|---|---|---|
| Confirmed fact from a document | **Verified family fact** | High → state naturally | "Ramesh's HDFC Life policy renews on **12 March 2027**; the nominee is Anita." |
| Extracted, not yet confirmed | **Inferred conclusion** | Medium → hedge | "**Based on what I know**, the policy renews around March 2027 — from the document you uploaded." |
| Low extraction certainty / ambiguous | **Inferred conclusion** | Low → flag | "**This is worth confirming before relying on it** — the renewal date on the scan wasn't fully clear." |
| Needs tax/investment/claims judgement | **Professional advice** | — → handoff | "Whether to renew or switch is a call for a licensed advisor — here's how to reach one." |
| World knowledge, not their data | **General knowledge** | — | "**In general**, term policies lapse if the premium isn't paid within the grace period." |

- **Trust is architecture, not prompt** (Article XII): the class comes from the entry's `provenance` +
  `confidence`; the handoff comes from the domain's `trustRules`; the disclaimer stays but is not the mechanism.
- Safety floor still runs first (unchanged) even though finance rarely triggers it.
- Memory-integrity laws apply unchanged (never "I forgot"; acknowledge the person/entity; "still learning").

---

## 7. Actionability shipped (Article XIII)

Phase C ships two actionables end-to-end to prove the article, reusing existing reminder/notification patterns:
- **Renewal reminder** — from a policy/pension `renewal_date`/`vesting_date`: a scheduled prompt ("Ramesh's
  policy renews in 30 days").
- **Nominee review** — from `nominees`: a periodic "is this still right?" prompt (a genuinely valuable,
  under-served nudge).
Both are *derived from verified facts*, dismissible, and family-owned. The `derived_actions` primitive then
generalises to every domain later — no new machinery for passport-expiry or medication reminders.

---

## 8. Care binding — designed, not built (Care Orchestration)

The `financial` care module already exists (`care-modules.ts`, mode=remote, region=India). Phase C **designs**
the binding — a renewal or claim can, in a later phase, become an `orchestration_request` (renewal errand /
claim-assist / financial concierge) through the *same* orchestration flow (blueprint §8). **Phase C does not
build the financial-concierge ops network** — fulfilment activation is a later phase, gated on provider supply,
exactly as Care presence is Hyderabad-first.

**Decision requested (D4):** the professional-handoff target for advice — Phase C ships handoff as an
**honest routing message + captured intent** (a stub that says "this needs an advisor" and records the need),
with the *actual* partner network wired in a later phase. Approve stub-now / partner-later?

---

## 9. Constitutional compliance checklist

| Principle / Article | How Phase C honours it |
|---|---|
| Family → Retrieve → Reason → Answer | Unchanged; finance rides the same pipeline |
| Principle 2 · Retrieve before Reason | Finance retrieval precedes reasoning; same seam |
| Principle 3 · Safety before Intelligence | Deterministic floor still runs first |
| Principle 4/7 · LLM understands, never decides / no critical LLM-only execution | Extraction is proposed → validated → confirmed; nothing irreversible on the model alone |
| Principle 6 · Every interaction becomes memory | Uploads, confirmations, answers all recorded; corrections append |
| §2g · Backward-compatible, additive | Only additive tables/columns; existing reads untouched |
| **Article XI · Domain as Plugin** | The feature *is* a plugin + additive data; **no pipeline redesign** |
| **Article XII · Trust Contract** | Four classes + conservative confidence bands, enforced by provenance/confidence/trustRules |
| **Article XIII · Actionable** | Two actionables derived from verified facts; primitive generalises |
| **Article XIV · Life-Stage (directional)** | Not foreclosed — validity windows + event entities keep the timeline extensible |
| Article X · Ownership / DPDP | Finance is consent-scoped, RLS-owned, erasable, residency-aware |

---

## 10. Delivery plan — independently deployable sub-phases

Each sub-phase is shippable and reversible on its own, with a FAT-style acceptance gate.

| Step | Ships | Acceptance gate |
|---|---|---|
| **C1** | Additive schema (entities/relationships/documents/knowledge domain col/derived_actions) + finance plugin scaffold. No user-facing change. | Migrations apply; existing app byte-identical; plugin registers |
| **C2** | Document ingestion + extraction (insurance policy first, then pension + one financial record). Facts appear as *inferred, confirmable*. | Upload a real policy → correct structured facts, marked inferred, with evidence link; confirm raises to verified |
| **C3** | Finance retrieval routing + grounded answers + trust chrome + confidence bands. | "When does the policy renew / who's the nominee?" answered from the doc, correct class + band; advice → handoff; **diff shows no pipeline-shape change** |
| **C4** | Actionables: renewal reminder + nominee review. | A dated policy produces a real, dismissible reminder; nominee-review prompt appears |
| **C5** | Professional-handoff (stub) + care-binding design doc. | Advice questions route to handoff + capture intent; care binding documented, not built |

---

## 11. Risks & the decisions I need from you

**Risks:** extraction accuracy on messy Indian policy scans (mitigation: conservative confidence → "worth
confirming", human confirm-step); finance-data sensitivity (mitigation: consent-scope, masking, residency,
erasure); scope creep across finance sub-areas (mitigation: 3 doc types only); professional-liability boundary
(mitigation: never advise — handoff).

**Decisions requested (recap):**
- **D1** — Finance & Insurance as **one** domain plugin (recommended) or two?
- **D2** — First document types: **insurance policy + pension + one financial record** (recommended)?
- **D3** — Retrieval depth: **structured + graph + routing now, pgvector deferred** (recommended)?
- **D4** — Professional handoff: **stub-now, partner-later** (recommended)?
- **D5** — Confirm the two Phase-C actionables (renewal reminder, nominee review), or add/subtract?

---

### One-paragraph summary
Phase C adds Finance & Insurance as a **domain plugin** (Article XI): a declarative package of schemas,
extractors, retrieval hints, reasoning policy, trust boundaries, and a (design-only) care binding — plus
**additive** tables — with **no change to the retrieval or reasoning pipeline's shape**. Families upload their
own policies, pensions, and financial records; CloseEye extracts them as **inferred, confirmable** knowledge,
answers grounded on those documents with the **four trust classes and conservative confidence bands** (Article
XII), **hands off** cleanly when a licensed advisor is needed, and turns every verified fact into an **action**
— a renewal reminder, a nominee review (Article XIII). If this ships as proposed, CloseEye is proven genuinely
domain-agnostic, and Legal / Property / Government are the same mould. **Awaiting your approval (and D1–D5)
before any production code.**
