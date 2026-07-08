# Prediction Models (Operational Intelligence)

Pillar 4 turns operational history into **forward-looking, human recommendations**.
Today the signals are computed deterministically from existing aggregates; each maps to a
real model later. Output is always: *what's coming → why → what to do*, with a verdict
(Improving / Stable / Needs attention).

## Signals

| Prediction | Reads | Rule (today) | Real model (later) |
|---|---|---|---|
| **Guardian shortage** | zone Guardian count vs visit load (`ZONES`) | zone marked `gap` → shortage; count at-risk visits | Demand forecast per zone vs roster & availability |
| **Companion shortage** | Companion-visit growth + weekend concentration | growth > threshold, flat supply → shortfall | Seasonality + booking curve per service |
| **Cancellation hotspot** | cancellation reasons by zone (`CANCEL_REASONS`) | cluster of guardian-unavailable in one zone | Reason × zone × time anomaly detection |
| **Resource utilisation** | on-visit / total (`GUARDIANS`) | % utilisation band → headroom advice | Utilisation vs SLA + fatigue model |
| **Guardian burnout** | visits/day streak | ≥4/day for 6 days → risk | Load + hours + sentiment |
| **Family disengagement** | days since last report view | ≥14 days → follow-up | Engagement decay curve |
| **Churn risk** | disengagement + cancellations + satisfaction | composite watch | Survival model |

## Principles

- **No new data** — predictions read what the platform already records.
- **Actionable** — every prediction carries the single best next step (hire, reassign,
  call, keep steady), never just a number.
- **Confidence stays human** — expressed as "forming / at risk / healthy", not a raw
  probability, to keep the console calm and decisive.
- **Swap boundary** — `operationalIntelligence()` (+ the wellness/relationship helpers)
  in `lib/cloza-engine.ts` is the only thing that changes when a model lands.
