# CLOza Index (internal)

**CLOza is an internal technology name — it never appears in the UI.** Everything the
customer or staff sees is human: **Insights · Recommendations · Daily Brief · Wellness
Trends**. CLOza is the proprietary engine under the hood (a defensible technology story);
the product experience stays simple and warm.

## What CLOza is

The CLOza Index is Close Eye's intelligence layer. It **interprets data that already
exists** — it never collects new data and never exposes raw scores or algorithms:

- **Family Space** — reports viewed, requests, messages, engagement.
- **Guardian App** — CLOza observations (mood, mobility, sleep, medication, hydration,
  conversation, safety, appetite), vitals, media, punctuality (see `lib/cloza.ts`).
- **Presence Console** — visits, cancellations, escalations, coverage.
- **Operations Admin** — revenue, memberships, churn, collection.

## What it produces (all human-readable)

Every output answers three questions — **what happened? why? what next?** — via one
engine, `lib/cloza-engine.ts`:

| Pillar | UI name | Output |
|---|---|---|
| 1 · Family Wellness Index | **Wellness trends** | Per-dimension verdict (Improving / Stable / Needs attention) over 7 / 30 / 90 days |
| 2 · Relationship Intelligence | **Relationship insights** | Engagement signal per family + a recommended reach-out |
| 3 · Care Quality Intelligence | **Care quality** | Consistency / punctuality / feedback + gentle coaching |
| 4 · Operational Intelligence | **What's coming** | Predicted shortages, hotspots, utilisation + suggested staffing |
| 5 · Founder Daily Brief | **Daily brief** | Business · Operations · Families · Revenue · Risk + top recommendations |
| AI Story Engine | **One visit, every audience** | The same visit told for Family / Doctor / Presence Manager / Founder |

Plus **proactive alerts** (mood declining, medication missed, guardian burnout, family
disengagement, repeated cancellations, renewals due) and **natural-language search**
("show families needing follow-up").

## Where it lives

The intelligence surfaces in one place — **`/admin/insights`** ("Insights") — so it does
**not** duplicate any operational dashboard. It reads the same stores every module uses;
there is **no duplicate storage**. Related docs:
[intelligence-engine](./intelligence-engine.md) · [ai-prompts](./ai-prompts.md) ·
[prediction-models](./prediction-models.md). The observation foundation is
[Component-Library → CLOza](./Component-Library.md).

## Rule

No raw AI terminology, no scores as numbers to Guardians, no exposed algorithms — only
warm, action-oriented insight. If a screen shows a model output verbatim, rewrite it.
