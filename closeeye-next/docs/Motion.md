# Close Eye — Motion

Motion is **very subtle** — it should feel like calm, never like a demo.

## Principles

- **Types:** fade, slide (≤24px), scale. Nothing else.
- **Duration:** 200ms (controls), 250ms (transitions), 600ms (scroll reveals).
- **Easing:** `--ease` = `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out). One curve everywhere.
- **Reduced motion:** every animation falls back to a static render under
  `prefers-reduced-motion`. The `Reveal`, `Stagger`, and booking transitions all honour it.
- **Purpose only:** motion guides attention (a step entering, a card lifting on hover).
  Never decorative loops, parallax, or bounce.

## Where it lives

- `components/ui/reveal.tsx` — `Reveal` (scroll fade/slide) and `Stagger`/`StaggerItem`.
- Hover lifts on cards/buttons: `hover:-translate-y-0.5`, `duration-200 ease-premium`.
- Booking step transitions: `AnimatePresence` fade+slide, 250ms (`booking-wizard.tsx`).
- Loading: a single spinner + rotating reassurance messages (booking review). No skeleton jank.
