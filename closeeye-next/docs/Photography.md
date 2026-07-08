# Close Eye — Photography Direction

Photography is how Close Eye feels **human before it feels technological** — the
single biggest lever on trust. Treat it with the discipline of the colour system.

## Register

- **Natural light** — window light, golden hour, soft shadows. Never studio flash.
- **Warm tones** — the brand's warm-ivory register. No cold blues, no clinical whites.
- **Real environments** — actual homes, real hospital rooms, kitchens, verandas.
- **Real people, real emotion** — genuine smiles, hands held, a shared cup of tea. Candid over posed.
- **Unhurried** — the feeling is *presence*: someone with time, not a transaction.
- **Indian families** — parents, grandparents, adult children (often abroad), caregivers.

## Never

Corporate stock. Passport / LinkedIn headshots. Cold hospital stock. Staged
call-centre shots. AI-looking faces. Heavy filters, HDR, or bright gradients over faces.

## Founder portrait

Editorial magazine-profile register (think Airbnb founder features) — real
environment, natural light, business-casual, warm expression. **Not** a passport
photo. The current portrait is a placeholder to be replaced with a proper editorial shoot.

## Implementation

Every image slot is the `<ImageFrame>` component: fixed aspect ratios, subtle warm
treatment (`.photo-warm`), optional bottom scrim (`gradient`) for text legibility
(a functional scrim, not a decorative gradient). Slots without a final photo render
an on-brand placeholder that **carries the art-direction note** (the `direction`
prop), so the intended shot is documented in place and drops in with no layout change.

Delivery: AVIF/WebP via `next/image`, `sizes` per slot, `priority` only above the fold.
