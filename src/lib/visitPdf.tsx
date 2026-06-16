import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VisitPdfData {
  companionName: string
  lovedOneName: string
  lovedOneCity: string
  checkInAt: string
  checkOutAt: string
  checkInLat: number | null
  checkInLng: number | null
  checkOutLat: number | null
  checkOutLng: number | null
  moodScore: number
  healthScore: number
  homeSafetyScore: number
  medicationTaken: boolean
  medicationNotes: string
  moodNotes: string
  healthNotes: string
  homeSafetyNotes: string
  activityDuringVisit: string
  familyMessage: string
  followUpNeeded: boolean
  followUpNotes: string
  photoUrls: string[]   // signed / public URLs — fetched before PDF generation
  generatedAt: string
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const green = '#0E2A1F'
const mid   = '#2d6b48'
const muted = '#6b7280'
const bg    = '#f0f9f3'
const amber = '#92400e'
const amberBg = '#fef3c7'

const S = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', padding: 40, fontSize: 9, color: '#111', backgroundColor: '#fff' },

  // Header
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 14, borderBottom: `1px solid #e5e7eb`, marginBottom: 20 },
  brand:      { fontSize: 20, fontFamily: 'Helvetica-Bold', color: green, letterSpacing: -0.3 },
  brandSub:   { fontSize: 8, color: muted, marginTop: 2 },
  reportTitle:{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: green, marginBottom: 3 },
  reportDate: { fontSize: 8, color: muted },

  // Sections
  section:    { marginBottom: 18 },
  sectionHd:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: green, paddingBottom: 5, borderBottom: `1px solid #e5e7eb`, marginBottom: 8 },

  // KV rows
  row:        { flexDirection: 'row', marginBottom: 4 },
  label:      { width: 130, fontSize: 8.5, color: muted },
  value:      { flex: 1, fontSize: 8.5, color: '#111' },

  // Family message callout
  callout:    { backgroundColor: bg, borderLeft: `3px solid ${mid}`, padding: '10 12', borderRadius: 3, marginBottom: 4, fontSize: 9.5, color: green, fontStyle: 'italic', lineHeight: 1.55 },

  // Score pills
  scoreRow:   { flexDirection: 'row', gap: 8, marginBottom: 8 },
  scoreBox:   { flex: 1, backgroundColor: bg, padding: '8 10', borderRadius: 4 },
  scoreLbl:   { fontSize: 7.5, color: muted, marginBottom: 3 },
  scoreVal:   { fontSize: 18, fontFamily: 'Helvetica-Bold', color: green },
  scoreTag:   { fontSize: 7, color: mid },

  // Medication badge
  medYes:     { color: '#15803d', fontFamily: 'Helvetica-Bold' },
  medNo:      { color: '#dc2626', fontFamily: 'Helvetica-Bold' },

  // Follow-up alert
  alert:      { backgroundColor: amberBg, padding: '8 10', borderRadius: 3, marginTop: 4 },
  alertText:  { fontSize: 8.5, color: amber },

  // Photo grid
  photoGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo:      { width: 155, height: 116, borderRadius: 4, objectFit: 'cover' },

  // Footer (absolute)
  footer:     { position: 'absolute', bottom: 24, left: 40, right: 40, borderTop: `1px solid #e5e7eb`, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7.5, color: muted },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short', hour12: true })
  } catch { return iso }
}

function duration(a: string, b: string) {
  try {
    const mins = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000)
    if (mins < 0 || isNaN(mins)) return '—'
    const h = Math.floor(mins / 60), m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m} min`
  } catch { return '—' }
}

function scoreLabel(n: number) {
  return ['', 'Poor', 'Below avg', 'Average', 'Good', 'Excellent'][n] ?? `${n}/5`
}

function gpsUrl(lat: number, lng: number) {
  return `maps.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VisitReportPDF({ data }: { data: VisitPdfData }) {
  const dur = duration(data.checkInAt, data.checkOutAt)
  const hasGps = data.checkInLat != null && data.checkInLng != null

  return (
    <Document
      title={`Close Eye Visit Report — ${data.lovedOneName}`}
      author="Close Eye"
      creator="closeeye.in"
    >
      <Page size="A4" style={S.page}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={S.header} fixed>
          <View>
            <Text style={S.brand}>close eye</Text>
            <Text style={S.brandSub}>closeeye.in · Companion Visit Report</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.reportTitle}>Verified Visit Report</Text>
            <Text style={S.reportDate}>Generated {fmtTime(data.generatedAt)}</Text>
          </View>
        </View>

        {/* ── Summary ────────────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionHd}>Visit Summary</Text>
          <View style={S.row}><Text style={S.label}>Companion</Text><Text style={S.value}>{data.companionName}</Text></View>
          <View style={S.row}><Text style={S.label}>Visited</Text><Text style={S.value}>{data.lovedOneName}{data.lovedOneCity ? ` · ${data.lovedOneCity}` : ''}</Text></View>
          <View style={S.row}><Text style={S.label}>Checked in</Text><Text style={S.value}>{fmtTime(data.checkInAt)}</Text></View>
          <View style={S.row}><Text style={S.label}>Checked out</Text><Text style={S.value}>{fmtTime(data.checkOutAt)}</Text></View>
          <View style={S.row}><Text style={S.label}>Duration</Text><Text style={S.value}>{dur}</Text></View>
          {hasGps && (
            <View style={S.row}>
              <Text style={S.label}>GPS (check-in)</Text>
              <Text style={[S.value, { color: mid }]}>
                {data.checkInLat!.toFixed(5)}°N, {data.checkInLng!.toFixed(5)}°E{'\n'}
                {gpsUrl(data.checkInLat!, data.checkInLng!)}
              </Text>
            </View>
          )}
          {data.checkOutLat != null && data.checkOutLng != null && (
            <View style={S.row}>
              <Text style={S.label}>GPS (check-out)</Text>
              <Text style={[S.value, { color: mid }]}>
                {data.checkOutLat.toFixed(5)}°N, {data.checkOutLng.toFixed(5)}°E
              </Text>
            </View>
          )}
        </View>

        {/* ── Message for the family ─────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionHd}>Message for the Family</Text>
          <Text style={S.callout}>"{data.familyMessage}"</Text>
          <Text style={{ fontSize: 8, color: muted }}>— {data.companionName}, Close Eye Companion</Text>
        </View>

        {/* ── Wellbeing scores ───────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionHd}>Wellbeing Assessment</Text>
          <View style={S.scoreRow}>
            {[
              ['Mood & emotional state', data.moodScore],
              ['Physical health',        data.healthScore],
              ['Home & safety',          data.homeSafetyScore],
            ].map(([name, n]) => (
              <View key={String(name)} style={S.scoreBox}>
                <Text style={S.scoreLbl}>{name}</Text>
                <Text style={S.scoreVal}>{n}/5</Text>
                <Text style={S.scoreTag}>{scoreLabel(Number(n))}</Text>
              </View>
            ))}
          </View>
          {data.moodNotes ? (
            <View style={S.row}><Text style={S.label}>Mood notes</Text><Text style={S.value}>{data.moodNotes}</Text></View>
          ) : null}
          {data.healthNotes ? (
            <View style={S.row}><Text style={S.label}>Health notes</Text><Text style={S.value}>{data.healthNotes}</Text></View>
          ) : null}
          {data.homeSafetyNotes ? (
            <View style={S.row}><Text style={S.label}>Home notes</Text><Text style={S.value}>{data.homeSafetyNotes}</Text></View>
          ) : null}
        </View>

        {/* ── Medication ─────────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionHd}>Medication</Text>
          <View style={S.row}>
            <Text style={S.label}>Medication taken?</Text>
            <Text style={data.medicationTaken ? S.medYes : S.medNo}>
              {data.medicationTaken ? '✓  Yes' : '✗  No'}
            </Text>
          </View>
          {data.medicationNotes ? (
            <View style={S.row}><Text style={S.label}>Notes</Text><Text style={S.value}>{data.medicationNotes}</Text></View>
          ) : null}
        </View>

        {/* ── Activity ───────────────────────────────────────────────── */}
        {data.activityDuringVisit ? (
          <View style={S.section}>
            <Text style={S.sectionHd}>Activity During Visit</Text>
            <Text style={{ fontSize: 9, color: '#374151', lineHeight: 1.5 }}>{data.activityDuringVisit}</Text>
          </View>
        ) : null}

        {/* ── Follow-up ──────────────────────────────────────────────── */}
        {data.followUpNeeded ? (
          <View style={S.section}>
            <Text style={S.sectionHd}>⚠  Follow-up Required</Text>
            <View style={S.alert}>
              <Text style={S.alertText}>
                {data.followUpNotes || 'The companion has flagged this visit as requiring a follow-up. Please contact them for details.'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── Photos ─────────────────────────────────────────────────── */}
        {data.photoUrls.length > 0 ? (
          <View style={S.section}>
            <Text style={S.sectionHd}>Photos from the Visit ({data.photoUrls.length})</Text>
            <View style={S.photoGrid}>
              {data.photoUrls.map((url, i) => (
                <Image key={i} src={{ uri: url, method: 'GET', headers: {}, body: '' }} style={S.photo} />
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Close Eye · hello@closeeye.in · +91 90002 21261</Text>
          <Text style={S.footerText}>Companion-verified · {fmtTime(data.generatedAt)}</Text>
        </View>

      </Page>
    </Document>
  )
}
