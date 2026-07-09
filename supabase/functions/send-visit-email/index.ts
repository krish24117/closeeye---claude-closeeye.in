// Supabase Edge Function — send-visit-email
//
// Emails the family a branded Care Report link + PDF after a completed visit.
// Mirrors send-visit-whatsapp's auth + data loading; sends via Resend.
//
// STATUS: prepared. Inert until an email provider is configured — set the
// RESEND_API_KEY (and optionally RESEND_FROM) secret and deploy this function.
// Without the key it returns { skipped: 'no_provider' } so the caller degrades
// gracefully.
//
// Required secret (to actually send): RESEND_API_KEY
// From address: RESEND_FROM_EMAIL (or RESEND_FROM); default "Close Eye <care@closeeye.in>"
// Auto-provided: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function emailHtml(p: { familyName: string; elderName: string; guardianName: string; oneMoment: string; pdfUrl: string }): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a2a25">
    <div style="border-bottom:2px solid #276a4f;padding:16px 0;font-weight:800;font-size:20px;color:#276a4f">close eye</div>
    <h1 style="font-size:20px;margin:20px 0 6px">Namaste ${p.familyName} 🌿</h1>
    <p style="font-size:15px;line-height:1.6">We visited <strong>${p.elderName}</strong> today with ${p.guardianName}. Your detailed Care Report is now ready.</p>
    ${p.oneMoment ? `<p style="font-size:15px;line-height:1.6;font-style:italic;background:#eef5f0;padding:14px 16px;border-radius:12px">"${p.oneMoment}"</p>` : ''}
    <p style="margin:22px 0"><a href="${p.pdfUrl}" style="background:#276a4f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px">Open your Care Report (PDF)</a></p>
    <p style="font-size:13px;color:#7a8480;line-height:1.6">You can also view every report anytime in the Close Eye app. Reply to this email and our team will help.</p>
    <p style="font-size:13px;color:#7a8480;margin-top:24px">With care,<br/>Team Close Eye<br/><em>When you can't be there, Close Eye can.</em></p>
  </div>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) return new Response('Unauthorized', { status: 401, headers: CORS })

  try {
    const { booking_id, pdf_url } = (await req.json()) as { booking_id?: string; pdf_url?: string }
    if (!booking_id || !pdf_url) return json({ error: 'booking_id and pdf_url are required' }, 400)

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) {
      console.error('[send-visit-email] SKIPPED — missing env RESEND_API_KEY')
      return json({ skipped: true, reason: 'no_provider', diagnostics: { hasResendKey: false, missingEnv: ['RESEND_API_KEY'] } })
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const sb = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Verify caller — companion or admin only.
    const callerSb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
    const { data: { user } } = await callerSb.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401, headers: CORS })

    const { data: booking } = await sb
      .from('bookings')
      .select('id, companion_id, loved_one_id, loved_ones(full_name, family_user_id)')
      .eq('id', booking_id)
      .single()
    if (!booking) return json({ error: 'Booking not found' }, 404)

    const { data: callerProfile } = await sb.from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'admin' && booking.companion_id !== user.id) return json({ error: 'Forbidden' }, 403)

    const lo = booking.loved_ones as { full_name?: string; family_user_id?: string } | null
    const familyUserId = lo?.family_user_id
    if (!familyUserId) return json({ skipped: true, reason: 'no_family_user' })

    // Family email (auth.users) + names.
    const [{ data: owner }, { data: comp }, { data: authUser }] = await Promise.all([
      sb.from('profiles').select('full_name').eq('id', familyUserId).single(),
      sb.from('profiles').select('full_name').eq('id', booking.companion_id).single(),
      sb.auth.admin.getUserById(familyUserId),
    ])
    const toEmail = authUser?.user?.email
    if (!toEmail) {
      console.error('[send-visit-email] SKIPPED — no_email for family', familyUserId)
      return json({ skipped: true, reason: 'no_email', diagnostics: { familyUserId, hasEmail: false } })
    }

    const { data: visit } = await sb.from('visits').select('one_moment').eq('booking_id', booking_id).order('created_at', { ascending: false }).limit(1).maybeSingle()

    const html = emailHtml({
      familyName: owner?.full_name || 'there',
      elderName: lo?.full_name || 'your loved one',
      guardianName: comp?.full_name || 'your Guardian',
      oneMoment: visit?.one_moment || '',
      pdfUrl: pdf_url,
    })

    const from = Deno.env.get('RESEND_FROM_EMAIL') || Deno.env.get('RESEND_FROM') || 'Close Eye <care@closeeye.in>'
    // Structured diagnostics — logged server-side + returned for capture.
    const diagnostics: Record<string, unknown> = {
      fn: 'send-visit-email',
      hasResendKey: true,
      fromSource: Deno.env.get('RESEND_FROM_EMAIL') ? 'RESEND_FROM_EMAIL' : Deno.env.get('RESEND_FROM') ? 'RESEND_FROM' : 'default_fallback',
      from,
      to: toEmail,
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [toEmail], subject: `${lo?.full_name || 'Your loved one'}'s Care Report — Close Eye`, html }),
    })
    diagnostics.resendStatus = res.status
    const bodyText = await res.text()
    try { diagnostics.resendBody = JSON.parse(bodyText) } catch { diagnostics.resendBody = bodyText }

    if (!res.ok) {
      // Report the account's domain verification status directly.
      try {
        const dres = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${apiKey}` } })
        if (dres.ok) {
          const dj = (await dres.json()) as { data?: Array<{ name: string; status: string }> }
          diagnostics.domains = (dj.data ?? []).map((d) => ({ name: d.name, status: d.status }))
        } else {
          diagnostics.domainsLookup = `HTTP ${dres.status}`
        }
      } catch (e) {
        diagnostics.domainsLookupError = String(e)
      }
      diagnostics.category =
        res.status === 401 ? 'authentication (RESEND_API_KEY)'
          : res.status === 403 || res.status === 422 ? 'configuration / domain verification'
            : res.status >= 500 ? 'resend outage'
              : 'application'
      console.error('[send-visit-email] FAILED', JSON.stringify(diagnostics))
      return json({ error: 'email_send_failed', diagnostics }, 502)
    }

    console.log('[send-visit-email] SENT', JSON.stringify(diagnostics))
    return json({ success: true, diagnostics })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
