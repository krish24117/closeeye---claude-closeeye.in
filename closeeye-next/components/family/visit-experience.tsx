'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  LogIn, LogOut, ClipboardCheck, Clock, Sparkles, Camera, Mic, HeartPulse, Activity,
  MessageSquareText, Pill, Lightbulb, Quote, MessageCircle, FileText, ImageDown, HeartPulse as HeartIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { MedBadge } from '@/components/family/badges'
import { CapturedPhotos, CapturedVoice } from '@/components/family/captured-media'
import { AIStoryCard } from '@/components/family/ai-story-card'
import { VisitStoryTimeline } from '@/components/family/visit-timeline-story'
import { MomentGallery } from '@/components/family/moment-gallery'
import { HealthSnapshot } from '@/components/family/health-snapshot'
import { WellnessTrendCard } from '@/components/family/wellness-trend'
import { VoicePlayer } from '@/components/family/voice-player'
import { PhotoGallery } from '@/components/family/photo-gallery'
import { DownloadButton } from '@/components/family/download-button'
import { Button } from '@/components/ui/button'
import { PRESENCE_MANAGER, type Visit } from '@/lib/family-data'
import { brandedDocument } from '@/lib/download'
import { getReport, reportKey, type SharedVisitReport } from '@/lib/visit-reports'
import { healthSnapshot, momentItems, timelineEvents, wellnessTrend } from '@/lib/family-report'

function FamilySection({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-card p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-h4">
        <Icon className="h-5 w-5 text-green" strokeWidth={1.5} /> {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export interface VisitStats { arrival: string; departure: string; durationLabel: string }

function StatCards({ stats }: { stats: VisitStats }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { icon: LogIn, label: 'Arrived', value: stats.arrival },
        { icon: LogOut, label: 'Left', value: stats.departure },
        { icon: ClipboardCheck, label: 'Duration', value: stats.durationLabel },
      ].map((t) => {
        const Icon = t.icon
        return (
          <div key={t.label} className="flex flex-col items-start gap-2 rounded-md border border-line bg-card p-4 shadow-sm">
            <Icon className="h-5 w-5 text-green" strokeWidth={1.5} />
            <span className="text-caption text-muted">{t.label}</span>
            <span className="text-body font-semibold text-ink">{t.value ?? '—'}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Download documents (from the real report) ───────────────────────────── */

function reportDoc(r: SharedVisitReport): string {
  const vit = Object.entries(r.vitals).filter(([, v]) => v)
  return brandedDocument(`Visit report — ${r.memberName}`, `
    <h1>Wellbeing visit report</h1>
    <p class="meta">${r.memberName} · ${r.service} · with ${r.guardianName}</p>
    <div class="card"><p>${r.story}</p></div>
    ${vit.length ? `<div class="card"><h2>Readings</h2>${vit.map(([k, v]) => `<div class="row"><span class="label">${k}</span><span>${v}</span></div>`).join('')}</div>` : ''}
    ${r.note ? `<div class="card"><h2>Guardian's note</h2><p><em>"${r.note}"</em> — ${r.guardianName}</p></div>` : ''}
  `)
}
function photoPackageDoc(r: SharedVisitReport): string {
  return brandedDocument(`Photos — ${r.memberName}`, `
    <h1>Photos from the visit</h1>
    <p class="meta">${r.memberName} · with ${r.guardianName}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${r.photos.map((p) => `<img src="${p.thumb}" style="width:100%;border-radius:12px" />`).join('')}
    </div>`)
}
function healthDoc(r: SharedVisitReport): string {
  const vit = Object.entries(r.vitals).filter(([, v]) => v)
  return brandedDocument(`Health summary — ${r.memberName}`, `
    <h1>Health summary</h1>
    <p class="meta">${r.memberName} · with ${r.guardianName}</p>
    <div class="card">${vit.length ? vit.map(([k, v]) => `<div class="row"><span class="label">${k}</span><span>${v}</span></div>`).join('') : '<p>No readings this visit.</p>'}</div>`)
}

/* ── The experience: rich when a report exists, else the existing report body ── */

export function VisitExperience({ visit }: { visit: Visit }) {
  const [report, setReport] = React.useState<SharedVisitReport | null>(null)
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    setReport(getReport(reportKey(visit.memberName)))
    setReady(true)
  }, [visit.memberName])

  // Until we've read localStorage, render the static body (matches SSR — no flash).
  if (!ready || !report) return <StaticBody visit={visit} />

  return (
    <VisitReportExperience
      report={report}
      stats={{ arrival: visit.arrival ?? '—', departure: visit.departure ?? '—', durationLabel: visit.durationLabel ?? '—' }}
      recommendations={visit.recommendations}
      followUps={visit.followUp ? [visit.followUp] : undefined}
      pmReview={visit.pmReview ?? null}
    />
  )
}

/**
 * The complete Human Presence Experience, rendered from a SharedVisitReport —
 * the approved family report. Fed by real Supabase data (see fetchFullVisitReport)
 * or the localStorage report; the components and layout are identical.
 */
export function VisitReportExperience({
  report,
  stats,
  recommendations,
  followUps,
  pmReview = null,
}: {
  report: SharedVisitReport
  stats: VisitStats
  recommendations?: string[]
  followUps?: string[]
  pmReview?: string | null
}) {
  const timeline = timelineEvents(report)
  const health = healthSnapshot(report)
  const trend = wellnessTrend(report)
  const moments = momentItems(report)
  const slug = report.key.replace(/\s+/g, '-') || 'visit'
  const completedLabel = (() => {
    try {
      return new Date(report.completedAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    } catch {
      return ''
    }
  })()

  return (
    <div className="flex flex-col gap-6">
      <AIStoryCard report={report} />

      <StatCards stats={stats} />

      <FamilySection icon={Clock} title="The visit, moment by moment">
        <VisitStoryTimeline events={timeline} />
      </FamilySection>

      {moments.length > 0 && (
        <FamilySection icon={Sparkles} title="Moments together">
          <MomentGallery items={moments} />
        </FamilySection>
      )}

      {report.photos.length > 0 && (
        <FamilySection icon={Camera} title="Photos from the visit">
          <PhotoGallery photos={report.photos} />
          <p className="mt-3 text-caption text-muted">Shared with your family&apos;s permission.</p>
        </FamilySection>
      )}

      {report.voice && (
        <FamilySection icon={Mic} title="A voice note for you">
          <VoicePlayer src={report.voice.dataUrl} durationSec={report.voice.durationSec} label={`From ${report.guardianName}`} />
        </FamilySection>
      )}

      {health.length > 0 && (
        <FamilySection icon={HeartPulse} title="Health snapshot">
          <HealthSnapshot cards={health} />
        </FamilySection>
      )}

      {trend.length > 0 && (
        <FamilySection icon={Activity} title="Wellness this week">
          <WellnessTrendCard rows={trend} />
        </FamilySection>
      )}

      {recommendations && recommendations.length > 0 && (
        <FamilySection icon={Lightbulb} title="Gentle recommendations">
          <ul className="flex flex-col gap-2.5">
            {recommendations.map((r) => (
              <li key={r} className="flex gap-2.5 text-body-sm text-ink">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green" /> {r}
              </li>
            ))}
          </ul>
        </FamilySection>
      )}

      {followUps && followUps.length > 0 && (
        <FamilySection icon={ClipboardCheck} title="Suggested follow-ups">
          <ul className="flex flex-col gap-2.5">
            {followUps.map((f) => (
              <li key={f} className="flex gap-2.5 text-body-sm text-ink">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" /> {f}
              </li>
            ))}
          </ul>
        </FamilySection>
      )}

      {report.win && (
        <div className="flex items-start gap-3 rounded-lg border border-green/20 bg-accent-soft/40 p-5">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-green" strokeWidth={1.5} />
          <div>
            <p className="text-body-sm font-semibold text-ink">A small win today</p>
            <p className="text-body-sm text-muted">{report.win}</p>
          </div>
        </div>
      )}

      {report.note && (
        <FamilySection icon={Quote} title={`${report.guardianName}'s note`}>
          <p className="text-body italic text-ink">“{report.note}”</p>
        </FamilySection>
      )}

      {pmReview && (
        <div className="flex gap-4 rounded-lg border border-line bg-ink p-6 text-white shadow-sm">
          <Avatar initials={PRESENCE_MANAGER.initials} size="md" tone="solid" className="ring-2 ring-white/20" />
          <div>
            <p className="text-caption font-semibold uppercase tracking-widest text-accent">Presence Manager review</p>
            <p className="mt-1.5 text-body text-white/90">{pmReview}</p>
          </div>
        </div>
      )}

      {/* Downloads */}
      <FamilySection icon={FileText} title="Download & keep">
        <div className="flex flex-wrap gap-2.5">
          <DownloadButton label="Visit report" filename={`close-eye-report-${slug}.html`} content={reportDoc(report)} />
          {report.photos.length > 0 && (
            <DownloadButton variant="secondary" icon={ImageDown} label="Photo package" filename={`close-eye-photos-${slug}.html`} content={photoPackageDoc(report)} />
          )}
          {health.length > 0 && (
            <DownloadButton variant="secondary" icon={HeartIcon} label="Health summary" filename={`close-eye-health-${slug}.html`} content={healthDoc(report)} />
          )}
        </div>
      </FamilySection>

      {completedLabel && <p className="text-center text-caption text-muted">Report shared after the visit on {completedLabel}.</p>}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button asChild variant="secondary" size="sm">
          <Link href="/family/messages"><MessageCircle className="h-4 w-4" strokeWidth={1.5} /> Ask about this visit</Link>
        </Button>
      </div>
    </div>
  )
}

/* ── Static fallback — the existing report body, unchanged ────────────────── */

function staticReportDoc(v: Visit): string {
  const row = (l: string, val?: string) => `<div class="row"><span class="label">${l}</span><span>${val ?? '—'}</span></div>`
  const list = (items?: string[]) => (items?.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '—')
  const wellbeing = v.wellbeing?.map((w) => row(w.label, w.value)).join('') ?? ''
  return brandedDocument(`Visit report — ${v.memberName}`, `
    <h1>Wellbeing visit report</h1>
    <p class="meta">${v.memberName} · ${v.serviceName} · ${v.dateLabel} · ${v.timeLabel} · with ${v.guardianName}</p>
    <div class="card">${row('Arrived', v.arrival)}${row('Left', v.departure)}${row('Duration', v.durationLabel)}${row('Mood', v.mood)}${row('Medication', v.medication)}</div>
    ${v.conversation ? `<div class="card"><h2>What we talked about</h2><p>${v.conversation}</p></div>` : ''}
    ${wellbeing ? `<div class="card"><h2>Wellbeing observations</h2>${wellbeing}</div>` : ''}
    ${v.recommendations ? `<div class="card"><h2>Gentle recommendations</h2>${list(v.recommendations)}</div>` : ''}
    ${v.guardianNotes ? `<div class="card"><h2>Guardian's note</h2><p><em>"${v.guardianNotes}"</em> — ${v.guardianName}</p></div>` : ''}
    ${v.pmReview ? `<div class="card"><h2>Presence Manager review</h2><p>${v.pmReview}</p></div>` : ''}
    ${v.followUp ? `<div class="card"><h2>Follow-up planned</h2><p><strong>${v.followUp}</strong></p></div>` : ''}
  `)
}

function StaticBody({ visit }: { visit: Visit }) {
  return (
    <div className="flex flex-col gap-6">
      <StatCards stats={{ arrival: visit.arrival ?? '—', departure: visit.departure ?? '—', durationLabel: visit.durationLabel ?? '—' }} />

      {visit.photoCount ? (
        <FamilySection icon={ClipboardCheck} title="Photos from the visit">
          <CapturedPhotos memberName={visit.memberName} fallbackCount={visit.photoCount} />
          <p className="mt-3 text-caption text-muted">Shared with your family&apos;s permission.</p>
        </FamilySection>
      ) : null}

      {visit.hasVoiceNote && (
        <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
          <CapturedVoice memberName={visit.memberName} guardianName={visit.guardianName} />
        </div>
      )}

      {visit.conversation && (
        <FamilySection icon={MessageSquareText} title="What they talked about">
          <p className="text-body text-ink">{visit.conversation}</p>
        </FamilySection>
      )}

      {visit.wellbeing && (
        <FamilySection icon={HeartPulse} title="Wellbeing observations">
          <dl className="grid gap-4 sm:grid-cols-2">
            {visit.wellbeing.map((w) => (
              <div key={w.label} className="rounded-md bg-accent-soft/40 p-4">
                <dt className="text-caption text-muted">{w.label}</dt>
                <dd className="mt-0.5 text-body-sm font-medium text-ink">{w.value}</dd>
              </div>
            ))}
          </dl>
        </FamilySection>
      )}

      {visit.medication && (
        <FamilySection icon={Pill} title="Medication">
          <div className="flex items-center gap-3">
            <MedBadge state={visit.medication} />
            <span className="text-body-sm text-muted">
              {visit.medication === 'Completed' ? 'Taken as scheduled during the visit.' : visit.medication === 'Pending' ? 'To be followed up.' : 'No medication was due today.'}
            </span>
          </div>
        </FamilySection>
      )}

      {visit.recommendations && (
        <FamilySection icon={Lightbulb} title="Gentle recommendations">
          <ul className="flex flex-col gap-2.5">
            {visit.recommendations.map((r) => (
              <li key={r} className="flex gap-2.5 text-body-sm text-ink">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green" /> {r}
              </li>
            ))}
          </ul>
        </FamilySection>
      )}

      {visit.guardianNotes && (
        <FamilySection icon={Quote} title={`${visit.guardianName}'s note`}>
          <p className="text-body italic text-ink">“{visit.guardianNotes}”</p>
        </FamilySection>
      )}

      {visit.pmReview && (
        <div className="flex gap-4 rounded-lg border border-line bg-ink p-6 text-white shadow-sm">
          <Avatar initials={PRESENCE_MANAGER.initials} size="md" tone="solid" className="ring-2 ring-white/20" />
          <div>
            <p className="text-caption font-semibold uppercase tracking-widest text-accent">Presence Manager review</p>
            <p className="mt-1.5 text-body text-white/90">{visit.pmReview}</p>
          </div>
        </div>
      )}

      {visit.followUp && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/[0.06] p-5">
          <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" strokeWidth={1.5} />
          <div>
            <p className="text-body-sm font-semibold text-ink">Follow-up planned</p>
            <p className="text-body-sm text-muted">{visit.followUp}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <DownloadButton label="Download report" filename={`close-eye-report-${visit.id}.html`} content={staticReportDoc(visit)} />
        <Button asChild variant="secondary" size="sm"><Link href="/family/messages"><MessageCircle className="h-4 w-4" strokeWidth={1.5} /> Ask about this visit</Link></Button>
      </div>
    </div>
  )
}
