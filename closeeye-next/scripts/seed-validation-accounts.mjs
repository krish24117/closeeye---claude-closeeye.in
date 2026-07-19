/**
 * Seed the three permanent Launch-Validation accounts (empty / family / power).
 *
 * Uses the public anon key (auto-confirm is ON, so sign-up returns a live session) and seeds each
 * account's OWN data via RLS-permitted inserts — no service-role key required. Idempotent: an
 * account that already has loved_ones is left alone. Reads NEXT_PUBLIC_SUPABASE_URL /
 * NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local.
 *
 *   node scripts/seed-validation-accounts.mjs
 *
 * The primary Playwright account is `family`. Credentials are documented in docs/VALIDATION.md and
 * set as PLAYWRIGHT_USER / PLAYWRIGHT_PASS (local .env.local + GitHub secrets).
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const PASSWORD = 'CloseEye!Validation#2026'

const person = (full_name, relationship, facts, healthy = false) => ({ full_name, relationship, facts, healthy })
const F = (label, body) => ({ label, body })

const ACCOUNTS = {
  empty: {
    email: 'validation-empty@closeeye-validation.test',
    full_name: 'Aarav (Empty)',
    people: [],
  },
  family: {
    email: 'validation-family@closeeye-validation.test',
    full_name: 'Anita Sharma',
    people: [
      person('Rajesh Sharma', 'father', [F('Health', 'Manages blood pressure with a morning tablet'), F('Their days', 'Walks in the park after breakfast every day'), F("Who's nearby", 'Neighbour Sunil looks in on him daily')], true),
      person('Lakshmi Sharma', 'mother', [F('Health', 'Diabetic — checks sugar before dinner'), F('Their days', 'Tends her garden each evening')]),
      person('Priya Sharma', 'wife', [F('Their days', 'Works from home; calls her parents on Sundays')]),
    ],
  },
  power: {
    email: 'validation-power@closeeye-validation.test',
    full_name: 'Vikram Rao',
    people: [
      person('Suresh Rao', 'father', [F('Health', 'Recovering from a knee replacement'), F('Their days', 'Morning yoga, then the newspaper'), F("Who's nearby", 'Lives with his brother')], true),
      person('Kamala Rao', 'mother', [F('Health', 'On thyroid medication'), F('Their days', 'Temple visit each morning')]),
      person('Anjali Rao', 'sister', [F('Their days', 'Doctor; on call most weekends')]),
      person('Deepak Rao', 'brother', [F("Who's nearby", 'Two streets away from father')]),
      person('Meera Rao', 'grandmother', [F('Health', 'Hard of hearing; uses a hearing aid'), F("Who's nearby", 'A live-in helper, Radha')], true),
      person('Arjun Rao', 'son', [F('Their days', 'Boarding school; home for holidays')]),
    ],
  },
}

async function seedAccount(key, spec) {
  const sb = createClient(SB_URL, ANON, { auth: { persistSession: false } })
  // get-or-create
  let { data, error } = await sb.auth.signUp({ email: spec.email, password: PASSWORD, options: { data: { full_name: spec.full_name } } })
  if (error && /already|registered/i.test(error.message)) {
    ;({ data, error } = await sb.auth.signInWithPassword({ email: spec.email, password: PASSWORD }))
  }
  if (error || !data?.user) { console.log(`✗ ${key}: auth failed — ${error?.message}`); return }
  const uid = data.user.id
  console.log(`• ${key} (${spec.email}) → ${uid}`)

  // idempotency: skip if already has family
  const { data: existing } = await sb.from('loved_ones').select('id').eq('family_user_id', uid).limit(1)
  if (existing && existing.length) { console.log(`  already seeded (${spec.people.length} planned) — skipping`); return }

  for (const p of spec.people) {
    const { data: lo, error: e1 } = await sb.from('loved_ones')
      .insert({ family_user_id: uid, full_name: p.full_name, relationship: p.relationship, region_code: 'IN', address: 'Jubilee Hills, Hyderabad, Telangana' })
      .select('id').single()
    if (e1 || !lo) { console.log(`  ✗ loved_one ${p.full_name}: ${e1?.message}`); continue }
    const rows = p.facts.map((f) => ({ loved_one_id: lo.id, label: f.label, body: f.body, entry_type: 'family_fact', source: 'connect_experience' }))
    if (p.healthy) rows.push({ loved_one_id: lo.id, label: 'Guardian visit', body: 'Visited and doing well.', entry_type: 'guardian_observation', source: 'guardian' })
    const { error: e2 } = await sb.from('family_ledger').insert(rows)
    console.log(`  ${e2 ? '✗' : '✓'} ${p.full_name} (${p.relationship}) — ${rows.length} facts${e2 ? ' — ' + e2.message : ''}`)
  }
}

for (const [key, spec] of Object.entries(ACCOUNTS)) await seedAccount(key, spec)
console.log('\nDone. Primary Playwright account: validation-family@closeeye-validation.test')
