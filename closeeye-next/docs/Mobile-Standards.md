# Close Eye — Mobile Standards (Production-Ready)

**Status:** Ratified by the founder, 2026-07-23. This is governance — it sits with
Product-Bible, Design-System, Brand-Guidelines and Decision-Log. New mobile/responsive
work must meet this bar; existing surfaces are brought up to it as they're touched.

> **Architecture note (read first).** Close Eye ships as a **Capacitor remote-shell**
> app that loads the live web build (`https://www.closeeye.app`). So this charter has two
> layers: **(A) native shell** concerns handled in the Android/iOS project, and **(B) web**
> concerns handled in `closeeye-next`. Each rule below is tagged **[shell]**, **[web]**, or
> **[both]** so it's actionable, not aspirational.

---

## Android

- **Target SDK 35** — `compileSdk`/`targetSdk = 35`. **[shell]**
- **Material 3** — native chrome (splash, system bars, dialogs) follows M3. **[shell]**
- **Predictive Back** — opt into the predictive back gesture; every in-app overlay/sheet
  must respond to the OS Back gesture (we already route hardware Back through
  `history.pushState`/`popstate` in the shared overlay). **[both]**
- **Edge-to-edge** — draw under the status/nav bars; content respects insets via
  safe-area env() padding, never fixed bars. **[both]**
- **Dynamic color** — native theming may adopt Material You dynamic color where it doesn't
  fight the brand; the **web brand palette stays authoritative** for in-app UI. **[shell]**
- **Adaptive icons** — foreground/background layers, all density buckets. **[shell]**

## iOS

- **Human Interface Guidelines** — native transitions, sheets, and system affordances
  follow HIG. **[both]**
- **Safe Areas** — honor top/bottom/left/right insets on every screen; no content under the
  notch, Dynamic Island, or home indicator. **[both]**
- **Dynamic Type** — respect the user's text-size setting; type scales without clipping. **[web]**
- **VoiceOver** — every control labelled and reachable in a sensible order. **[web]**
- **Universal Links** — `apple-app-site-association` + associated domains so `closeeye.app`
  links open the app. **[shell]**

---

## Responsive Design — the app must be perfectly responsive

**Width matrix (dp/px logical):** 320 · 360 · 375 · 390 · 412 · 480 · 600 · 720 · 840 ·
tablets · foldables. **Both orientations: portrait + landscape.**

**Device coverage:** OnePlus · Samsung · Google Pixel · Xiaomi · Vivo · Oppo · Motorola ·
Nothing Phone · iPhone SE · iPhone 16 Pro Max · iPads.

The 320dp floor and the foldable/landscape cases are the ones that break layouts — they are
mandatory in every review, not optional.

## UI Rules (hard constraints)

- **Never** use fixed widths.
- **Never** use fixed heights unless truly necessary.
- Use flexible layouts (flex/grid + `gap`, relative units, `max-width: 100%`).
- Respect: Safe Areas · notches · punch-hole cameras · curved displays · gesture navigation
  · dynamic font scaling · accessibility text scaling.
- **No clipping. No overlap. No overflow. No hidden buttons.**
- Fixed/sticky chrome (docks, sheets, headers) must reserve space so it never covers content
  or interactive targets.

## Performance

- Launch quickly (fast first paint; minimal blocking JS).
- Maintain 60fps (no jank on scroll/animation; GPU-friendly transforms).
- Lazy load (routes, images, heavy components).
- Cache intelligently (service worker; bump `sw.js` VERSION every deploy).
- Optimize images (right format/size, responsive `srcset`, no oversized assets).
- Avoid unnecessary rebuilds/re-renders.
- Minimize network requests; work well on slow networks (graceful, offline-aware).

## Accessibility — WCAG AA

- Screen readers: **TalkBack** (Android) + **VoiceOver** (iOS).
- Large fonts / accessibility text scaling without breakage.
- High contrast supported.
- **Reduced motion** honored (`prefers-reduced-motion`).
- **Minimum touch target 48dp** (44pt iOS floor met by 48dp).
- **WCAG AA** contrast and semantics throughout.

---

## Definition of Done (enforceable checklist)

A mobile surface is "production-ready" only when all pass:

1. Renders with no clip/overlap/overflow at **320, 360, 375, 390, 412, 480, 600, 720, 840**,
   both orientations.
2. All interactive targets ≥ **48dp**; visible keyboard/focus state.
3. Safe-area insets respected top/bottom/sides; nothing under notch, island, or home indicator.
4. Text scales to the OS max accessibility size without truncation or hidden buttons.
5. `prefers-reduced-motion` disables non-essential animation.
6. axe / Lighthouse: **0 WCAG AA violations**; contrast AA on all text.
7. 60fps on a mid-tier Android (throttled) and iPhone SE.
8. Screen-reader pass (VoiceOver + TalkBack): every control announced, logical order.

## How we verify (tie into the Launch Validation Harness)

Extend the existing Playwright + axe + Lighthouse harness to iterate the width matrix and
both orientations, fail the build on any WCAG AA violation or horizontal overflow, and
capture screenshots per breakpoint. Native shell items (SDK 35, adaptive icons, Universal
Links, Predictive Back opt-in, dynamic color) are checked in the Android/iOS projects on the
Mac build, not in the web harness.

**Precedence unchanged:** founder's word > Constitution > docs (incl. this file) > code.
