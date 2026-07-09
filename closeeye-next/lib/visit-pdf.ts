/**
 * Branded Close Eye "Care Report" PDF — generated client-side with jsPDF.
 * Used by the family app (Download PDF) and the guardian completion flow
 * (generate + upload for WhatsApp delivery). Text-based, no external assets.
 */
import type { jsPDF } from 'jspdf'
import { ALL_SCALES, MOMENTS } from '@/lib/cloza'
import { wellnessLabel } from '@/lib/family-report'
import type { SharedVisitReport } from '@/lib/visit-reports'

export interface VisitPdfInput {
  memberName: string
  guardianName: string
  service: string
  dateLabel: string
  arrival: string
  departure: string
  durationLabel: string
  wellnessLabel: string
  mood?: string
  story: string
  observations: { label: string; value: string }[]
  vitals: { label: string; value: string }[]
  moments: string[]
  recommendations: string[]
  followUps: string[]
  note?: string
  win?: string
}

type RGB = [number, number, number]
const INK: RGB = [26, 42, 37]
const GREEN: RGB = [39, 106, 79]
const MUTED: RGB = [122, 132, 128]

const VITAL_META: Record<string, { label: string; unit: string }> = {
  bp: { label: 'Blood pressure', unit: 'mmHg' },
  pulse: { label: 'Pulse', unit: 'bpm' },
  temp: { label: 'Temperature', unit: '°F' },
  sugar: { label: 'Blood sugar', unit: 'mg/dL' },
  weight: { label: 'Weight', unit: 'kg' },
}

/** Map the family report (+ derived extras) into the PDF's flat input. */
export function reportToPdfInput(
  report: SharedVisitReport,
  stats: { arrival: string; departure: string; durationLabel: string },
  recommendations: string[],
  followUps: string[],
): VisitPdfInput {
  const dateLabel = (() => {
    try {
      return new Date(report.completedAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return ''
    }
  })()
  const observations = ALL_SCALES.filter((s) => report.scales[s.key]).map((s) => ({ label: s.label, value: report.scales[s.key]! }))
  const vitals = Object.entries(report.vitals)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => ({ label: VITAL_META[k]?.label ?? k, value: `${v}${VITAL_META[k]?.unit ? ` ${VITAL_META[k].unit}` : ''}` }))
  const moments = MOMENTS.filter((m) => report.moments.includes(m.key)).map((m) => `${m.emoji} ${m.label}`)

  return {
    memberName: report.memberName,
    guardianName: report.guardianName,
    service: report.service,
    dateLabel,
    arrival: stats.arrival,
    departure: stats.departure,
    durationLabel: stats.durationLabel,
    wellnessLabel: wellnessLabel(report.wellnessScore),
    mood: report.mood,
    story: report.story || report.summary || 'Visit completed.',
    observations,
    vitals,
    moments,
    recommendations,
    followUps,
    note: report.note,
    win: report.win,
  }
}

/** Build the branded PDF document (call .save(name) or .output('blob')). */
export async function buildVisitPdf(input: VisitPdfInput): Promise<jsPDF> {
  const { jsPDF: JsPDF } = await import('jspdf')
  const doc = new JsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 48
  const CW = W - M * 2
  let y = M

  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2])
  const draw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2])
  const ensure = (h: number) => { if (y + h > H - M) { doc.addPage(); y = M } }

  const para = (text: string, size = 11, color: RGB = INK, gap = 8, style: 'normal' | 'bold' | 'italic' = 'normal') => {
    if (!text) return
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    ink(color)
    for (const ln of doc.splitTextToSize(text, CW) as string[]) {
      ensure(size * 1.45)
      doc.text(ln, M, y)
      y += size * 1.45
    }
    y += gap
  }
  const heading = (text: string) => {
    ensure(30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    ink(GREEN)
    doc.text(text.toUpperCase(), M, y)
    y += 7
    draw(GREEN)
    doc.setLineWidth(1)
    doc.line(M, y, M + 26, y)
    y += 15
  }
  const rows = (items: { label: string; value: string }[]) => {
    doc.setFontSize(11)
    for (const it of items) {
      ensure(17)
      doc.setFont('helvetica', 'normal'); ink(MUTED); doc.text(it.label, M, y)
      doc.setFont('helvetica', 'bold'); ink(INK)
      for (const ln of doc.splitTextToSize(it.value, CW - 170) as string[]) { doc.text(ln, M + 170, y); y += 15 }
      y += 2
    }
    y += 8
  }
  const bullets = (items: string[]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
    for (const it of items) {
      const lines = doc.splitTextToSize(it, CW - 16) as string[]
      lines.forEach((ln, i) => {
        ensure(16)
        if (i === 0) { ink(GREEN); doc.text('•', M, y) }
        ink(INK); doc.text(ln, M + 16, y); y += 16
      })
    }
    y += 8
  }

  // Masthead
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); ink(GREEN); doc.text('close eye', M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); ink(MUTED); doc.text('Care Report', W - M, y, { align: 'right' })
  y += 12
  draw(GREEN); doc.setLineWidth(1.2); doc.line(M, y, W - M, y); y += 24

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); ink(INK)
  doc.text(`${input.memberName}'s wellbeing visit`, M, y); y += 18
  para(`${input.service} · with ${input.guardianName} · ${input.dateLabel}`, 10, MUTED, 16)

  heading('The visit')
  para(input.story, 11, INK, 14)

  heading('Wellness summary')
  para(`${input.wellnessLabel}${input.mood ? ` · ${input.mood}` : ''}`, 12, GREEN, 14, 'bold')

  heading('Visit details')
  rows([{ label: 'Arrived', value: input.arrival }, { label: 'Left', value: input.departure }, { label: 'Duration', value: input.durationLabel }])

  if (input.observations.length) { heading('Guardian observations'); rows(input.observations) }
  if (input.vitals.length) { heading('Health readings'); rows(input.vitals) }
  if (input.moments.length) { heading('Moments together'); bullets(input.moments) }
  if (input.recommendations.length) { heading('Gentle recommendations'); bullets(input.recommendations) }
  if (input.followUps.length) { heading('Suggested follow-ups'); bullets(input.followUps) }
  if (input.win) { heading('A small win'); para(input.win) }
  if (input.note) { heading(`${input.guardianName}'s note`); para(`"${input.note}"`, 11, INK, 10, 'italic') }

  // Footer on every page
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); ink(MUTED)
    doc.text("When you can't be there, Close Eye can.", M, H - 24)
    doc.text(`${p} / ${pages}`, W - M, H - 24, { align: 'right' })
  }

  return doc
}
