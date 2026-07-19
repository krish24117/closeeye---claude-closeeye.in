# CloseEye — Architecture & Product Blueprint (2026–2031)

**Status:** DRAFT for founder review · **Author:** Architecture & Product Planning Sprint · **Date:** 2026-07-20
**Precedence:** This document sits **below the Constitution** and **extends** it. It introduces no new
product law; where it proposes a new invariant it says so explicitly and flags it for ratification
under Architecture Constitution **Article XI** (amendment = rationale + version bump + founder sign-off).
Nothing here is implemented — it is a blueprint. No production code was written.

**What this is:** the technical and product architecture for turning CloseEye from a family *health*
intelligence into a **domain-agnostic Family Intelligence & Execution Platform** over the next 3–5 years —
one trusted intelligence that reasons across a family's whole life (health, legal, finance, insurance,
property, government, education, employment, travel, routines, emergency planning) and, when a real-world
need appears, orchestrates human services to fulfil it.

**The single design tension it resolves:** *how do we add domains and services for years without ever
redesigning the platform?* The answer, throughout, is the same: **the domain is data and policy, never a
fork of the pipeline.** One graph, one retrieval seam, one reasoning contract, one trust model, one
orchestration flow — parameterised by domain and region.

---

## 0. Grounding — what already exists (we build on this, not around it)

This blueprint is an extension of a system that is already principled. The load-bearing facts:

- **Architecture Constitution v1.0 (FROZEN 2026-07-17)** — 7 Principles, the Article I request lifecycle,
  Article VI invariants, Article IX (provider-replaceable), Article X (memory ownership / DPDP).
- **The pipeline is already law:** `Family → Retrieve → Reason → Answer` — *never* `Family → LLM → Answer`.
- **The Family Graph already exists** as `family_ledger`: an **append-only, immutable** table (SELECT+INSERT
  only; corrections are new rows) with `entry_type ∈ {family_fact, guardian_observation, ai_understanding,
  visit_observation, correction, memory}`, `source ∈ {connect_experience, family_space, guardian, ai_engine}`,
  and **provenance derived** to `stated | observed | inferred`. This is *already* a domain-agnostic knowledge
  ledger — it is missing only a `domain` dimension and richer entity/temporality metadata.
- **Retrieval is already a versioned seam:** `retrieve.v1` (`RetrievedContext`) reads the graph through the
  caller's **RLS-scoped** client (cross-family isolation is structural, not a runtime check), applies a
  supersede rule (stated > observed > inferred, newest-in-tier), and is fail-safe (partial context, never
  fabricate).
- **The domain vocabulary is already seeded** in the platform layer: `regions.ts` defines
  `CareModuleId = presence | hospital | financial | insurance | property | community`, and each region
  carries per-module `care` flags. `service-region.ts` already models coverage as **domain × mode × region**
  (`coverageFor(domain, location) → available | unavailable | unknown`, where *unknown location is never
  available*). `care-modules.ts` already enumerates modules and the staff roles that operate them.
- **Universal object metadata is already ratified** (Constitution §2h): every object carries
  `{CreatedBy, Source, Confidence, Provenance, ConsentScope}`; identity confidence is
  `{Suggested, Confirmed, Manual, Unknown}`.
- **One-Postgres infrastructure is already law** (§2e): Event Store + Family Graph + pgvector inside a single
  RLS-scoped Postgres; one AI interface (default Anthropic, swap by config); `can_access(grantee, object,
  purpose)` consent gate (ratified as intent, not yet schema).
- **Backward compatibility is constitutional** (§2g): additive first, canonical later — **no big-bang migration.**

Everything below respects these. The blueprint's job is to make the *latent* domain-agnostic design
**explicit, coherent, and sequenced.**

---

## 1. Product Architecture

### 1.1 Thesis
CloseEye is a **Family Intelligence & Execution Platform**: a private, per-family intelligence that
**remembers** a family's life, **reasons** over it truthfully, and **executes** real-world help when needed.
Health is one *knowledge domain*, not the product. The LLM is one *component*, not the system.

Two customer-facing products already sit on the platform and more will follow:
- **Connect** (₹500/mo, global software) — the intelligence that stays with the family.
- **Care** (₹1,500, India human network, on-demand) — the fulfilment network Connect activates.
- **Future** — legal / financial / document intelligence and their fulfilment partners, as *new domains and
  service modules on the same platform*, never new apps.

> **Invariant (ratified, Article VI.8):** Connect, Care, and every future product consume the **same
> platform services**. A new product is a new *experience* over shared Retrieval / Reasoning / Trust /
> Orchestration — never a parallel stack.

### 1.2 The canonical request lifecycle (Article I) — restated for multi-domain
The pipeline does not change shape as domains are added; only Retrieval, Reasoning, and Orchestration become
**domain-parameterised**.

```
User / Channel
  → Gateway (identity, auth, region, front-door)
  → Safety Gate            [deterministic, first, never depends on an LLM]
  → Retrieval              [subject+entity resolution → domain routing → hybrid retrieve → provenance merge]
  → Context Builder        [token-budgeted, provenance-labelled, consent-filtered]
  → Understanding (LLM)    [language → StructuredIntent; understands, never decides]
  → Decision Engine        [policy → one NextAction: answer | clarify | handoff | execute | escalate]
  → Capability Router      [is this in scope / available / permitted here?]
  → Execution Orchestrator [answer OR real-world service; execution follows policy, not prompts]
  → Response Composer       [grounded answer + trust attribution + disclaimer]
  → Memory Engine          [every interaction becomes memory; event-sourced]
  → Family Graph updated
```
Three sanctioned early exits remain: **crisis** exits at the Safety Gate; **out-of-scope** terminates at the
Router; an **LLM-surfaced emergency** re-enters the Safety Gate (the backstop that already exists in
`ask-health`). No new exits are introduced.

### 1.3 The seven-layer stack (frozen §2f) — with the cross-cutting planes made explicit
```
   Experiences:   Connect · Care · (future domain experiences)      ← consume services, never own data
 ┌──────────────────────────────────────────────────────────────┐
 │  Intelligence Runtime   (Understanding · Reasoning · Compose)  │  LLM here, and ONLY here
 │  Retrieval              (resolve · route · hybrid · merge)     │  Retrieve-before-Reason
 │  Family Life Memory     (facts · observations · memories · docs)│
 │  Family Graph           (entities · relationships · knowledge) │  system of record
 │  Event Store            (append-only, immutable audit)         │
 │  Identity               (people, households, consent, access)  │
 └──────────────────────────────────────────────────────────────┘
   Cross-cutting planes (touch every layer):
     · Trust    (provenance + confidence + consent on every fact and every answer)
     · Domain   (a registry that parameterises retrieval, reasoning, orchestration)
     · Safety   (deterministic floor, region-aware, model-independent)
     · Region   (what is available / permitted / priced where)
```
Communication remains **adjacent-layer only** (§2f). The three additions to the mental model — **Domain**,
**Trust**, **Region** as *cross-cutting planes* rather than layers — are the core conceptual move of this
blueprint. They are not new layers; they are dimensions that every layer already partially carries and that
we now make first-class.

### 1.4 Determinism boundary (Article V) — unchanged, restated
| Deterministic (regression-tested, model-independent) | LLM (eval-tested, replaceable) |
|---|---|
| Safety Gate, Identity, Consent/Policy, Execution, Memory writes, Pricing, Dispatch | Language understanding, extraction, summarisation, answer composition |
No critical execution (emergency, payment, dispatch, policy) ever depends solely on an LLM (Principle 7).

---

## 2. Knowledge Architecture — the Family Graph

### 2.1 The one idea
**Everything CloseEye knows is a Knowledge Entry, about an Entity, carrying Provenance, Confidence, Consent,
and Time.** Facts, observations, memories, document extracts, conversation-derived notes, and AI summaries
are all the *same shape* — they differ only in `type`, `provenance`, and `domain`. This is already true of
`family_ledger`; we generalise it.

### 2.2 Entities (nodes)
Today the only entity is a **person** (`loved_ones`). The graph generalises to typed entities:

| Entity type | Examples | Notes |
|---|---|---|
| `person` | a loved one, the account owner, a caregiver | today's `loved_ones` |
| `household` | "Amma's home in Hyderabad" | groups people + place |
| `organization` | a hospital, bank, insurer, employer, school, govt office | counterparties |
| `document` | a report, will, policy, deed, passport, statement | first-class, with extraction |
| `asset` | a property, vehicle, account, policy, investment | the "things" a family holds |
| `event` | an admission, a court date, a renewal, a trip | time-anchored happenings |

Entities are **suggested, then confirmed** (Identity Confidence {Suggested, Confirmed, Manual, Unknown} —
already ratified). The person-resolution work already shipped (relationship-synonym resolution) is the first
instance of a general **entity resolver**.

### 2.3 Relationships (edges)
Typed, directional, provenance-bearing edges: `person —child_of→ person`, `person —owns→ asset`,
`asset —insured_by→ organization`, `person —employed_at→ organization`, `document —evidence_of→ asset`,
`event —concerns→ person`. The relationship graph is what lets Connect answer *"who is nearby if Amma
falls?"* or *"which policy covers this hospital?"* — cross-entity questions no single fact can answer.

### 2.4 Knowledge Entries (the generalised ledger)
The generalisation of `family_ledger`. One entry = one atomic thing CloseEye knows, with full metadata:

```
knowledge_entry
  id
  entity_id, entity_type          # what it's about (today: loved_one_id → person)
  family_id / owner_user_id        # ownership + RLS anchor (today: family_user_id)
  domain                           # NEW: health | legal | finance | … | general   ← the domain plane
  type                             # fact | observation | memory | document_extract | inference | correction
  label, body                     # today's label/body (human-readable)
  structured  jsonb                # NEW: typed payload for a domain (e.g. {policy_no, sum_assured})
  provenance                       # stated | observed | inferred            (Trust plane)
  confidence                       # NEW: 0..1 or {high|low}                  (Trust plane)
  source                           # connect_experience | family_space | guardian | ai_engine | document_ai
  consent_scope                    # NEW: who/what may read this              (Consent plane)
  valid_from, valid_to             # NEW: temporality — "as-of" truth, supersede without deletion
  document_ref                     # NEW: link to source document (extraction provenance)
  created_at
```
**Invariants preserved from `family_ledger`:** append-only, immutable, corrections are new rows, an inference
never overrides a stated fact (supersede rule), RLS-scoped by owner. **Additions:** `domain`, `structured`,
`confidence`, `consent_scope`, `valid_from/valid_to`, `document_ref`, generalised `entity`.

### 2.5 Documents as first-class knowledge
Today "documents" live only as `memory_items.kind='document'`. The blueprint promotes them: a **Document
entity** with a stored file, an **extraction pipeline** (OCR + structured extraction), and the extracted
facts written back as `knowledge_entry(type=document_extract, provenance=inferred, confidence, document_ref)`.
The document is the *evidence*; the extracts are *inferred until a human confirms them* — trust is preserved
end-to-end. This is how a lab report, a policy PDF, or a property deed becomes reasoned-over knowledge.

### 2.6 Temporality & event-sourcing (Article V, §2b)
Two stores, already mandated:
- **Event Store** — immutable, append-only *audit* (what happened, who did it, when). Never edited.
- **Family Graph** — the *correctable* current-truth projection (family owns it; may correct/erase — Article X).
Corrections are new `correction` entries; validity windows (`valid_from/valid_to`) let CloseEye answer
"*what did we believe on 1 June?*" and cleanly supersede stale facts without destroying history.

### 2.7 The three memory tiers (frozen §2b) — unchanged
`record` (durable facts) · `model` (learned per-family patterns) · `moment` (memories & media). This blueprint
adds documents to `record`/`moment` and domain-tags all three.

---

## 3. Domain Model — domain-agnostic by construction

### 3.1 A Domain is a plugin, not a fork
The central architectural commitment. Adding "Legal" or "Finance" must **not** touch the pipeline. A Domain
is a **declarative package** that the platform loads:

```
Domain {
  id                    # health | family | legal | finance | insurance | property |
                        # government | education | employment | travel | routine | emergency
  entitySchemas         # the typed entities/attributes this domain introduces (e.g. finance → account, policy)
  extractors            # how documents/messages in this domain become knowledge_entries (LLM prompts + validators)
  retrievalHints        # what to fetch when a question routes here (which entities/edges/domains co-retrieve)
  reasoningPolicy       # tone, what it may assert, what it must not, cross-domain links
  trustRules            # the professional boundary — what needs a doctor / lawyer / CA / advisor
  careBindings          # which fulfilment module(s) this domain can activate (→ §8), if any
}
```
Registering a domain adds *data schemas and policy*, never a code path in Retrieval/Reasoning/Orchestration.
This is the same discipline as the design-token system: **the system should get richer without getting bigger.**

### 3.2 The domain registry (3–5 year target)
| Domain | Representative entities & knowledge | Professional boundary (Trust) | Care/fulfilment binding |
|---|---|---|---|
| **Health** | conditions, meds, allergies, reports, vitals, routine | doctor (diagnosis, dosing) | presence, hospital companion |
| **Family** | relationships, roles, life events, preferences, memories | — | — |
| **Legal** | wills, POA, nominations, contracts, disputes | lawyer | document prep, notary errand |
| **Finance** | accounts, investments, loans, taxes, recurring bills | CA / advisor | bill-pay errand, financial concierge |
| **Insurance** | policies, sums assured, renewals, claims | advisor / claims expert | claim-assist, renewal errand |
| **Property** | deeds, tenancy, utilities, maintenance | lawyer / agent | property-check visit, repairs |
| **Government** | IDs, benefits, pensions, certificates | facilitator | document errand, submissions |
| **Education** | enrolment, fees, records, milestones | counselor | — |
| **Employment** | employer, benefits, PF/NPS, documents | — | — |
| **Travel** | trips, tickets, visas, itineraries | — | travel concierge |
| **Routine** | daily patterns, reminders, preferences | — | check-in visit |
| **Emergency planning** | contacts, directives, key documents, access | — | emergency response |

The `CareModuleId` enum already present (`presence, hospital, financial, insurance, property, community`)
is the *fulfilment* half of this table — the domain model and the region/care model were designed to meet.

### 3.3 Cross-domain by default
A single question ("*can we afford Amma's knee surgery, and is it covered?*") legitimately spans Health +
Finance + Insurance. Entries are domain-tagged but **retrieval and reasoning are cross-domain** — the domain
plane *routes and colours* retrieval, it does not silo it. There are no per-domain chatbots. One intelligence,
many domains.

---

## 4. Data Model (design — additive, evolutionary)

**Guiding rule (Constitution §2g):** additive first. Every step below is a *widening* of today's schema that
leaves existing reads working, per the backward-compatibility invariant. One Postgres + pgvector + RLS (§2e).

### 4.1 Evolve `family_ledger` in place (Phase B)
Add nullable columns — no rewrite, no data migration required to keep working:
`domain text default 'general'`, `entity_type text default 'person'`, `structured jsonb`, `confidence real`,
`consent_scope text`, `valid_from timestamptz`, `valid_to timestamptz`, `document_ref uuid`. Existing rows
default to `domain='general', entity_type='person'`, `entity_id := loved_one_id`. `retrieve()` keeps working;
new capabilities light up as columns populate. (This mirrors exactly how `region_code` was added to
`loved_ones`.)

### 4.2 New tables (designed, not built)
| Table | Purpose | Evolves from |
|---|---|---|
| `entities` | typed nodes (person, household, org, document, asset, event) | `loved_ones` becomes `entities` where `type='person'` |
| `relationships` | typed, directional, provenance-bearing edges | (new — implicit today in `relationship` column) |
| `documents` | stored files + extraction status + residency | `memory_items.kind='document'` promoted |
| `document_extractions` | per-document extracted facts, confidence, review state | (new) |
| `knowledge_entries` | the generalised ledger (§2.4) | **is** `family_ledger`, widened |
| `embeddings` | pgvector chunks for semantic retrieval, RLS-scoped | (new — §2e mandates pgvector in the same DB) |
| `domains` | registry/config for each domain (schemas, policy version) | seeded by `care-modules.ts` thinking |
| `consent_grants` | implements `can_access(grantee, object, purpose)` | ratified intent (§2e B3), not yet schema |
| `events` | the append-only Event Store (audit) | partially: `booking_status_history`, escalation fields |
| `service_availability` | {domain, mode, region, provider-network, status} | `service-region.ts` made durable |
| `orchestration_requests` | generalised "a family asked for a real-world service" | `booking_requests` generalised |

### 4.3 Current → future mapping (nothing is thrown away)
- `loved_ones` → `entities[type=person]` (view-compatible; `loved_one_id` stays a valid alias for a while).
- `elder_profiles` → Health-domain `knowledge_entries` + a Health entity attribute set (the 1:1 health node).
- `memories` / `memory_items` → `documents` (+ `moment`-tier knowledge).
- `member_queries` + `conversations`/`conversation_messages` → unified **conversation store** (member_queries
  remains the safety/SLA audit; conversations remains the durable thread — both already coexist correctly).
- `booking_requests` + `bookings` → `orchestration_requests` (generalised; presence is the first mode).
- `subscriptions`/`memberships` → entitlements (which domains & services a family may use).

### 4.4 Isolation, consent, residency (Article X, §2h)
- **RLS everywhere** — the universal `owner = auth.uid()` / `can_manage_family()` pattern extends unchanged to
  every new table. `retrieve()` continues to receive the caller's scoped client and never sees service-role.
- **Consent as data** — `consent_grants` turns the ratified `can_access(grantee, object, purpose)` into a
  queryable gate: a Guardian sees a person only for an active visit; a financial concierge sees only finance-
  domain entries a family has shared for that purpose. Consent is **purpose-scoped**, not global.
- **Data residency per region** — `regions.dataResidency` already declares this; new stores honour it so an
  EU/India family's data can live in-region without redesign.

---

## 5. Retrieval Strategy — Retrieve **v2**

Retrieve-before-Reason (Principle 2) is already law and already a versioned seam. v2 generalises it to
multi-entity, multi-domain, hybrid retrieval, while keeping the v1 guarantees (RLS-structural isolation,
supersede, fail-safe, no fabrication).

### 5.1 The v2 pipeline
```
1. Resolve      subject + entities   (people done; extend the resolver to org/asset/document/event)
2. Route        which domains are relevant  (LLM classifies intent → domain set; deterministic fallback)
3. Retrieve     hybrid:
                 (a) STRUCTURED — filter knowledge_entries by entity/domain/validity, newest-current
                 (b) SEMANTIC  — pgvector similarity over embeddings, consent- and RLS-scoped
                 (c) GRAPH     — 1–2 hop expansion over relationships (the covering policy for this hospital)
4. Merge        provenance-ranked supersede (stated > observed > inferred), de-dup, token-budget
5. Annotate     coverage & service-availability per relevant domain (coverageFor(domain, region))
6. Emit         RetrievedContext.v2  (versioned contract, Article III)
```

### 5.2 The `RetrievedContext.v2` contract (design)
```
RetrievedContext.v2 {
  schemaVersion: 'retrieve.v2'
  subjects: Entity[]                 # may be more than one (cross-entity questions)
  domains: DomainId[]                # which domains this context spans
  knowledge: {                       # provenance-partitioned, as v1 — extended per domain
     stated[], observed[], inferred[]
  }
  relationships: Edge[]              # the graph fragment retrieved
  documents: DocumentRef[]           # evidence, with extraction confidence
  coverage: Record<DomainId, Availability>   # what CloseEye can *do* here
  meta: { retrievedAt, complete, budgetUsed }
}
```

### 5.3 Principles kept
- **Ask, don't search** (§2c) — retrieval is *memory-shaped*: it returns what the family *knows*, provenance-
  labelled, not a keyword hit list. Semantic search is an internal recall mechanism, never the family-facing metaphor.
- **Fail-safe** — any source failing sets `meta.complete=false`, returns partial context, never throws, never
  fabricates (Principle 7, retrieve v1 behaviour preserved).
- **Structural isolation** — cross-family and cross-consent isolation is enforced by RLS + `consent_grants`,
  not by prompt instructions.

---

## 6. Reasoning Strategy

### 6.1 The division of labour (Principles 4 & 5, Understanding Constitution)
- The **LLM understands language and composes prose**. It never decides emergencies, authorises payment,
  dispatches a service, or *is* the source of truth.
- The **platform decides and executes** via the Decision Engine (policy) and Orchestrator (execution).
- The order is fixed: **comprehend → retrieve → reason → answer → remember.**

### 6.2 Multi-domain grounded reasoning
The grounding pattern already live in `answer.ts` (`buildGroundingTurn` injects an invisible, provenance-
labelled context turn) generalises directly: the Context Builder assembles **one cross-domain context block**
from `RetrievedContext.v2`, tagged by provenance and domain, and instructs the model to answer *from this
context and general knowledge only, never inventing*, and to **hand off** when a domain's professional
boundary is reached. The memory-integrity laws (never claim to forget; acknowledge who the family is; frame
gaps as "still learning") are domain-neutral and already in the system prompt.

### 6.3 The single structured outcome (§2i)
Every request resolves to exactly one **NextAction**: `answer | clarify | handoff | execute | escalate`.
- `answer` — grounded response with trust attribution.
- `clarify` — one question, only when it would change the answer (Understanding Constitution).
- `handoff` — route to a professional (doctor/lawyer/CA) — *the domain's trust rule fired*.
- `execute` — trigger Care Orchestration (§8).
- `escalate` — the deterministic safety exit.

### 6.4 Provider independence & evaluation (Articles IX, V)
One AI interface, default Anthropic, swap by config (§2e). Swapping a model re-validates only the
Understanding layer, never the platform (Article IX). Deterministic components are governed by **regression
suites** (the resolver's 8-case matrix, the crisis floor's 100%-recall gate); the LLM by **evals** (grounding
faithfulness, no-fabrication, trust-attribution correctness).

---

## 7. Trust Model — the four epistemic classes

**Requirement:** every answer must let a family distinguish four kinds of statement. This is the difference
between "an AI that knows my family" and "a chatbot with a disclaimer."

| Class | Source | Derived from | Family-facing signal |
|---|---|---|---|
| **Verified family fact** | the family / a Guardian observed it | `provenance = stated \| observed`, high confidence | "from your words" / "observed on the visit" |
| **Inferred conclusion** | CloseEye reasoned or extracted it | `provenance = inferred` (incl. document extracts, unconfirmed) | "my reading — worth confirming" |
| **General knowledge** | the model's world knowledge | not from the graph | "in general…" (clearly not about *your* family) |
| **Professional advice** | out of the platform's authority | domain `trustRules` fired → `handoff` | "this needs a doctor/lawyer — here's how" |

### 7.1 How it's enforced (structural, not stylistic)
- **Provenance is on every entry** (already true) and flows into every answer's attribution — the person-space
  already shows "from your words" vs "my reading." This becomes a consistent **trust chrome** across domains.
- **Confidence + Identity Confidence** ({Suggested, Confirmed, Manual, Unknown}) gate whether an inferred fact
  may be stated plainly or must be flagged "worth confirming."
- **The professional boundary is per-domain data** (`Domain.trustRules`), not a prompt afterthought. A finance
  question that crosses into tax *advice*, or a health question that crosses into *diagnosis*, deterministically
  becomes `handoff`.
- **Never assert professional advice as fact.** The disclaimer stays, but the real mechanism is the handoff.
- **Correction & erasure** (Article X, DPDP) — the family can correct any fact (new `correction` entry,
  supersede) or erase it; the audit event store remains for accountability.

### 7.2 The Trust Test (Executive Context §6a) — kept
The four terminal states remain: **Safe General Guidance · Personalised Guidance · Human Assistance ·
Emergency.** The four epistemic classes above are *how each state is communicated truthfully*.

---

## 8. Care Orchestration Design — intelligence → real-world

**"Connect orchestrates; Care fulfils."** When reasoning detects a real-world need it does not answer — it
produces `NextAction = execute`, entering a **generalised orchestration flow**. This is the *same* flow whether
the service is a Guardian visit, a hospital companion, a bill-payment errand, a document submission, or a
property check. Only the **provider network** and **domain module** differ.

### 8.1 The orchestration pipeline (generalised from today's booking flow)
```
1. Detect intent          reasoning emits an execute intent + service kind + subject entity
2. Resolve location       the loved one's place (entity → household/region)          [never guess]
3. Check availability      coverageFor(domain, mode, region) → available | unavailable | unknown
                            (unknown location is NEVER available — safety over convenience)
4. Confirm readiness       operational prerequisites present? (phone, emergency contact, address)  ← progressive
5. Offer + price           server-authoritative price (CANONICAL_PRICES pattern) — client never sets price
6. Consent + book          request → confirm; consent_grant issued for the fulfilling role, purpose-scoped
7. Payment                 Razorpay order from DB amount (never client) → verified server-side
8. Dispatch                assignment (family_assignments / bookings.companion_id) — deterministic, policy-driven
9. Live updates            status events → the family, in real time (Event Store → notifications)
10. Outcome → graph        the visit/observation returns as knowledge_entry(observation) — the loop closes
```
Steps 5–9 already exist for presence (booking_requests → confirm → Razorpay → companion_assigned → updates).
The blueprint's move is to make steps **1–4 and 10 domain-agnostic and event-sourced**, and to make the
service a first-class `{domain, mode, region, provider-network}` record.

### 8.2 Region activation — any city, no redesign
A service is **`{domain, mode(in-person | remote), region, provider-network, status}`**. Today `SERVICE_REGIONS`
holds exactly one in-person region (`hyderabad-metro`) with an area gazetteer, and `DOMAIN_MODE` maps
`presence → in-person(Hyderabad)`, `financial → remote(India)`. Activating a **new city** is a *data* operation:
add a `service_availability` row (region + provider roster), flip the region's `care` flag. The pipeline,
pricing model, dispatch, and consoles are already region-agnostic (the staff console is proven to serve any
region/brand). **Hyderabad is first; the design supports global activation by configuration, not code.**

### 8.3 Domain-agnostic fulfilment
`care-modules.ts` already enumerates `presence, hospital, financial, insurance, property, community` and the
staff roles that operate them. Each future module is the *same* orchestration with a different provider network
and, where the domain's trust boundary requires, a **licensed professional partner** (lawyer, CA, advisor) as
the fulfilling role — with purpose-scoped consent. The platform never *gives* legal/financial advice; it
*orchestrates access* to a professional who does, and remembers the outcome.

### 8.4 Safety in execution (Principles 3, 5, 7)
Execution follows policy, not prompts. No dispatch without operational readiness. No payment or dispatch
depends solely on an LLM. Pricing is server-authoritative. Every orchestration step is an audit event.

---

## 9. Multi-year Technical Roadmap

**Principles:** every phase is **independently deployable**, **additive** (never a big-bang, §2g), reversible,
and gated by an acceptance test (FAT-style) and the launch validation harness. Sequencing favours *proving the
domain-agnostic thesis early on one second domain* before scaling to many.

| Phase | Theme | Scope (designed already; build here) | Exit criteria |
|---|---|---|---|
| **A · Now → Care launch** | Trust foundation + first fulfilment | Memory Integrity (done); **Care presence live in Hyderabad**; **Trust chrome v1** (surface the 4 epistemic classes consistently); add `domain` column to `family_ledger` (additive, defaults `general`) | A family in Hyderabad can ask → get a grounded, trust-labelled answer → book a Guardian visit → visit returns as an observation |
| **B · Knowledge Graph generalisation** | Make the graph domain-ready | `entities`/`relationships`/`documents`/`document_extractions`; **document ingestion + extraction** (health reports first); **pgvector embeddings**; **Retrieve v2** (hybrid); `consent_grants` gate | A family uploads a report → extracted facts appear as *inferred, confirmable* knowledge → answers cite them with correct trust class |
| **C · Second domain end-to-end** | Prove domain-agnosticism | Register **one** new domain fully (recommend **Finance/Insurance document-intelligence** — high value, document-shaped, clear professional boundary); professional-handoff partner; cross-domain retrieval | A family asks a finance/insurance question → grounded on their own documents → correct handoff when it needs an advisor. **No pipeline code changed to add the domain.** |
| **D · Care orchestration generalised** | Fulfilment beyond presence | `orchestration_requests`; a second Care module (hospital companion or a remote errand); **second city** activation by data | A non-presence service is booked & fulfilled through the same flow; a second city goes live without a redesign |
| **E · Cross-domain & proactive intelligence** | From reactive to anticipatory | Cross-domain reasoning at scale; **emergency-planning** domain; life-event & renewal detection (proactive prompts); learning-by-accumulation (the `model` memory tier) | CloseEye proactively surfaces a real, derived need across domains (a lapsing policy, an upcoming renewal) — never fabricated |
| **F · Platform & scale** | Many domains, many regions, partners | Remaining domains (legal, property, government, education, employment, travel); professional/partner marketplace; multi-region residency at scale | New domains and regions are onboarded as configuration + partner integration, on a stable platform |

Each phase carries its own acceptance gate; none assumes the next. The roadmap is a *sequence of proofs*, not a
feature list — Phase C is the pivotal proof that the architecture is genuinely domain-agnostic.

---

## 10. Risks, open questions, decisions needed

1. **Extraction trust** — document extraction is `inferred` until confirmed; the confirm-UX and the confidence
   threshold for "state plainly vs flag" need a founder-ratified default (`TRUST_THRESHOLD` already exists as a
   contract to extend).
2. **Professional liability boundary** — for legal/finance, the platform must *orchestrate access*, never
   *advise*. The `Domain.trustRules` per-domain boundaries need legal review before those domains ship (Phase C+).
3. **Consent UX** — purpose-scoped consent (`can_access`) is powerful but must stay legible to families. Needs a
   design pass so consent feels like trust, not paperwork.
4. **Two understanding engines** — the legacy deterministic `understand.ts` and the LLM `pipeline.ts` coexist.
   Recommend consolidating on the comprehension pipeline (LLM understands, deterministic validates) per the
   Understanding Constitution, retiring the regex path — a Phase-B cleanup, not a rewrite.
5. **Data residency & regulation** — health (already), and future legal/financial/government data raise DPDP and
   sector-specific obligations; residency-per-region is designed but must be verified before each domain.
6. **pgvector cost & scale** — embeddings storage/compute per family; bounded by the recency/windowing discipline
   already in `retrieve`.
7. **Care ops scaling** — the human network is the hard-to-scale asset; orchestration design must not outrun
   provider supply (Hyderabad-first is the right constraint).

---

## 11. Alignment ledger — this blueprint ↔ ratified law

Every proposal here is an **extension** of existing law. Nothing requires a Constitution amendment; the items
marked ⚑ are *new invariants* recommended for ratification under Article XI (doc-only, founder sign-off).

| Blueprint proposal | Anchored in |
|---|---|
| Family → Retrieve → Reason → Answer, multi-domain | Constitution §2b; Arch. Principle 2; unchanged |
| Knowledge Entry generalises `family_ledger` (append-only, provenance) | `family_ledger` schema; Arch. Article V; §2h |
| Entities/relationships/documents as typed nodes/edges | Arch. Principle 1 (Family Graph = source of truth) |
| Domain as a plugin (data + policy, not a fork) ⚑ | §2f layer discipline; extends §2b — recommend ratifying |
| Retrieve v2 (hybrid, multi-domain, versioned) | `retrieve.v1`; Arch. Article III (versioned contracts) |
| Reasoning grounded, LLM-never-source-of-truth, one NextAction | Principles 4,5,7; §2i; Understanding Constitution |
| Four epistemic classes / trust chrome ⚑ | Executive Context §6a Trust Test; §2h provenance — recommend ratifying the 4-class contract |
| Consent as data (`can_access` → `consent_grants`) | §2e B3 (ratified intent → schema) |
| Care Orchestration generalised; `{domain,mode,region,network}` service | §2 "Connect orchestrates; Care fulfils"; `service-region.ts`; `care-modules.ts` |
| Region activation by configuration (Hyderabad first, global-ready) | §2j Service Region; `regions.ts`/`capability.ts` |
| Additive, independently-deployable phases | §2g Backward Compatibility is Constitutional |

---

### One-paragraph summary for the founder
CloseEye's architecture is already a domain-agnostic platform in disguise: an append-only, provenance-tagged
Family Graph; a versioned, RLS-safe retrieval seam; a deterministic safety/decision core with the LLM boxed in
as "language only"; and a region/capability layer that already names the very domains (presence, financial,
insurance, property…) we want to grow into. This blueprint makes that latent design **explicit** — Knowledge
Entries over typed Entities, Domains as plugins (data + policy, never forks), Retrieve v2 (hybrid, cross-domain),
a four-class Trust model surfaced consistently, and one generalised Care-orchestration flow that activates any
city or service by configuration. The recommended path proves the thesis early (Phase C: one full second
domain, *no pipeline change*) and scales from a foundation families already trust. **Nothing here breaks a frozen
decision; two new invariants (Domain-as-plugin, the four-class Trust contract) are flagged for your
ratification.**
