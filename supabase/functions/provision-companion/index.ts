// provision-companion — approve a companion application into a loginable Guardian.
//
// Turns a companion_applications row (or explicit fields) into the three-part
// identity a Guardian needs to sign in and be assigned visits:
//   1. an auth.users account (email-confirmed, passwordless — logs in via
//      Google / email magic-link at /guardian/login),
//   2. profiles.role = 'companion',
//   3. a companions row whose id == that auth uid, status = 'approved'.
//
// POST { application_id }                      ← approve an application (primary)
//   OR { full_name, email, phone?, city?, age?, gender?, languages? }  ← direct add
//
// Auth: JWT must belong to a Super Admin (profiles.role = 'admin').
// The role flip to 'companion' relies on migration 20260710110000 teaching
// prevent_role_self_escalation to allow the service_role connection.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, checkOrigin } from '../_shared/cors.ts'

const GENDERS = new Set(['male', 'female', 'other'])

interface SourceFields {
  full_name?: string | null
  email?: string | null
  phone?: string | null
  city?: string | null
  age?: number | null
  gender?: string | null
  languages?: string[] | null
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  const originErr = checkOrigin(req)
  if (originErr) return originErr

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  // ── Service-role client (full DB access, bypasses RLS) ─────────────────────
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // ── Authenticate caller (must be a Super Admin) ────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  const sbAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authErr } = await sbAuth.auth.getUser()
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  const { data: callerProfile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'admin') return json({ error: 'Forbidden — admin only' }, 403)

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const applicationId = typeof body.application_id === 'string' ? body.application_id : null

  // ── Resolve source fields (from the application, or explicit body fields) ──
  let src: SourceFields
  if (applicationId) {
    const { data: app, error: appErr } = await sb
      .from('companion_applications')
      .select('full_name, email, phone, area, age, gender, languages, status')
      .eq('id', applicationId)
      .single()
    if (appErr || !app) return json({ error: 'Application not found' }, 404)
    src = { full_name: app.full_name, email: app.email, phone: app.phone, city: app.area, age: app.age, gender: app.gender, languages: app.languages }
  } else {
    src = {
      full_name: typeof body.full_name === 'string' ? body.full_name : null,
      email: typeof body.email === 'string' ? body.email : null,
      phone: typeof body.phone === 'string' ? body.phone : null,
      city: typeof body.city === 'string' ? body.city : null,
      age: typeof body.age === 'number' ? body.age : null,
      gender: typeof body.gender === 'string' ? body.gender : null,
      languages: Array.isArray(body.languages) ? (body.languages as string[]) : null,
    }
  }

  const fullName = (src.full_name ?? '').trim()
  const email = (src.email ?? '').trim().toLowerCase()
  if (!fullName) return json({ error: 'A full name is required' }, 400)
  if (!email) return json({ error: 'An email is required to create a Guardian login' }, 400)

  // ── 1) Create (or find) the auth user ──────────────────────────────────────
  let userId: string | null = null
  let created = false
  const { data: authData, error: createErr } = await sb.auth.admin.createUser({
    email,
    email_confirm: true, // passwordless — logs in via Google / magic-link
    user_metadata: { full_name: fullName },
  })
  if (createErr) {
    const already = createErr.message?.includes('already been registered') ||
      (createErr as { code?: string }).code === 'email_exists' ||
      (createErr as { status?: number }).status === 422
    if (already) {
      const { data: existing } = await sb.auth.admin.listUsers()
      userId = existing?.users?.find((u) => u.email === email)?.id ?? null
      if (!userId) return json({ error: 'That email already exists but the account could not be resolved.' }, 500)
    } else {
      console.error('[provision-companion] createUser failed:', createErr)
      return json({ error: 'Could not create the Guardian account. Please try again.' }, 500)
    }
  } else {
    userId = authData.user?.id ?? null
    created = true
  }
  if (!userId) return json({ error: 'Could not resolve the Guardian user id.' }, 500)

  // ── 2) Promote the profile to a Guardian ───────────────────────────────────
  // The role flip sticks thanks to the service_role allowance on
  // prevent_role_self_escalation (migration 20260710110000).
  const { error: profErr } = await sb.from('profiles')
    .upsert({ id: userId, full_name: fullName, role: 'companion' }, { onConflict: 'id' })
  if (profErr) {
    console.error('[provision-companion] profile upsert failed:', profErr)
    return json({ error: 'Could not set the Guardian role.' }, 500)
  }

  // ── 3) Upsert the companions row (id == uid; approved, ready to assign) ────
  const companionRow: Record<string, unknown> = { id: userId, full_name: fullName, email, status: 'approved' }
  if (src.phone) companionRow.phone = src.phone
  if (src.city) { companionRow.city = src.city; companionRow.area = src.city }
  if (typeof src.age === 'number') companionRow.age = src.age
  if (src.gender && GENDERS.has(src.gender)) companionRow.gender = src.gender
  if (src.languages && src.languages.length) companionRow.languages = src.languages

  const { error: compErr } = await sb.from('companions').upsert(companionRow, { onConflict: 'id' })
  if (compErr) {
    console.error('[provision-companion] companion upsert failed:', compErr)
    return json({ error: 'Could not create the Guardian record.' }, 500)
  }

  // ── 4) Mark the application approved ───────────────────────────────────────
  if (applicationId) {
    await sb.from('companion_applications').update({ status: 'approved' }).eq('id', applicationId)
  }

  return json({ ok: true, companion_id: userId, created })
})
