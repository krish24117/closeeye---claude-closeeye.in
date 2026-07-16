#!/usr/bin/env node
/**
 * Fold admin-flagged understanding failures into the growing regression suite.
 *
 * Reads understanding_log rows an admin marked "for regression" (reviewed = true,
 * with an `expected` note) and appends them as cases to lib/connect/cases.json.
 * The suite only grows — existing cases are never removed, new ones are deduped by
 * text. A freshly-added case that fails is a real failure to fix.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/sync-understanding-cases.mjs
 *   # then:  npx vitest run lib/connect/cases.test.ts
 *
 * `expected` is free text parsed as comma-separated key:value pairs, e.g.
 *   "subject: family, need: errand"   →  { subjectKind:'family', subjectKnown:true, need:'errand' }
 *   "subject: none"                   →  { subjectKind:'none',   subjectKnown:false }
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.')
  process.exit(1)
}

const CASES = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'connect', 'cases.json')

function parseExpected(expected) {
  const out = {}
  for (const part of String(expected || '').split(',')) {
    const i = part.indexOf(':')
    if (i < 0) continue
    const k = part.slice(0, i).trim().toLowerCase()
    const v = part.slice(i + 1).trim()
    if (!k || !v) continue
    if (k === 'subject' || k === 'subjectkind') { out.subjectKind = v.toLowerCase(); out.subjectKnown = !/^(none|null|no|unknown)$/i.test(v) }
    else if (k === 'need') out.need = v.toLowerCase()
    else if (k === 'subjectknown' || k === 'known') out.subjectKnown = /^(true|yes|1)$/i.test(v)
    else if (k === 'forloved') out.forLoved = /^(true|yes|1)$/i.test(v)
  }
  return out
}

const sb = createClient(url, key, { auth: { persistSession: false } })
const { data, error } = await sb
  .from('understanding_log')
  .select('raw_text, expected, created_at')
  .eq('reviewed', true)
  .not('expected', 'is', null)
  .order('created_at', { ascending: true })
if (error) { console.error('Query failed:', error.message); process.exit(1) }

const cases = JSON.parse(readFileSync(CASES, 'utf8'))
const seen = new Set(cases.map((c) => c.text.trim().toLowerCase()))
let added = 0
for (const row of data || []) {
  const text = (row.raw_text || '').trim()
  if (!text || seen.has(text.toLowerCase())) continue
  const parsed = parseExpected(row.expected)
  if (Object.keys(parsed).length === 0) continue
  cases.push({ text, ...parsed, note: 'flagged in review' })
  seen.add(text.toLowerCase())
  added++
}
writeFileSync(CASES, JSON.stringify(cases, null, 2) + '\n')
console.log(`Synced ${added} new case(s) → lib/connect/cases.json (total ${cases.length}).`)
console.log('Next: npx vitest run lib/connect/cases.test.ts')
