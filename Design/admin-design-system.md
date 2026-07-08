# Close Eye — Admin Design System (`admin.css`)

A single, dependency-free stylesheet that defines the look of the admin console:
tokens + reusable components. Apply these classes to the **existing** admin
markup. This is a re-skin layer — it changes appearance only, never behaviour.

## Install

1. Put `admin.css` in `src/styles/admin.css`.
2. Import it once at the admin shell (not per-screen):
   ```js
   import "@/styles/admin.css";
   ```
3. Self-host **Open Sauce Sans** in `/public/fonts/` and fix the `@font-face`
   paths at the top of the file. Do not load fonts from a CDN.
4. Put the optimized logo at `/public/logo-mark.png`.

## Scope

Wrap the whole admin app in one element so these styles never collide with
Tailwind utilities or the public marketing site:

```html
<div class="ce-admin">
  <div class="app">
    <aside class="side">…sidebar…</aside>
    <div class="main">
      <div class="top">…title + action…</div>
      <div class="content">…current screen…</div>
    </div>
  </div>
</div>
```

Every rule in the file is scoped under `.ce-admin`, and the tokens
(`--forest`, `--cream`, etc.) live on `.ce-admin`, so they only apply inside it.

## Shell markup

```html
<aside class="side">
  <div class="brand">
    <img class="logo-img" src="/logo-mark.png" alt="">
    <span class="nm">close eye</span><span class="tag">admin</span>
  </div>
  <nav class="nav">
    <div class="grp">Operations</div>
    <a class="on"><span class="ic">▦</span> Dashboard</a>
    <a><span class="ic">💬</span> Health queries <span class="badge">16</span></a>
    …
  </nav>
  <div class="who"><div class="av">K</div><div><div class="n">Krishna</div><div class="r">Founder · Admin</div></div></div>
</aside>
```

Use your existing router for nav clicks and the `.on` class for the active item.

## Component cheat-sheet

- **Stat card:** `.stat` > `.l` (label) / `.v` (value) / `.d` (delta). Alert variant: `.stat.alert`.
- **Table:** plain `<table>` inside `.card`. Name cell `.nm2`, sub-text `.meta`.
- **Status pill:** `.pill.green | amber | grey | clay | blue`. Use semantic meaning only (status, not decoration).
- **Buttons:** `.btn` (primary), `.btn.ghost` (secondary), `.btn.lg` (large).
- **Filter chips:** `.filters` > `button`, active = `.on`, count = `.n`.
- **Emergency banner:** `.emerg` (reserve clay for real alerts only).
- **Companion pipeline:** `.pipe` > `.pstage` (`.cert` for certified); progress = `.dotstage` > `i.done | i.cur`.
- **Bar chart:** `.chart` > `.bar` > `.col` (set inline `height:%`).
- **Health workbench:** `.hqwrap` > `.hqq` (queue) + `.hqd` (detail). Urgency = `.urg.red|amber|grey`; SLA = `.sla.ok|due|over`; care context = `.ctx`; AI draft = `.draft`.
- **Plan cards:** `.plans` > `.plan` (`.feat` = featured middle).
- **Settings rows:** `.setrow` > `.sk`/`.sv`; switch = `.toggle` (`.off` = off).
- **Export cards:** `.exp` > `.expc` > `.ei`/`.et`/`.es`.
- **Section header:** `.sec-h` (optional `.link` on the right).

## Rules

- One accent (the greens). `--clay`/`--gold`/`--blue` are **status-only**.
- Generous whitespace, cards on cream, minimal borders, no decorative emojis.
- Keep contrast WCAG AA. Focus states are defined for `.btn` and nav links.
- Reference look: `closeeye-admin.html` (the full mockup).
