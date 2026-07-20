# App Identity & PWA Assets — Audit (pre-Founder-Beta)

**Date:** 2026-07-20 · **Scope:** polish only — icons, splash, manifest, browser/social assets, loading &
native feel, brand consistency. **No product/feature/architecture changes.** Target front door: **closeeye.app**
(global Connect); the same deployment also serves closeeye.in (India Care) and connect.closeeye.in (UAT), so
several fixes must be **host-aware**, not blanket replacements.

---

## Headline finding

The mark-based **icon set already largely exists and is on-brand** (the green-gradient CloseEye mark). The real
gap is **not missing pixels — it's identity**: every install-time and social string is still the **legacy India
"Care" positioning** ("trusted human presence… home wellbeing visits, hospital companionship… across India"). So
when a family installs **closeeye.app** today, the home-screen name, the app description, the social preview, and
the search metadata all describe a *different product* than the Connect "Family Intelligence" homepage we just
shipped. **That mismatch — not icon sizes — is what makes the installed app feel unfinished.**

This is a **brand-copy decision** (founder's call) + a **host-aware split** (Connect identity on .app /
connect.closeeye.in; Care identity stays on .in) — the same pattern already used for og:url/locale.

---

## A. Current-state inventory

### Icons (exist)
| Asset | Size | State |
|---|---|---|
| `favicon.ico` | 48 | ✓ |
| `favicon.svg` | vector | ✓ |
| `favicon-16.png` / `favicon-32.png` | 16, 32 | ✓ |
| `apple-touch-icon.png` | 180 | ✓ mark on **ivory** |
| `icons/android-chrome-192.png` / `-512.png` | 192, 512 | ✓ (opaque) |
| `icons/maskable-icon-512.png` | 512 | ✓ — **safe-zone not verified** |
| `logo-mark.png` | 512 (alpha) | ✓ |
| `og-image.png` | 1200×630 | ✓ mark on forest — **no wordmark/tagline** |
| Master vectors `public/brand/close-eye-{icon,horizontal,stacked}(-white).svg` | vector | ✓ source of truth |

### Manifest (`app/manifest.ts`) & metadata (`app/layout.tsx`, `lib/site.ts`)
- `name`: "Close Eye — a trusted human presence for the people you love" · `description`: "…home wellbeing
  visits, hospital companionship… across India" · `categories: [health, lifestyle, medical]` — **all India-Care.**
- `theme_color #0E2A1F`, `background_color #F6F3EC`, `display standalone`, `orientation portrait` — **good.**
- Root metadata title "When you can't be there, Close Eye can" + keywords "elder care India / NRI parent care" —
  **India-Care.**
- `viewport-fit: cover` ✓, light/dark `themeColor` ✓, `appleWebApp.capable` ✓.

## B. Gaps (what's missing / off)

**Identity (P0 — founder decision):**
1. Global install identity (name/short_name/description/categories) is India-Care, not Connect. *Host-aware split.*
2. Root `<title>`, `description`, `keywords`, OG/Twitter copy are India-Care on the global door.
3. OG/social image has **no wordmark or tagline** — thin for a share card.

**Assets (P1 — mechanical, generated from the master vector):**
4. **Monochrome icon** (Android 13+ themed icons, `purpose: "monochrome"`) — missing.
5. **iOS splash screens** (`apple-touch-startup-image`, per-device media queries) — **missing entirely.**
6. **Safari pinned-tab** mask icon (`mask-icon.svg`, single-colour) — missing.
7. Manifest **`screenshots`** (richer Android/desktop install UI) — missing.
8. Manifest **`shortcuts`** (e.g. "Ask", "My family") — missing (optional but cheap polish).
9. Manifest **`id`** field — missing (recommended for stable identity).
10. Maskable icon **safe-zone** (mark within the inner 80% circle) — needs verification/regeneration.

**Native/loading feel (P2 — review):**
11. `appleWebApp.statusBarStyle: 'default'` — a standalone install feels more native with `'black-translucent'`
    (edge-to-edge) *if* content respects safe areas. To evaluate.
12. `native-init.tsx` status bar + post-OAuth route are Care-app oriented (`/family`, ivory bar). Native builds
    are separate (Capacitor loads the live URL); web PWA unaffected. Review for Connect.
13. Loading experience: first-paint / skeletons / splash transition — to review on device.

## C. Plan (once identity is approved)

1. **Identity** — set the global (closeeye.app / connect.*) install identity to the approved Connect copy; keep
   Care copy on closeeye.in via the existing host-aware mechanism. Update `manifest.ts`, `layout.tsx`, and a
   Connect-scoped identity source. *(Brand copy — awaiting founder wording.)*
2. **Generate** (sharp, from `public/brand/close-eye-icon.svg`): full PNG size ladder (48→1024), monochrome icon,
   verified maskable (80% safe-zone), Safari pinned-tab mask, Apple-touch, iOS splash set (iPhone + iPad, light),
   redesigned OG/social (mark + wordmark + tagline), manifest screenshots.
3. **Wire** — manifest `icons[]` (+ monochrome), `screenshots`, `shortcuts`, `id`; `layout.tsx` icon links,
   `apple-touch-startup-image` `<link>`s, `mask-icon`; statusBarStyle decision.
4. **Validate** — Lighthouse PWA/installability; install on Android + iPhone + desktop; offline launch; home-screen
   launch + splash; capture before/after screenshots → this doc's appendix + a validation report.

**Nothing in section C is executed yet — this audit is the plan for approval.** Deliverables on completion:
before/after screenshots, all generated assets, and a validation report appended here.
