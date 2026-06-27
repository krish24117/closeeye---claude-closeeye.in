import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  TbArrowLeft, TbArrowRight, TbMapPin, TbCheck, TbPhone, TbPill, TbHeart,
  TbHistory, TbPin, TbPhoneCall, TbCamera, TbNotes, TbSend, TbAlertTriangle, TbLoader2, TbX,
} from 'react-icons/tb'
import { format, differenceInMinutes } from 'date-fns'
import { pdf } from '@react-pdf/renderer'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { getCurrentPosition } from '@/lib/useGeolocation'
import { VisitReportPDF, type VisitPdfData } from '@/lib/visitPdf'
import {
  asArray, continuityEntries, initialsOf, durationLabel,
  type Medication, type EmergencyContact,
} from './_shared'

const MAX_PHOTO_MB = 5

// ── Checklist model ─────────────────────────────────────────────────────────
interface Checks {
  medicines_taken: boolean | null
  had_meal: boolean | null
  home_safe: boolean | null
  home_safety_concern: string
  elder_comfortable: boolean | null
  pain_noted: boolean | null          // reversed logic: YES = there IS pain (a concern)
  pain_details: string
  alert_responsive: boolean | null
  alert_concern: string
}
const EMPTY_CHECKS: Checks = {
  medicines_taken: null, had_meal: null, home_safe: null, home_safety_concern: '',
  elder_comfortable: null, pain_noted: null, pain_details: '',
  alert_responsive: null, alert_concern: '',
}

function anyConcern(c: Checks): boolean {
  return c.medicines_taken === false || c.had_meal === false || c.home_safe === false
    || c.elder_comfortable === false || c.pain_noted === true || c.alert_responsive === false
}

function flagNotes(c: Checks): string {
  const lines: string[] = []
  if (c.medicines_taken === false) lines.push('Medicines not taken today')
  if (c.had_meal === false) lines.push('Had not eaten a meal today')
  if (c.home_safe === false) lines.push(`Home safety concern: ${c.home_safety_concern || 'see notes'}`)
  if (c.elder_comfortable === false) lines.push('Elder seemed uncomfortable / unsettled')
  if (c.pain_noted === true) lines.push(`Pain or discomfort: ${c.pain_details || 'see notes'}`)
  if (c.alert_responsive === false) lines.push(`Alertness concern: ${c.alert_concern || 'see notes'}`)
  return lines.join('\n')
}

// ── Reusable toggle row ─────────────────────────────────────────────────────
function ToggleRow({
  emoji, label, value, onChange, concernWhen,
}: {
  emoji: string; label: string; value: boolean | null
  onChange: (v: boolean) => void
  concernWhen: 'false' | 'true'   // which answer counts as a concern (red)
}) {
  const on = value === true
  const isConcern = (concernWhen === 'false' && value === false) || (concernWhen === 'true' && value === true)
  return (
    <div
      onClick={() => onChange(!on)}
      className={`flex items-center justify-between py-3 px-1 rounded-lg cursor-pointer transition-colors min-h-[48px] ${on ? 'bg-[#0E2A1F]/[0.03]' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[17px]">{emoji}</span>
        <span className={`text-[15px] font-medium ${isConcern ? 'text-[#B91C1C]' : on ? 'text-[#0E2A1F]' : 'text-[#3A3A3C]'}`}>{label}</span>
      </div>
      <button type="button" aria-pressed={on} aria-label={label}
        onClick={(e) => { e.stopPropagation(); onChange(!on) }}
        className={`ce-toggle ${on ? 'is-on' : ''}`} />
    </div>
  )
}

function ConcernNote({ text }: { text: string }) {
  return (
    <div className="mt-1.5 bg-[#FEF2F2] rounded-lg px-3 py-2.5 flex items-center gap-1.5 text-[12px] text-[#B91C1C]">
      <TbAlertTriangle size={13} className="flex-shrink-0" /> {text}
    </div>
  )
}

const concernTextarea = 'w-full mt-2 bg-[#FAF7F2] border border-[#E5E5EA] rounded-lg p-2.5 text-[13px] min-h-[70px] focus:outline-none focus:border-[#0E2A1F] resize-none'

// ── Main ────────────────────────────────────────────────────────────────────
type Phase = 'briefing' | 'checklist' | 'success'

export function CompanionVisit() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [booking, setBooking] = useState<any>(null)
  const [elder, setElder] = useState<any>(null)
  const [previous, setPrevious] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('briefing')

  const gpsBtnRef = useRef<HTMLDivElement>(null)
  const checkInAtRef = useRef<string | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user || !bookingId) return
    setLoading(true); setLoadError(null)
    try {
      const { data: b, error } = await supabase.from('bookings')
        .select('*, loved_ones(*)')
        .eq('id', bookingId)
        .eq('companion_id', user.id)
        .single()
      if (error) throw error
      setBooking(b)
      checkInAtRef.current = b.checked_in_at

      if (b.loved_one_id) {
        const { data: ep } = await supabase.from('elder_profiles')
          .select('*').eq('loved_one_id', b.loved_one_id).maybeSingle()
        setElder(ep || null)
        if (ep?.id) {
          const { data: prev } = await supabase.from('visits')
            .select('id, flags, one_moment, end_time, created_at')
            .eq('elder_id', ep.id)
            .order('created_at', { ascending: false })
            .limit(3)
          setPrevious(prev || [])
        }
      }

      // Resume into the checklist if already checked in (unless we're showing success).
      const persisted = localStorage.getItem(`visit-phase-${bookingId}`)
      if (b.checked_in_at && b.status !== 'completed') {
        setPhase(persisted === 'checklist' || persisted === 'briefing' ? 'checklist' : 'checklist')
      } else {
        setPhase('briefing')
      }
    } catch {
      setLoadError('Could not load this visit — please try again.')
    } finally {
      setLoading(false)
    }
  }, [user, bookingId])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <VisitFrame title="Loading…" onBack={() => navigate('/companion')}>
      <div className="p-4 space-y-3">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-12 rounded-xl" />
      </div>
    </VisitFrame>
  )

  if (loadError) return (
    <VisitFrame title="Visit" onBack={() => navigate('/companion')}>
      <div className="text-center py-20 px-6">
        <p className="text-[#B91C1C] font-semibold mb-2">{loadError}</p>
        <button onClick={load} className="text-sm text-[#0E2A1F] font-semibold underline">Retry</button>
      </div>
    </VisitFrame>
  )

  if (!booking) return (
    <VisitFrame title="Visit" onBack={() => navigate('/companion')}>
      <div className="text-center py-20 px-6">
        <p className="text-[#0E2A1F] font-bold mb-1">Visit not found</p>
        <button onClick={() => navigate('/companion')} className="text-sm text-[#0E2A1F] font-semibold">← Back to Today</button>
      </div>
    </VisitFrame>
  )

  if (phase === 'success') {
    return <SuccessScreen booking={booking} onDone={() => navigate('/companion')} />
  }

  if (phase === 'checklist') {
    return (
      <ChecklistPhase
        booking={booking} elder={elder}
        companionName={profile?.full_name || 'Companion'}
        checkInAt={checkInAtRef.current}
        onBack={() => navigate('/companion')}
        onComplete={() => { localStorage.removeItem(`visit-phase-${bookingId}`); setPhase('success') }}
      />
    )
  }

  return (
    <BriefingPhase
      booking={booking} elder={elder} previous={previous}
      gpsBtnRef={gpsBtnRef}
      onBack={() => navigate('/companion')}
      onCheckedIn={(at) => {
        checkInAtRef.current = at
        localStorage.setItem(`visit-phase-${bookingId}`, 'checklist')
        setPhase('checklist')
      }}
    />
  )
}

// ── Shared frame (own forest top bar; chrome hidden by Layout) ───────────────
function VisitFrame({
  title, onBack, right, timer, progress, children,
}: {
  title: string; onBack: () => void; right?: React.ReactNode
  timer?: string; progress?: number; children: React.ReactNode
}) {
  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-white relative">
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-[#0E2A1F]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="h-14 px-4 flex items-center justify-between">
          <button onClick={onBack} className="p-2 -ml-2 text-white/70" aria-label="Back">
            <TbArrowLeft size={20} />
          </button>
          <p className="text-[14px] font-semibold text-white truncate px-2">{title}</p>
          <div className="min-w-[40px] flex justify-end">{right || (timer ? <span className="text-[12px] font-medium text-white/60 tabular-nums">{timer}</span> : null)}</div>
        </div>
        {progress != null && (
          <div className="h-1 bg-white/15">
            <div className="h-full bg-[#A8D5B5] transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </header>
      <div style={{ paddingTop: `calc(56px + ${progress != null ? '4px' : '0px'} + env(safe-area-inset-top))` }}>
        {children}
      </div>
    </div>
  )
}

// ── Phase A: briefing + GPS check-in ─────────────────────────────────────────
function BriefingPhase({
  booking, elder, previous, gpsBtnRef, onBack, onCheckedIn,
}: {
  booking: any; elder: any; previous: any[]
  gpsBtnRef: React.RefObject<HTMLDivElement>
  onBack: () => void; onCheckedIn: (at: string) => void
}) {
  const lo = booking.loved_ones
  const name = elder?.name || lo?.full_name || 'your loved one'
  const age = elder?.age ?? lo?.age
  const society = elder?.city || lo?.city
  const meds = asArray<Medication>(elder?.current_medications)
  const contacts = asArray<EmergencyContact>(elder?.emergency_contacts)
  const primaryContact = contacts[0] || (lo?.emergency_contact_name ? { name: lo.emergency_contact_name, phone: lo.emergency_contact_phone, relation: '' } : null)
  const conditions = elder?.medical_conditions || lo?.medical_notes
  const entries = continuityEntries(elder?.continuity_notes, 1)
  const prefs = [elder?.food_preferences, elder?.conversation_interests].filter(Boolean).join(', ')

  const [gpsState, setGpsState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [checkInTime, setCheckInTime] = useState<string | null>(null)

  async function handleCheckIn() {
    setGpsState('loading')
    const coords = await getCurrentPosition()
    if (!coords) {
      // GPS optional — still allow check-in, but surface the limitation.
      setGpsState('error')
    }
    const at = new Date().toISOString()
    const { error } = await supabase.from('bookings').update({
      checked_in_at: at,
      check_in_lat: coords?.lat ?? null,
      check_in_lng: coords?.lng ?? null,
      status: 'in_progress',
    }).eq('id', booking.id)
    if (error) { setGpsState('error'); return }
    setCheckInTime(at)
    setGpsState('done')
    window.dispatchEvent(new Event('closeeye:active-booking-changed'))
  }

  const indicators: { emoji: string; label: string; value: string }[] = [
    { emoji: '💊', label: 'Medicines', value: meds.length ? meds.slice(0, 2).map(m => m.name).filter(Boolean).join(', ') : 'None noted' },
    { emoji: '🏥', label: 'Condition', value: conditions || 'None noted' },
    { emoji: '🚨', label: 'Emergency', value: primaryContact ? `${primaryContact.name || '—'}${primaryContact.phone ? ` · ${primaryContact.phone}` : ''}` : 'Not specified' },
    { emoji: '⚕️', label: 'Doctor', value: elder?.doctor_name ? `${elder.doctor_name}${elder.doctor_phone ? ` · ${elder.doctor_phone}` : ''}` : 'Not specified' },
  ]

  return (
    <VisitFrame
      title="Visit briefing" onBack={onBack}
      right={gpsState !== 'done' && (
        <button onClick={() => gpsBtnRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-[#A8D5B5]/20 border border-[#A8D5B5] rounded-xl px-3.5 py-[7px] text-[12px] font-semibold text-[#A8D5B5]">
          Start visit
        </button>
      )}
    >
      {/* Elder profile card */}
      <div className="bg-[#0E2A1F] px-4 pt-5 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-[52px] h-[52px] rounded-full bg-[#A8D5B5]/15 border-2 border-[#A8D5B5] flex items-center justify-center flex-shrink-0">
            <span className="text-[18px] font-bold text-white">{initialsOf(name)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[20px] font-bold text-white truncate">{name}</p>
            <p className="text-[14px] text-[#A8D5B5] mt-0.5">{[age ? `${age} yrs` : null, society].filter(Boolean).join(' · ')}</p>
            {lo?.address && <p className="text-[12px] text-white/55 truncate">{lo.address}</p>}
          </div>
        </div>

        <div className="mt-[18px] grid grid-cols-2 gap-2">
          {indicators.map(ind => (
            <div key={ind.label} className="bg-white/[0.07] border-[0.5px] border-white/[0.12] rounded-[10px] px-3 py-2.5 flex gap-2">
              <span className="text-[16px] leading-none">{ind.emoji}</span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-white/55 uppercase tracking-[0.05em]">{ind.label}</p>
                <p className="text-[13px] font-semibold text-white mt-0.5 leading-[1.4] break-words">{ind.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll content */}
      <div className="px-4 py-5 space-y-4">
        {/* Continuity */}
        <div>
          <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-[0.06em] mb-2 flex items-center gap-1.5">
            <TbHistory size={14} /> From last visit
          </p>
          {entries.length ? (
            <div className="bg-[#F0FDF4] border-l-[3px] border-[#A8D5B5] rounded-r-[10px] px-4 py-3.5 text-[14px] text-[#3A3A3C] leading-[1.65] italic">
              {entries[0]}
            </div>
          ) : (
            <div className="bg-[#0E2A1F]/[0.04] border-l-[3px] border-[#0E2A1F] rounded-r-[10px] px-4 py-3.5 text-[14px] text-[#0E2A1F] leading-[1.65]">
              This is one of your first visits with {name}. Take extra time to introduce yourself and make them feel comfortable.
            </div>
          )}
        </div>

        {/* Pinned note */}
        {elder?.pinned_note && (
          <div>
            <p className="text-[10px] font-semibold text-[#F59E0B] uppercase tracking-[0.06em] mb-2 flex items-center gap-1.5">
              <TbPin size={14} /> Important note
            </p>
            <div className="bg-[#FFFBEB] border-l-[3px] border-[#F59E0B] rounded-r-[10px] px-4 py-3.5 text-[14px] text-[#3A3A3C] leading-[1.65]">
              {elder.pinned_note}
            </div>
          </div>
        )}

        {/* Medicines */}
        {meds.length > 0 && (
          <div className="pt-4 border-t-[0.5px] border-[#E5E5EA]">
            <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-[0.06em] mb-2.5 flex items-center gap-1.5">
              <TbPill size={14} className="text-[#0E2A1F]" /> Medicines to check
            </p>
            {meds.map((m, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2 border-b-[0.5px] border-[#F5F5F5] last:border-0">
                <div className="w-5 h-5 rounded-[5px] border-[1.5px] border-[#E5E5EA] flex-shrink-0" />
                <span className="text-[14px] font-medium text-[#1D1D1F] flex-1">{m.name}{m.dosage ? ` · ${m.dosage}` : ''}</span>
                {m.timing && <span className="text-[12px] text-[#6E6E73]">{m.timing}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Preferences */}
        {(prefs || elder?.things_to_avoid) && (
          <div className="pt-4 border-t-[0.5px] border-[#E5E5EA]">
            <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-[0.06em] mb-2.5 flex items-center gap-1.5">
              <TbHeart size={14} className="text-[#0E2A1F]" /> Elder preferences
            </p>
            <div className="flex flex-wrap gap-2">
              {prefs.split(',').map(p => p.trim()).filter(Boolean).map((p, i) => (
                <span key={i} className="bg-[#FAF7F2] border-[0.5px] border-[#EDE8E0] rounded-full px-3.5 py-1.5 text-[12px] text-[#3A3A3C]">{p}</span>
              ))}
            </div>
            {elder?.things_to_avoid && (
              <div className="mt-2.5">
                <p className="text-[11px] font-semibold text-[#EF4444] mb-1.5">Avoid:</p>
                <div className="flex flex-wrap gap-2">
                  {String(elder.things_to_avoid).split(',').map(p => p.trim()).filter(Boolean).map((p, i) => (
                    <span key={i} className="bg-[#FEF2F2] border-[0.5px] border-[#FECACA] rounded-full px-3.5 py-1.5 text-[12px] text-[#B91C1C]">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emergency */}
        {primaryContact && (
          <div className="pt-4 border-t-[0.5px] border-[#E5E5EA]">
            <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-[0.06em] mb-2.5 flex items-center gap-1.5">
              <TbPhoneCall size={14} className="text-[#EF4444]" /> Emergency contacts
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-[#1D1D1F]">{primaryContact.name}</p>
                {primaryContact.relation && <p className="text-[12px] text-[#6E6E73]">{primaryContact.relation}</p>}
              </div>
              {primaryContact.phone && (
                <a href={`tel:${primaryContact.phone}`}
                  className="bg-[#0E2A1F] text-white rounded-full px-4 py-2 text-[12px] font-semibold flex items-center gap-1.5">
                  <TbPhone size={14} /> Call
                </a>
              )}
            </div>
          </div>
        )}

        {/* Previous visits */}
        {previous.length > 0 && (
          <div className="pt-4 border-t-[0.5px] border-[#E5E5EA]">
            <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-[0.06em] mb-2">Recent visits</p>
            <div className="space-y-2">
              {previous.map(v => (
                <p key={v.id} className="text-[13px] text-[#6E6E73] leading-relaxed">
                  <span className="font-medium text-[#3A3A3C]">{format(new Date(v.end_time || v.created_at), 'dd MMM yyyy')}</span>
                  {v.one_moment ? ` — ${v.one_moment}` : ''}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* GPS check-in */}
        <div ref={gpsBtnRef} className="pt-2">
          {gpsState === 'done' ? (
            <>
              <div className="w-full min-h-[56px] rounded-[16px] border-[1.5px] border-[#A8D5B5] flex items-center justify-center gap-2.5 px-5 py-4">
                <TbCheck size={20} className="text-[#A8D5B5]" />
                <span className="text-[14px] font-semibold text-[#A8D5B5]">
                  Checked in at {checkInTime ? format(new Date(checkInTime), 'h:mm a') : 'now'}
                </span>
              </div>
              <button onClick={() => onCheckedIn(checkInTime || new Date().toISOString())}
                className="mt-3 w-full min-h-[52px] rounded-[16px] bg-[#0E2A1F] text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                Begin visit checklist <TbArrowRight size={17} />
              </button>
            </>
          ) : (
            <>
              <button onClick={handleCheckIn} disabled={gpsState === 'loading'}
                className="w-full min-h-[56px] rounded-[16px] bg-[#0E2A1F] text-white text-[16px] font-bold flex items-center justify-center gap-2.5 shadow-[var(--shadow-btn)] disabled:opacity-80">
                {gpsState === 'loading'
                  ? <><TbLoader2 size={20} className="animate-spin" /> Getting your location…</>
                  : <><TbMapPin size={20} /> I have arrived — Check in</>}
              </button>
              {gpsState === 'error' && (
                <p className="mt-2 text-[12px] text-[#EF4444] text-center">
                  Location couldn't be captured — please enable location in your phone settings. You were still checked in.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </VisitFrame>
  )
}

// ── Phase B: checklist ───────────────────────────────────────────────────────
function ChecklistPhase({
  booking, elder, companionName, checkInAt, onBack, onComplete,
}: {
  booking: any; elder: any; companionName: string; checkInAt: string | null
  onBack: () => void; onComplete: () => void
}) {
  const lo = booking.loved_ones
  const elderName = elder?.name || lo?.full_name || 'Elder'
  const startTime = checkInAt ? new Date(checkInAt) : new Date()

  const [checks, setChecks] = useState<Checks>(EMPTY_CHECKS)
  const [oneMoment, setOneMoment] = useState('')
  const [additional, setAdditional] = useState('')
  const [continuity, setContinuity] = useState('')
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null)
  const [photoErr, setPhotoErr] = useState('')
  const [now, setNow] = useState(Date.now())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const set = <K extends keyof Checks>(k: K, v: Checks[K]) => setChecks(p => ({ ...p, [k]: v }))

  // Timer: MM:SS under 1 h, H:MM:SS at or above 1 h
  const elapsed = Math.max(0, Math.floor((now - startTime.getTime()) / 1000))
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  const timer = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  // Progress: 6 toggles + one moment
  const toggleKeys: (keyof Checks)[] = ['medicines_taken', 'had_meal', 'home_safe', 'elder_comfortable', 'pain_noted', 'alert_responsive']
  const answered = toggleKeys.filter(k => checks[k] !== null).length + (oneMoment.trim() ? 1 : 0)
  const progress = Math.round((answered / 7) * 100)

  const missingRequired =
    (checks.home_safe === false && !checks.home_safety_concern.trim()) ||
    (checks.pain_noted === true && !checks.pain_details.trim()) ||
    (checks.alert_responsive === false && !checks.alert_concern.trim())

  const canSubmit =
    toggleKeys.every(k => checks[k] !== null) && !missingRequired && oneMoment.trim().length >= 20

  function addPhoto(files: FileList) {
    setPhotoErr('')
    const f = files[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { setPhotoErr('Images only.'); return }
    if (f.size > MAX_PHOTO_MB * 1024 * 1024) { setPhotoErr(`Max ${MAX_PHOTO_MB} MB.`); return }
    setPhoto({ file: f, url: URL.createObjectURL(f) })
  }

  async function submit() {
    if (!canSubmit || saving) return
    setSaving(true); setSaveError('')
    try {
      const endIso = new Date().toISOString()
      const concern = anyConcern(checks)
      const flags: 'none' | 'monitor' = concern ? 'monitor' : 'none'
      const notes = flagNotes(checks)
      const moodScore = Math.max(1, 5 - [checks.elder_comfortable, checks.had_meal, checks.medicines_taken, checks.home_safe].filter(v => v === false).length - (checks.pain_noted ? 1 : 0))

      // Photo upload
      const photoPaths: string[] = []
      if (photo) {
        const path = `${booking.id}/visit-${Date.now()}-${photo.file.name}`
        const { error } = await supabase.storage.from('visit-photos').upload(path, photo.file)
        if (!error) photoPaths.push(path)
      }

      // Backward-compatible checklist_data: tier1 keys mirror the legacy flow so
      // family/admin readers keep working; `checks` carries full fidelity.
      const checklist_data = {
        tier1: {
          mood: checks.elder_comfortable, eating: checks.had_meal,
          medicines: checks.medicines_taken, home: checks.home_safe,
          concerns: concern, one_moment: oneMoment.trim(),
        },
        checks,
        additional_notes: additional.trim() || null,
      }

      // WhatsApp body is built by the edge function; we still persist report_text
      // for the history view.
      const reportText = buildReport({ elderName, companionName, startTime, end: new Date(endIso), checks, oneMoment, flags })

      const { data: visRow, error: visErr } = await supabase.from('visits').insert({
        booking_id: booking.id,
        elder_id: elder?.id ?? null,
        companion_id: booking.companion_id,
        start_time: startTime.toISOString(),
        end_time: endIso,
        tier_completed: 1,
        checklist_data,
        flags,
        flag_notes: notes || null,
        one_moment: oneMoment.trim(),
        photo_urls: photoPaths,
        mood_score: moodScore,
        report_text: reportText,
      }).select('id').single()
      if (visErr) throw visErr

      const checkOutGps = await getCurrentPosition()
      await supabase.from('bookings').update({
        checked_out_at: endIso,
        check_out_lat: checkOutGps?.lat ?? null,
        check_out_lng: checkOutGps?.lng ?? null,
        status: 'completed',
        completed_at: endIso,
      }).eq('id', booking.id)

      // Append continuity note for the next companion
      if (continuity.trim() && elder?.id) {
        const datePart = format(new Date(), 'dd MMM yyyy')
        const existing = elder.continuity_notes || ''
        await supabase.from('elder_profiles')
          .update({ continuity_notes: `${existing}\n${datePart} — ${companionName}: ${continuity.trim()}` })
          .eq('id', elder.id)
      }

      // PDF → storage → WhatsApp. All errors propagate to the outer catch
      // so the companion sees them instead of landing on the success screen.
      // report_sent is only stamped true after Twilio confirms delivery.
      let signedPhotos: string[] = []
      if (photoPaths.length) {
        const { data } = await supabase.storage.from('visit-photos').createSignedUrls(photoPaths, 3600)
        signedPhotos = (data || []).map(s => s.signedUrl).filter(Boolean) as string[]
      }
      const pdfData = buildPdf({ checks, oneMoment, additional, companionName, elderName, city: lo?.city || '', checkInAt: checkInAt || startTime.toISOString(), checkOutAt: endIso, checkInLat: booking.check_in_lat, checkInLng: booking.check_in_lng, checkOutLat: checkOutGps?.lat ?? null, checkOutLng: checkOutGps?.lng ?? null, moodScore, flags, photoUrls: signedPhotos })
      const blob = await pdf(<VisitReportPDF data={pdfData} />).toBlob()
      const pdfPath = `${booking.id}/visit-${Date.now()}.pdf`
      const { error: upErr } = await supabase.storage.from('visit-pdfs').upload(pdfPath, blob, { contentType: 'application/pdf', upsert: true })
      if (upErr) throw new Error('Report upload failed — please tap Submit again.')
      if (visRow?.id) {
        await supabase.from('visits').update({ pdf_path: pdfPath }).eq('id', visRow.id)
        const { data: signed } = await supabase.storage.from('visit-pdfs').createSignedUrl(pdfPath, 60 * 60 * 24 * 7)
        if (!signed?.signedUrl) throw new Error('Could not generate report link — please tap Submit again.')
        const { error: waErr } = await supabase.functions.invoke('send-visit-whatsapp', {
          body: { booking_id: booking.id, pdf_url: signed.signedUrl },
        })
        if (waErr) throw new Error('WhatsApp report could not be sent — please tap Submit again.')
        await supabase.from('visits').update({ report_sent: true, report_sent_at: new Date().toISOString() }).eq('id', visRow.id)
      }

      window.dispatchEvent(new Event('closeeye:active-booking-changed'))
      onComplete()
    } catch (e: any) {
      setSaveError(e?.message || 'Could not submit the report — please try again.')
      setSaving(false)
    }
  }

  return (
    <VisitFrame title={elderName} onBack={onBack} timer={timer} progress={progress}>
      <div className="bg-[#F5F5F7] px-4 py-3 pb-36 space-y-3">

        {/* Health checks */}
        <section className="bg-white rounded-[16px] p-4 border-[0.5px] border-[#E5E5EA]">
          <p className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-[0.08em] mb-3.5">Health checks</p>

          <ToggleRow emoji="💊" label="Medicines taken today?" value={checks.medicines_taken} onChange={v => set('medicines_taken', v)} concernWhen="false" />
          {checks.medicines_taken === false && <ConcernNote text="This will be flagged to family" />}

          <ToggleRow emoji="🍽️" label="Had a meal today?" value={checks.had_meal} onChange={v => set('had_meal', v)} concernWhen="false" />
          {checks.had_meal === false && <ConcernNote text="This will be flagged to family" />}

          <ToggleRow emoji="🏠" label="Home appears safe?" value={checks.home_safe} onChange={v => set('home_safe', v)} concernWhen="false" />
          {checks.home_safe === false && (
            <textarea value={checks.home_safety_concern} onChange={e => set('home_safety_concern', e.target.value)}
              placeholder="Describe the safety concern…" className={concernTextarea} />
          )}

          <ToggleRow emoji="😊" label="Elder is comfortable?" value={checks.elder_comfortable} onChange={v => set('elder_comfortable', v)} concernWhen="false" />
          {checks.elder_comfortable === false && <ConcernNote text="This will be flagged to family" />}

          <ToggleRow emoji="🤕" label="Any pain or discomfort?" value={checks.pain_noted} onChange={v => set('pain_noted', v)} concernWhen="true" />
          {checks.pain_noted === true && (
            <textarea value={checks.pain_details} onChange={e => set('pain_details', e.target.value)}
              placeholder="Describe the pain…" className={concernTextarea} />
          )}

          <div className="last:border-0">
            <ToggleRow emoji="🧠" label="Alert and responsive?" value={checks.alert_responsive} onChange={v => set('alert_responsive', v)} concernWhen="false" />
          </div>
          {checks.alert_responsive === false && (
            <textarea value={checks.alert_concern} onChange={e => set('alert_concern', e.target.value)}
              placeholder="Describe your observation…" className={concernTextarea} />
          )}
        </section>

        {/* The one moment */}
        <section className="bg-white rounded-[16px] p-4 border-[0.5px] border-[#E5E5EA]">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-[0.08em]">The one moment</p>
            <span className="bg-[#0E2A1F]/[0.06] rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#0E2A1F]">Required</span>
          </div>
          <p className="text-[12px] text-[#6E6E73] leading-[1.5] mb-3">
            Something they said, a memory, or something that made them smile. This goes directly to the family.
          </p>
          <textarea value={oneMoment} onChange={e => setOneMoment(e.target.value)}
            placeholder="e.g. She showed me a photo from her daughter's wedding and talked about the whole day. Her eyes lit up when she described the music…"
            className="w-full min-h-[110px] bg-[#FAF7F2] border-[1.5px] border-[#A8D5B5] rounded-[12px] p-3.5 text-[15px] text-[#3A3A3C] leading-[1.6] resize-none focus:outline-none focus:border-[#0E2A1F] focus:ring-[3px] focus:ring-[#0E2A1F]/[0.08]" />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-[#6E6E73] italic">Be specific — families treasure these details</span>
            <span className={`text-[11px] ${oneMoment.trim().length >= 20 ? 'text-[#0E2A1F]' : 'text-[#6E6E73]'}`}>{oneMoment.length} characters</span>
          </div>
        </section>

        {/* Photo */}
        <section className="bg-white rounded-[16px] p-4 border-[0.5px] border-[#E5E5EA]">
          <p className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-[0.08em] mb-1 flex items-center gap-2">
            <TbCamera size={16} className="text-[#0E2A1F]" /> Add a photo
          </p>
          <p className="text-[12px] text-[#6E6E73] mb-3">Optional — families love seeing a photo from each visit</p>
          {photo ? (
            <div className="relative w-20 h-20">
              <img src={photo.url} alt="Visit photo preview" className="w-20 h-20 object-cover rounded-[10px] border-2 border-[#A8D5B5]" />
              <button onClick={() => { URL.revokeObjectURL(photo.url); setPhoto(null) }}
                className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-1 shadow-sm" aria-label="Remove photo">
                <TbX size={12} />
              </button>
            </div>
          ) : (
            <label className="relative block bg-[#FAF7F2] border-[1.5px] border-dashed border-[#E5E5EA] rounded-[12px] px-4 py-6 text-center cursor-pointer min-h-[48px]">
              <TbCamera size={28} className="text-[#6E6E73] mx-auto" />
              <p className="text-[13px] font-medium text-[#3A3A3C] mt-2">Take photo or choose from gallery</p>
              <p className="text-[11px] text-[#6E6E73]">JPG or PNG · Max 5MB</p>
              <input type="file" accept="image/*" capture="environment"
                onChange={e => { if (e.target.files?.length) addPhoto(e.target.files); e.target.value = '' }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </label>
          )}
          {photoErr && <p className="text-[12px] text-[#EF4444] mt-2">{photoErr}</p>}
        </section>

        {/* Additional notes */}
        <section className="bg-white rounded-[16px] p-4 border-[0.5px] border-[#E5E5EA]">
          <p className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-[0.08em] mb-1 flex items-center gap-1.5">
            <TbNotes size={14} className="text-[#0E2A1F]" /> Additional notes
          </p>
          <p className="text-[12px] text-[#6E6E73] mb-2.5">Anything else the family or team should know</p>
          <textarea value={additional} onChange={e => setAdditional(e.target.value)}
            placeholder="Any other observations, concerns, or notes…"
            className="w-full h-20 bg-[#FAF7F2] border-[0.5px] border-[#E5E5EA] rounded-[10px] p-3 text-[14px] resize-none focus:outline-none focus:border-[#0E2A1F]" />
        </section>

        {/* Continuity for next visit */}
        <section className="bg-white rounded-[16px] p-4 border-[0.5px] border-[#E5E5EA]">
          <p className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-[0.08em] mb-1 flex items-center gap-1.5">
            <TbHistory size={14} className="text-[#0E2A1F]" /> Note for next companion
          </p>
          <p className="text-[12px] text-[#6E6E73] mb-2.5">What should the next companion know before their visit?</p>
          <textarea value={continuity} onChange={e => setContinuity(e.target.value)}
            placeholder="e.g. She mentioned her knee is hurting more this week. Take extra care with movement…"
            className="w-full h-20 bg-[#FAF7F2] border-[0.5px] border-[#E5E5EA] rounded-[10px] p-3 text-[14px] resize-none focus:outline-none focus:border-[#0E2A1F]" />
        </section>

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex items-center gap-2">
            <TbAlertTriangle size={15} className="flex-shrink-0" /> {saveError}
          </div>
        )}
      </div>

      {/* Submit (fixed) */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7] to-transparent">
        <button onClick={submit} disabled={!canSubmit || saving}
          className={`w-full min-h-[56px] rounded-[16px] text-[16px] font-bold flex items-center justify-center gap-2.5 ${canSubmit && !saving ? 'bg-[#0E2A1F] text-white shadow-[var(--shadow-btn)]' : 'bg-[#0E2A1F]/45 text-white cursor-not-allowed'}`}>
          {saving ? <><TbLoader2 size={18} className="animate-spin" /> Submitting…</> : <>Submit visit report <TbSend size={18} /></>}
        </button>
      </div>
    </VisitFrame>
  )
}

// ── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen({ booking, onDone }: { booking: any; onDone: () => void }) {
  const [summary, setSummary] = useState<{ duration: number | null; flags: string; photos: number; surname: string } | null>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('visits')
        .select('start_time,end_time,flags,photo_urls')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const dur = data?.start_time && data?.end_time
        ? differenceInMinutes(new Date(data.end_time), new Date(data.start_time)) : null
      const surname = (booking.loved_ones?.full_name || '').trim().split(/\s+/).slice(-1)[0] || 'family'
      setSummary({ duration: dur, flags: data?.flags || 'none', photos: (data?.photo_urls || []).length, surname })
    })()
  }, [booking])

  const flagged = summary && summary.flags !== 'none'

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-white flex flex-col items-center text-center px-6 pt-12"
      style={{ paddingTop: 'calc(48px + env(safe-area-inset-top))' }}>
      <svg width="80" height="80" viewBox="0 0 80 80" className="mb-5">
        <circle className="ce-check-circle" cx="40" cy="40" r="36" />
        <path className="ce-check-mark" d="M25 41 L36 52 L56 30" />
      </svg>

      <h1 className="text-[24px] font-bold text-[#1D1D1F]">Visit report submitted!</h1>
      <p className="text-[15px] text-[#6E6E73] mt-1.5">
        WhatsApp report sent to the {summary?.surname || ''} family.
      </p>

      <div className="bg-[#FAF7F2] rounded-[14px] px-5 py-4 mt-6 w-full max-w-[320px]">
        <div className="flex">
          {[
            { v: summary ? durationLabel(summary.duration) : '—', l: 'Duration' },
            { v: '6/6', l: 'Items checked' },
            { v: summary ? String(summary.photos) : '0', l: 'Photos' },
          ].map((s, i, arr) => (
            <div key={s.l} className={`flex-1 ${i < arr.length - 1 ? 'border-r-[0.5px] border-[#EDE8E0]' : ''}`}>
              <p className="text-[16px] font-bold text-[#0E2A1F]">{s.v}</p>
              <p className="text-[11px] text-[#6E6E73] mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {flagged && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[12px] px-4 py-3.5 mt-5 w-full max-w-[320px] text-left">
          <p className="text-[13px] font-bold text-[#EF4444] flex items-center gap-1.5">
            <TbAlertTriangle size={16} /> Admin has been notified
          </p>
          <p className="text-[12px] text-[#991B1B] mt-1">
            A concern was flagged and the Close Eye team will follow up with the family.
          </p>
        </div>
      )}

      <button onClick={onDone}
        className="mt-8 bg-[#0E2A1F] text-white px-10 py-3.5 rounded-[12px] text-[15px] font-semibold shadow-[var(--shadow-btn)]">
        Done
      </button>
    </div>
  )
}

// ── Report + PDF builders ────────────────────────────────────────────────────
function buildReport(p: {
  elderName: string; companionName: string; startTime: Date; end: Date
  checks: Checks; oneMoment: string; flags: 'none' | 'monitor'
}): string {
  const dur = differenceInMinutes(p.end, p.startTime)
  const yn = (v: boolean | null, good: string, bad: string) => v === true ? good : v === false ? bad : '—'
  const lines = [
    `Close Eye Visit Report`,
    ``,
    `${p.elderName} · ${format(p.startTime, 'dd MMM yyyy, h:mm a')}`,
    `Duration: ${dur} minutes`,
    `Companion: ${p.companionName}`,
    ``,
    `How they were today:`,
    `Medicines: ${yn(p.checks.medicines_taken, 'taken', 'missed')}`,
    `Meal: ${yn(p.checks.had_meal, 'had', 'missed')}`,
    `Home: ${yn(p.checks.home_safe, 'safe', 'concern')}`,
    `Comfort: ${yn(p.checks.elder_comfortable, 'comfortable', 'concern')}`,
    ``,
    `Today's moment:`,
    p.oneMoment,
  ]
  if (p.flags !== 'none') lines.push(``, `Note for family: ${flagNotes(p.checks)}`)
  lines.push(``, `Questions? WhatsApp us: +91 9000221261`, `Close Eye 🌿`)
  return lines.join('\n')
}

function buildPdf(a: {
  checks: Checks; oneMoment: string; additional: string; companionName: string
  elderName: string; city: string; checkInAt: string; checkOutAt: string
  checkInLat: number | null; checkInLng: number | null; checkOutLat: number | null; checkOutLng: number | null
  moodScore: number; flags: 'none' | 'monitor'; photoUrls: string[]
}): VisitPdfData {
  const c = a.checks
  return {
    companionName: a.companionName,
    lovedOneName: a.elderName,
    lovedOneCity: a.city,
    checkInAt: a.checkInAt,
    checkOutAt: a.checkOutAt,
    checkInLat: a.checkInLat, checkInLng: a.checkInLng,
    checkOutLat: a.checkOutLat, checkOutLng: a.checkOutLng,
    moodScore: a.moodScore,
    healthScore: c.had_meal === false ? 2 : 5,
    homeSafetyScore: c.home_safe === false ? 2 : 5,
    medicationTaken: c.medicines_taken === true,
    medicationNotes: c.medicines_taken === false ? 'Medicines not taken today.' : '',
    moodNotes: c.elder_comfortable === false ? 'Elder seemed uncomfortable.' : '',
    healthNotes: c.had_meal === false ? 'Had not eaten a meal today.' : '',
    homeSafetyNotes: c.home_safety_concern || '',
    activityDuringVisit: a.oneMoment,
    familyMessage: a.oneMoment,
    followUpNeeded: a.flags !== 'none',
    followUpNotes: [flagNotes(c), a.additional].filter(Boolean).join('\n'),
    photoUrls: a.photoUrls,
    generatedAt: new Date().toISOString(),
  }
}
