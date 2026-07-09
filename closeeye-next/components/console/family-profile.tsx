'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Phone, MessageCircle, CalendarPlus, CalendarClock, UserCog, ShieldAlert, Clock, Sparkles, Camera, Mic,
  HeartPulse, Activity, MessageSquareHeart, FileText, ShieldCheck, History,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { AIStoryCard } from '@/components/family/ai-story-card'
import { VisitStoryTimeline } from '@/components/family/visit-timeline-story'
import { MomentGallery } from '@/components/family/moment-gallery'
import { PhotoGallery } from '@/components/family/photo-gallery'
import { VoicePlayer } from '@/components/family/voice-player'
import { HealthSnapshot } from '@/components/family/health-snapshot'
import { WellnessTrendCard } from '@/components/family/wellness-trend'
import { HealthBadge } from '@/components/console/health-badge'
import { ConsoleConnect } from '@/components/console/console-connect'
import { VisitStatusBadge, VISIT_TYPE } from '@/components/console/visit-status-badge'
import { guardianById, escalationsForFamily, TODAY_VISITS, type ConsoleFamily } from '@/lib/console-data'
import { effectiveVisits } from '@/lib/visit-ops'
import { useVisitOps } from '@/features/console/use-visit-ops'
import { getReport, reportKey, type SharedVisitReport } from '@/lib/visit-reports'
import { listRequests, type FamilyRequest } from '@/lib/family-requests'
import { healthSnapshot, momentItems, timelineEvents, wellnessTrend } from '@/lib/family-report'
import { whatsappLink } from '@/lib/site'

function Section({ icon: Icon, title, children, aside }: { icon: LucideIcon; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-h4"><Icon className="h-5 w-5 text-green" strokeWidth={1.5} /> {title}</h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

const DOCUMENTS = [
  { name: 'Health insurance policy', meta: 'Star Health · PDF' },
  { name: 'Cardiology summary', meta: 'Apollo · Jun 2026' },
  { name: 'Current medication list', meta: 'Updated Jul 2026' },
]

export function ConsoleFamilyProfile({ family }: { family: ConsoleFamily }) {
  const toast = useToast()
  const { ops } = useVisitOps()
  const guardian = guardianById(family.guardianId)
  const escalations = escalationsForFamily(family.id)
  const famVisits = effectiveVisits(TODAY_VISITS.filter((v) => v.familyId === family.id), ops)
  const [report, setReport] = React.useState<SharedVisitReport | null>(null)
  const [requests, setRequests] = React.useState<FamilyRequest[]>([])
  React.useEffect(() => {
    setReport(getReport(reportKey(family.memberName)))
    setRequests(listRequests(family.memberName))
  }, [family.memberName])

  const timeline = report ? timelineEvents(report) : []
  const health = report ? healthSnapshot(report) : []
  const trend = report ? wellnessTrend(report) : []
  const moments = report ? momentItems(report) : []
  const phone = family.phone.replace(/\s/g, '')

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="text" className="self-start">
        <Link href="/console/families"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Families</Link>
      </Button>

      {/* Header */}
      <header className="rounded-lg border border-line bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar initials={family.memberInitials} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h3">{family.memberName}</h1>
              <HealthBadge status={family.status} />
            </div>
            <p className="mt-1 text-body-sm text-muted">{family.familyName} · {family.relationship} · {family.age} · {family.area}</p>
            <p className="mt-0.5 text-caption text-muted">{family.reason}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button asChild size="sm"><a href={`tel:${phone}`}><Phone className="h-4 w-4" strokeWidth={1.75} /> Call</a></Button>
          <Button asChild variant="secondary" size="sm"><a href={whatsappLink(`Hi, a quick note about ${family.memberName}.`)}><MessageCircle className="h-4 w-4" strokeWidth={1.75} /> WhatsApp</a></Button>
          <Button variant="secondary" size="sm" onClick={() => toast(`Visit scheduling opened for ${family.memberName.split(' ')[0]}.`)}><CalendarPlus className="h-4 w-4" strokeWidth={1.75} /> Schedule visit</Button>
          <Button variant="secondary" size="sm" onClick={() => toast('Guardian assignment opened.')}><UserCog className="h-4 w-4" strokeWidth={1.75} /> Assign guardian</Button>
          <Button variant="secondary" size="sm" onClick={() => toast('Escalation raised to Operations.')} className="text-error"><ShieldAlert className="h-4 w-4" strokeWidth={1.75} /> Escalate</Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ConsoleConnect family={family} />
          {report ? (
            <>
              <AIStoryCard report={report} />
              <Section icon={Clock} title="The visit, moment by moment"><VisitStoryTimeline events={timeline} /></Section>
              {moments.length > 0 && <Section icon={Sparkles} title="Moments together"><MomentGallery items={moments} /></Section>}
              {report.photos.length > 0 && <Section icon={Camera} title="Photos"><PhotoGallery photos={report.photos} /></Section>}
              {report.voice && <Section icon={Mic} title="Voice note"><VoicePlayer src={report.voice.dataUrl} durationSec={report.voice.durationSec} label={`From ${report.guardianName}`} /></Section>}
              {health.length > 0 && <Section icon={HeartPulse} title="Health snapshot"><HealthSnapshot cards={health} /></Section>}
              {trend.length > 0 && <Section icon={Activity} title="Wellness this week"><WellnessTrendCard rows={trend} /></Section>}
            </>
          ) : (
            <Section icon={History} title="Latest visit">
              <p className="text-body text-muted">Last visit: <span className="font-medium text-ink">{family.lastVisitLabel}</span>. The next completed visit&apos;s AI story, timeline, photos and health snapshot will appear here automatically.</p>
            </Section>
          )}

          <Section icon={History} title="Visit history">
            <ol className="flex flex-col">
              {report && (
                <li className="flex items-center gap-3 border-b border-line py-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/12 text-success"><Sparkles className="h-4 w-4" strokeWidth={1.75} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-body-sm font-medium text-ink">Story generated · photos & report shared</span><span className="block text-caption text-muted">{new Date(report.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{report.vitals.bp ? ` · BP ${report.vitals.bp} added` : ''}</span></span>
                </li>
              )}
              {famVisits.map((v, i) => {
                const type = VISIT_TYPE[v.visitType]
                return (
                  <li key={v.id} className={`flex items-center gap-3 py-3 ${i < famVisits.length - 1 ? 'border-b border-line' : ''}`}>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${type.chip}`}><type.icon className="h-4 w-4" strokeWidth={1.75} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body-sm font-medium text-ink">{type.label} visit · {v.timeLabel}</span>
                      <span className="block text-caption text-muted">{v.cancelReason ? `Cancelled · ${v.cancelReason}` : v.rescheduledTo ? `Moved to ${v.rescheduledTo}` : `${guardianById(v.guardianId)?.name}`}</span>
                    </span>
                    <VisitStatusBadge status={v.status} />
                  </li>
                )
              })}
              {famVisits.length === 0 && !report && <li className="py-3 text-body-sm text-muted">No visits recorded yet — history appears here as visits happen.</li>}
            </ol>
          </Section>

          {escalations.length > 0 && (
            <Section icon={ShieldAlert} title="Escalations">
              <ul className="flex flex-col gap-3">
                {escalations.map((e) => (
                  <li key={e.id} className="rounded-md border border-line bg-ivory p-3.5">
                    <p className="text-body-sm font-semibold text-ink">{e.issue}</p>
                    <p className="mt-1 text-caption text-muted">{e.recommendedAction}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <Section icon={CalendarClock} title="Next Presence">
            <p className="text-body-sm font-semibold text-ink">{family.nextVisitLabel}</p>
            <p className="mt-0.5 text-caption text-muted">{guardian ? `${guardian.name} · in person` : 'Guardian to be assigned'}</p>
            <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => toast(`Reschedule opened for ${family.memberName.split(' ')[0]}.`)}>Reschedule</Button>
          </Section>

          {guardian && (
            <Section icon={ShieldCheck} title="Guardian">
              <div className="flex items-center gap-3">
                <Avatar initials={guardian.initials} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink">{guardian.name}</p>
                  <p className="truncate text-caption text-muted">{guardian.availabilityLabel} · ★ {guardian.rating}</p>
                </div>
              </div>
              <Button asChild variant="secondary" size="sm" className="mt-3 w-full"><a href={`tel:${guardian.phone.replace(/\s/g, '')}`}><Phone className="h-4 w-4" strokeWidth={1.75} /> Call {guardian.name.split(' ')[0]}</a></Button>
            </Section>
          )}

          <Section icon={MessageSquareHeart} title="Family requests" aside={<span className="text-caption text-muted">{requests.length}</span>}>
            {requests.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {requests.map((r) => (
                  <li key={r.id} className="flex items-start gap-2 text-body-sm text-ink">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green" /> {r.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-muted">No open requests — the family will add any before the next visit.</p>
            )}
          </Section>

          <Section icon={FileText} title="Documents">
            <ul className="flex flex-col gap-2">
              {DOCUMENTS.map((d) => (
                <li key={d.name} className="flex items-center gap-2.5 rounded-md border border-line bg-ivory px-3 py-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-green" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-medium text-ink">{d.name}</span><span className="block truncate text-caption text-muted">{d.meta}</span></span>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={Phone} title="Emergency contacts">
            <ul className="flex flex-col gap-2 text-body-sm">
              <li className="flex items-center justify-between gap-2"><span>Family line</span><a href={`tel:${phone}`} className="font-semibold text-green hover:underline">{family.phone}</a></li>
              <li className="flex items-center justify-between gap-2"><span>Guardian · {guardian?.name.split(' ')[0]}</span><a href={`tel:${guardian?.phone.replace(/\s/g, '')}`} className="font-semibold text-green hover:underline">{guardian?.phone}</a></li>
              <li className="flex items-center justify-between gap-2"><span>Ambulance</span><a href="tel:108" className="font-semibold text-green hover:underline">108</a></li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  )
}
