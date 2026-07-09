// Close Eye — shared canonical Visit Report renderers (server-side / Deno).
//
// The Guardian writes ONE canonical report (visits.checklist_data.report). These
// renderers turn that single object into each channel's output — email + WhatsApp —
// so email, WhatsApp, the family web report and the PDF all show the SAME real
// visit content. Never inject placeholder or hardcoded visit text here.
//
// Structure mirrors lib/visit-report-canonical.ts:
//   Summary · Story · Timeline · Activities · Photos · Voice · Wellness ·
//   Health · Recommendations · Follow-ups · AI Summary · Metadata

export interface ReportKV { label: string; value: string }
export interface TimelineItem { time: string; title: string; detail?: string }

export interface CanonicalReport {
  version: number
  summary: string
  story: string
  timeline: TimelineItem[]
  activities: string[]
  photos: string[]
  voice: { path: string; durationSec: number } | null
  wellness: { score: number; label: string; mood: string }
  health: { observations: ReportKV[]; vitals: ReportKV[] }
  recommendations: string[]
  followUps: string[]
  aiSummary: string
  metadata: {
    memberName: string
    guardianName: string
    service: string
    arrival: string
    departure: string
    duration: string
    photoCount: number
    hasVoice: boolean
    social: string[]
    win?: string
    note?: string
  }
}

/** Read the canonical report off a visit row (null if the visit predates it). */
export function readCanonicalReport(visit: { checklist_data?: unknown } | null | undefined): CanonicalReport | null {
  const cd = (visit?.checklist_data ?? {}) as Record<string, unknown>
  const r = cd.report as CanonicalReport | undefined
  return r && typeof r === 'object' && typeof r.metadata?.memberName === 'string' ? r : null
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Branded HTML email — renders the full real report. */
export function renderEmailHtml(r: CanonicalReport, opts: { familyName: string; pdfUrl?: string }): string {
  const m = r.metadata
  const rows = (items: ReportKV[]) =>
    items.map((i) => `<tr><td style="padding:3px 14px 3px 0;color:#7a8480">${esc(i.label)}</td><td style="padding:3px 0;font-weight:600">${esc(i.value)}</td></tr>`).join('')
  const bullets = (items: string[]) => items.map((i) => `<li style="margin:4px 0">${esc(i)}</li>`).join('')
  const timelineRows = (items: TimelineItem[]) =>
    items.map((t) => `<tr><td style="padding:2px 14px 2px 0;color:#7a8480;white-space:nowrap">${esc(t.time)}</td><td style="padding:2px 0">${esc(t.title)}${t.detail ? ` — <strong>${esc(t.detail)}</strong>` : ''}</td></tr>`).join('')
  const section = (title: string, body: string) =>
    body ? `<h2 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#276a4f;margin:22px 0 8px">${esc(title)}</h2>${body}` : ''

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a2a25;padding:8px 6px">
    <div style="border-bottom:2px solid #276a4f;padding:14px 0;font-weight:800;font-size:20px;color:#276a4f">close eye<span style="float:right;font-weight:400;font-size:12px;color:#7a8480;padding-top:8px">Care Report</span></div>
    <h1 style="font-size:20px;margin:18px 0 2px">${esc(m.memberName)}'s wellbeing visit</h1>
    <p style="font-size:13px;color:#7a8480;margin:0 0 4px">${esc(m.service)} · with ${esc(m.guardianName)}</p>
    ${section('The visit', `<p style="font-size:15px;line-height:1.6;margin:0">${esc(r.story)}</p>`)}
    ${section('Wellness summary', `<p style="font-size:15px;font-weight:600;color:#276a4f;margin:0">${esc(r.wellness.label)}${r.wellness.mood ? ` · ${esc(r.wellness.mood)}` : ''}</p>`)}
    ${section('The visit, moment by moment', r.timeline.length ? `<table style="font-size:14px">${timelineRows(r.timeline)}</table>` : '')}
    ${section('Guardian observations', r.health.observations.length ? `<table style="font-size:14px">${rows(r.health.observations)}</table>` : '')}
    ${section('Health readings', r.health.vitals.length ? `<table style="font-size:14px">${rows(r.health.vitals)}</table>` : '')}
    ${section('Moments together', r.activities.length ? `<ul style="font-size:14px;padding-left:20px;margin:0">${bullets(r.activities)}</ul>` : '')}
    ${section('Gentle recommendations', r.recommendations.length ? `<ul style="font-size:14px;padding-left:20px;margin:0">${bullets(r.recommendations)}</ul>` : '')}
    ${section('Suggested follow-ups', r.followUps.length ? `<ul style="font-size:14px;padding-left:20px;margin:0">${bullets(r.followUps)}</ul>` : '')}
    ${m.win ? section('A small win', `<p style="font-size:14px;margin:0">${esc(m.win)}</p>`) : ''}
    ${m.note ? section(`${esc(m.guardianName)}'s note`, `<p style="font-size:14px;font-style:italic;margin:0">"${esc(m.note)}"</p>`) : ''}
    ${m.photoCount || m.hasVoice ? `<p style="font-size:13px;color:#7a8480;margin-top:16px">${m.photoCount ? `📷 ${m.photoCount} photo${m.photoCount === 1 ? '' : 's'}` : ''}${m.photoCount && m.hasVoice ? ' · ' : ''}${m.hasVoice ? '🎙 a voice note' : ''} — in your full report.</p>` : ''}
    ${opts.pdfUrl ? `<p style="margin:22px 0"><a href="${esc(opts.pdfUrl)}" style="background:#276a4f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px">Open the full Care Report (PDF)</a></p>` : ''}
    <p style="font-size:13px;color:#7a8480;margin-top:24px">With care,<br/>Team Close Eye<br/><em>When you can't be there, Close Eye can.</em></p>
  </div>`
}

/** WhatsApp message — the same real report in plain text. */
export function renderWhatsAppMessage(r: CanonicalReport, opts: { familyName: string; nextVisit: string; hasPhoto: boolean }): string {
  const name = r.metadata.memberName
  const lines: string[] = [`Namaste ${opts.familyName} 🌿`, ``, `We visited ${name} today. ${r.story}`, ``]
  const obs = r.health.observations.slice(0, 6)
  if (obs.length) {
    lines.push(`Today's check-in:`)
    for (const o of obs) lines.push(`• ${o.label}: ${o.value}`)
    lines.push(``)
  }
  if (r.health.vitals.length) lines.push(`Readings: ${r.health.vitals.map((v) => `${v.label} ${v.value}`).join(' · ')}`, ``)
  if (r.activities.length) lines.push(`Together: ${r.activities.join(', ')}.`, ``)
  if (r.recommendations.length) lines.push(`Gentle note: ${r.recommendations[0]}`, ``)
  lines.push(`📄 Full report attached.`)
  if (opts.hasPhoto) lines.push(`📷 A photo from today's visit is in the next message.`)
  lines.push(``, `We'll be with ${name} again ${opts.nextVisit}.`, ``, `With care,`, `Team Close Eye`)
  return lines.join('\n')
}
