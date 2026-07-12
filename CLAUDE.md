# Close Eye — Instructions for Claude

**[CONSTITUTION.md](./CONSTITUTION.md) is the single source of truth.** Read it first —
it governs product truths, design authority, architecture, locked decisions, and the
working protocol. The founder's direct instruction always wins; otherwise the
Constitution decides, then [`closeeye-next/docs/`](closeeye-next/docs/), then the code.

## Non-negotiables (full detail in the Constitution)

- **Machines** — Windows = primary development; Mac = iOS build / Simulator / App Store
  signing **only**. Don't switch to the Mac unless the task truly needs it.
- **Every feature, in order** — ① explain the plan → ② **wait for approval** →
  ③ implement → ④ run tests → ⑤ commit to Git.
- **Never change business logic without asking first** — pricing, booking, auth, data
  model / RLS, membership, red-flag / crisis logic, payments.
- **The product lives in `closeeye-next/`** — Next.js 15, Supabase backend, Manrope,
  light-only, brand **"Close Eye"** (two words).
- **Deploy** — `git push origin main` → Vercel auto-deploys → closeeye.in.

Governance corpus: [`closeeye-next/docs/`](closeeye-next/docs/) — Product-Bible,
Design-System, Brand-Guidelines, Decision-Log.
