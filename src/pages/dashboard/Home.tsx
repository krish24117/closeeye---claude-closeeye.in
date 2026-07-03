import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, ChevronRight, MessageCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { isOnboardingDismissed } from '@/pages/Onboarding'
import { getPersona, getPersonaCopy } from '@/lib/persona'
import { formatIsoTime } from '@/lib/formatTime'

// ── Helpers ────────────────────────────────────────────────────────────────

function initials(name?: string | null) {
  return (name || 'CE').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
function istTime(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

function CardSkeleton({ h = 180 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h, margin: '16px', borderRadius: 20 }} />
}

// ── Constants ──────────────────────────────────────────────────────────────

const MUTED  = 'var(--muted)'
const LINE   = 'var(--line)'
const CREAM2 = 'var(--cream-2)'
const CLAY   = 'var(--clay)'

const SEC: React.CSSProperties = {
  fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.12em',
  color: MUTED, fontWeight: 700, margin: '18px 0 9px',
}

const SERVICE_LABELS: Record<string, string> = {
  wellbeing_visit:          'Wellbeing visit',
  doctor_visit:             'Doctor visit',
  grocery_errand:           'Grocery errand',
  pharmacy_run:             'Pharmacy run',
  emergency_support_visit:  'Emergency visit',
}

// ── NRI types ──────────────────────────────────────────────────────────────

interface VisitRow {
  id: string; start_time: string | null; end_time: string | null; created_at: string
  flags: string; flag_notes: string | null; one_moment: string | null; mood_score: number | null
  checklist_data: Record<string, unknown> | null; photo_urls: string[]; pdf_path: string | null
}

interface LovedOneRow { id: string; full_name: string; city: string | null; relationship: string | null }
interface NextBookingRow { scheduled_at: string; service_type: string | null }
interface ActiveReqRow  { id: string; service_name: string; status: string }

// ── NRI home ───────────────────────────────────────────────────────────────

function NriHome() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [loading,      setLoading]      = useState(true)
  const [lovedOne,     setLovedOne]     = useState<LovedOneRow | null>(null)
  const [visit,        setVisit]        = useState<VisitRow | null>(null)
  const [visitPhoto,   setVisitPhoto]   = useState<string | null>(null)
  const [nextBooking,  setNextBooking]  = useState<NextBookingRow | null>(null)
  const [activeReq,    setActiveReq]    = useState<ActiveReqRow | null>(null)
  const [visitCount,   setVisitCount]   = useState(0)

  useEffect(() => {
    if (!user) return
    let alive = true
    ;(async () => {
      try {
      // Phase 1 — parallel: loved one + next booking + active request + completed count
      const [loRes, bkRes, arRes, cntRes] = await Promise.all([
        supabase.from('loved_ones')
          .select('id, full_name, city, relationship')
          .eq('family_user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1).maybeSingle(),
        supabase.from('bookings')
          .select('scheduled_at, service_type')
          .eq('family_user_id', user.id)
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(1).maybeSingle(),
        supabase.from('booking_requests')
          .select('id, service_name, status')
          .eq('user_id', user.id)
          .not('status', 'in', '("cancelled")')
          .order('created_at', { ascending: false })
          .limit(1).maybeSingle(),
        supabase.from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('family_user_id', user.id)
          .eq('status', 'completed'),
      ])
      if (!alive) return

      const lo = loRes.data as LovedOneRow | null
      setLovedOne(lo)
      if (bkRes.data) setNextBooking(bkRes.data as NextBookingRow)
      if (arRes.data) setActiveReq(arRes.data as ActiveReqRow)
      setVisitCount((cntRes as any).count ?? 0)

      // Phase 2 — visit report (needs elder_id, so sequential after phase 1)
      if (lo?.id) {
        const { data: ep } = await supabase
          .from('elder_profiles').select('id').eq('loved_one_id', lo.id).maybeSingle()
        if (alive && ep?.id) {
          const { data: v } = await supabase
            .from('visits')
            .select('id,start_time,end_time,created_at,flags,flag_notes,one_moment,mood_score,checklist_data,photo_urls,pdf_path')
            .eq('elder_id', ep.id)
            .order('created_at', { ascending: false }).limit(1).maybeSingle()
          if (alive && v) {
            setVisit(v as VisitRow)
            if ((v as VisitRow).photo_urls?.length) {
              const { data: s } = await supabase.storage
                .from('visit-photos').createSignedUrl((v as VisitRow).photo_urls[0], 3600)
              if (alive && s?.signedUrl) setVisitPhoto(s.signedUrl)
            }
          }
        }
      }

      if (alive) setLoading(false)
      } catch {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [user])

  if (loading) return <><CardSkeleton h={200} /><CardSkeleton h={140} /></>

  // Derived state
  const state: 'A' | 'B' | 'C' = !visit ? 'B'
    : (visit.flags && visit.flags !== 'none' ? 'C' : 'A')

  const firstName  = profile?.full_name?.split(' ')[0] || 'there'
  const isFounder  = !!profile?.is_founding_member
  const rel        = lovedOne?.relationship?.toLowerCase() || 'loved one'
  const relTitle   = lovedOne?.relationship || 'Parent'
  const elderName  = lovedOne?.full_name   || 'your loved one'
  const elderCity  = lovedOne?.city        || ''

  const persona = getPersona(profile?.country, elderCity)
  const pcopy   = getPersonaCopy(persona, { parentName: elderName, parentCity: elderCity, userCity: profile?.country ?? undefined })

  const showSetupCard = !profile?.whatsapp_number && isOnboardingDismissed()

  const nextDate    = nextBooking?.scheduled_at ? new Date(nextBooking.scheduled_at) : null
  const nextDay     = nextDate?.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric' })
  const nextMon     = nextDate?.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' })?.toUpperCase()
  const nextTime    = nextBooking?.scheduled_at ? formatIsoTime(nextBooking.scheduled_at) : null
  const nextShort   = nextDate?.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })
  const nextLabel   = (nextBooking?.service_type && SERVICE_LABELS[nextBooking.service_type]) || 'Upcoming visit'

  const statusCopy: Record<string, string> = {
    requested:           'Request received — confirming a companion',
    needs_details:       'Missing info needed',
    confirmed:           'Confirmed',
    companion_confirmed: 'Companion confirmed',
    paid:                'Visit confirmed ✓',
  }

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 24 }}>

      {/* ── Forest greeting header ─────────────────────────────── */}
      <div style={{ background: 'var(--forest)', color: 'var(--cream)', padding: '14px 18px 28px' }}>
        {showSetupCard ? (
          <div>
            <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Welcome, {firstName}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 14, lineHeight: 1.5 }}>
              Finish setting up your parent's care — takes under 2 minutes.
            </p>
            <Link to="/onboarding" style={{ display: 'inline-block', background: 'var(--sage)', color: 'var(--forest)', borderRadius: 100, padding: '10px 22px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Continue setup →
            </Link>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>Hello, {firstName}</p>
            {isFounder && (
              <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', background: 'rgba(168,213,181,.16)', border: '1px solid rgba(168,213,181,.3)', color: 'var(--sage)', padding: '3px 10px', borderRadius: 999 }}>
                ★ Founding Member{profile?.founding_number ? ` #${String(profile.founding_number).padStart(4, '0')}` : ''}
              </span>
            )}
          </>
        )}
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* ── Status card — floats over header ──────────────────── */}
        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: 16, marginTop: -12, boxShadow: '0 10px 26px rgba(14,42,31,.08)', position: 'relative', zIndex: 2 }}>

          {/* State A — completed visit, no flags */}
          {state === 'A' && visit && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--forest)' }}>How is your {rel}?</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>Last visit · {istTime(visit.start_time || visit.created_at)}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#2c6b43', background: '#eaf5ee', border: '1px solid #cfe6d7', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 8 }}>
                  Doing well
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 13 }}>
                <div style={{ flexShrink: 0, width: 74, height: 74, borderRadius: 12, background: 'linear-gradient(135deg,#cfe6d7,#a8d5b5)', overflow: 'hidden', display: 'grid', placeItems: 'center', color: '#2c6b43', fontSize: 11, fontWeight: 700 }}>
                  {visitPhoto
                    ? <img src={visitPhoto} alt="Visit" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span>📷</span>
                  }
                </div>
                <p style={{ fontSize: 12.5, color: '#243831', lineHeight: 1.45, flex: 1, margin: 0 }}>
                  {visit.one_moment ? `"${visit.one_moment}"` : (visit.flag_notes || 'All looked well during this visit.')}
                </p>
              </div>
              <Link to="/dashboard/reports" style={{ display: 'block', textAlign: 'center', marginTop: 13, background: 'var(--cream)', border: `1px solid ${LINE}`, borderRadius: 11, padding: 11, fontSize: 13, fontWeight: 700, color: 'var(--forest)', textDecoration: 'none' }}>
                View full report →
              </Link>
            </>
          )}

          {/* State B — no visit yet */}
          {state === 'B' && (
            <>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--forest)' }}>
                {nextBooking ? 'Visit arranged — report will appear here after' : "First visit isn't scheduled yet"}
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
                {nextBooking
                  ? `${nextLabel} · ${nextDate?.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' })}`
                  : (isFounder
                    ? "Your place is locked in — book the first visit whenever you're ready"
                    : pcopy.emptyStateSub)}
              </div>
              {!nextBooking && (
                <Link to="/dashboard/book" style={{ display: 'block', textAlign: 'center', marginTop: 13, background: 'var(--forest)', borderRadius: 11, padding: 11, fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
                  Book the first visit →
                </Link>
              )}
            </>
          )}

          {/* State C — flagged visit */}
          {state === 'C' && visit && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--forest)' }}>How is your {rel}?</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>Last visit · {istTime(visit.start_time || visit.created_at)}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#c0392b', background: '#fdecea', border: '1px solid #f5c6c2', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 8 }}>
                  Needs attention
                </span>
              </div>
              <div style={{ background: 'rgba(255,165,0,.10)', border: '1px solid rgba(255,165,0,.30)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#b45309', marginTop: 12 }}>
                {visit.flag_notes || 'Your companion flagged something. We will reach out shortly.'}
              </div>
              <Link to="/dashboard/reports" style={{ display: 'block', textAlign: 'center', marginTop: 13, background: 'var(--cream)', border: `1px solid ${LINE}`, borderRadius: 11, padding: 11, fontSize: 13, fontWeight: 700, color: 'var(--forest)', textDecoration: 'none' }}>
                View full report →
              </Link>
            </>
          )}
        </div>

        {/* ── Next visit ─────────────────────────────────────────── */}
        <p style={SEC}>Next visit</p>
        {nextBooking && nextDate ? (
          <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: '14px 15px', display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 11, background: 'var(--forest)', color: 'var(--cream)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>{nextDay}</div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{nextMon}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--forest)' }}>{nextLabel}{nextTime ? ` · ${nextTime} IST` : ''}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Your companion will be there — a full report follows.</div>
            </div>
            <Link to="/dashboard/bookings" style={{ color: MUTED, fontSize: 20, textDecoration: 'none', flexShrink: 0 }}>›</Link>
          </div>
        ) : (
          <Link to="/dashboard/book" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1.5px dashed ${LINE}`, borderRadius: 14, padding: '14px 15px', textDecoration: 'none', color: 'var(--forest)' }}>
            <Calendar size={18} />
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>Schedule a visit →</span>
          </Link>
        )}

        {/* ── Ask Close Eye ──────────────────────────────────────── */}
        <p style={SEC}>Ask Close Eye</p>
        <div style={{ background: 'linear-gradient(120deg,#eef6f0,#e4f0e8)', border: '1px solid #cfe6d7', borderRadius: 14, padding: '14px 15px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7, color: 'var(--forest)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 1l2.4 7.2L22 11l-7.6 2.4L12 21l-2.4-7.6L2 11l7.6-2.8L12 1z" fill="url(#askgrad)" />
              <defs><linearGradient id="askgrad" x1="2" y1="1" x2="22" y2="21"><stop stopColor="#A8D5B5" /><stop offset="1" stopColor="#7FBF94" /></linearGradient></defs>
            </svg>
            Ask about your {rel}
          </div>
          <div style={{ fontSize: 12, color: '#3a5a47', marginTop: 4 }}>
            {pcopy.askShortcutSub || `Personalised to their visits and history. Backed by our care team.`}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
            <input
              readOnly
              aria-label="Ask about your parent"
              placeholder={`e.g. Is their BP reading okay?`}
              onFocus={() => navigate('/dashboard/ask')}
              style={{ flex: 1, fontFamily: 'inherit', fontSize: 13, padding: '10px 12px', border: '1px solid #cfe6d7', borderRadius: 11, background: '#fff', color: 'var(--forest)', outline: 'none', cursor: 'text' }}
            />
            <Link to="/dashboard/ask" style={{ background: 'var(--forest)', color: 'var(--cream)', border: 'none', borderRadius: 11, padding: '0 15px', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
              Ask
            </Link>
          </div>
        </div>

        {/* ── Quick actions 2×2 ─────────────────────────────────── */}
        <p style={SEC}>Quick actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Book a service — forest bg */}
          <Link to="/dashboard/book" className="ce-press" style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 13, padding: 14, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(168,213,181,.18)', display: 'grid', placeItems: 'center', fontSize: 15 }}>＋</span>
            <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>Book a service</span>
            <span style={{ fontSize: 11, color: 'rgba(200,213,203,0.9)' }}>Visit, doctor, errands</span>
          </Link>
          {/* Request a call */}
          <a href="https://wa.me/919000221261?text=Hi%2C+I%27d+like+to+request+a+wellbeing+call" target="_blank" rel="noopener noreferrer" className="ce-press" style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: 14, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 7, color: 'var(--forest)' }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: CREAM2, display: 'grid', placeItems: 'center', fontSize: 15 }}>📞</span>
            <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>Request a call</span>
            <span style={{ fontSize: 11, color: MUTED }}>Weekly wellbeing call</span>
          </a>
          {/* Parent's profile */}
          <Link to="/dashboard/profile" className="ce-press" style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: 14, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 7, color: 'var(--forest)' }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: CREAM2, display: 'grid', placeItems: 'center', fontSize: 15 }}>👤</span>
            <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{relTitle}'s profile</span>
            <span style={{ fontSize: 11, color: MUTED }}>Health &amp; details</span>
          </Link>
          {/* Get help now — clay left border, always tel: link */}
          <a href="tel:+919000221261" className="ce-press" style={{ background: '#fff', border: `1px solid ${LINE}`, borderLeft: `3px solid ${CLAY}`, borderRadius: 13, padding: 14, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 7, color: 'var(--forest)' }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: CREAM2, display: 'grid', placeItems: 'center', fontSize: 15 }}>⚠️</span>
            <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, color: CLAY }}>Get help now</span>
            <span style={{ fontSize: 11, color: MUTED }}>Emergency response</span>
          </a>
        </div>

        {/* ── Membership mini-cards (founders) ──────────────────── */}
        {isFounder && (
          <>
            <p style={SEC}>Your membership</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: 13 }}>
                <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, fontWeight: 700 }}>Plan</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--forest)', marginTop: 5 }}>Founding</div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>On-demand · Joined for ₹100</div>
              </div>
              <div style={{ flex: 1, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: 13 }}>
                <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, fontWeight: 700 }}>Visits</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--forest)', marginTop: 5 }}>
                  {visitCount > 0 ? `${visitCount} done` : 'First one soon'}
                </div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>
                  {nextShort ? `Next: ${nextShort}` : 'Book your first'}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── How it works (state B, non-founders) ──────────────── */}
        {state === 'B' && !nextBooking && !isFounder && (
          <div style={{ marginTop: 18, background: '#fff', borderRadius: 16, padding: '18px 20px', border: `1px solid ${LINE}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.08em', margin: '0 0 14px', textTransform: 'uppercase' }}>HOW IT WORKS</p>
            {[
              { n: '1', t: 'Join as a Founding Member', d: '₹100 one-time — locks your place and activates health support' },
              { n: '2', t: 'We visit and check on them',  d: 'A verified companion visits your parent in person' },
              { n: '3', t: 'You get a WhatsApp report',   d: 'Health, mood, medicines — sent within the hour' },
            ].map(({ n, t, d }, i) => (
              <div key={n} style={{ display: 'flex', gap: 14, marginBottom: i < 2 ? 14 : 0 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--forest)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', margin: 0 }}>{t}</p>
                  <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>{d}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Active booking status line ─────────────────────────── */}
        {activeReq && (
          <Link to="/dashboard/bookings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: '12px 14px', textDecoration: 'none' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: MUTED, margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activeReq.service_name}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest)', margin: 0 }}>
                {statusCopy[activeReq.status] || 'Being processed'}
              </p>
            </div>
            <ChevronRight size={16} color="var(--forest)" style={{ flexShrink: 0 }} />
          </Link>
        )}

      </div>
    </div>
  )
}

/* ================================================================== */
/*  SOCIETY MEMBER HOME (unchanged)                                    */
/* ================================================================== */

function SocietyHome() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<{ name: string; society_name: string | null } | null>(null)
  const [recent, setRecent] = useState<{ id: string; question: string; answer: string | null; ai_answer: string | null; status: string; created_at: string }[]>([])
  const [tip, setTip] = useState<string>('')

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      const { data: m } = await supabase.from('society_members').select('name, society_name').eq('user_id', user.id).maybeSingle()
      if (active) setMember(m)

      const { data: q } = await supabase.from('member_queries').select('id,question,answer,ai_answer,status,created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
      if (active && q) setRecent(q)

      const { data: tips } = await supabase.from('health_tips').select('tip').eq('day_index', new Date().getDay())
      if (active) setTip(tips?.[0]?.tip || 'Small daily habits — water, a short walk, a phone call home — protect health more than any single big effort.')

      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [user])

  const name = member?.name || profile?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) return <><CardSkeleton h={170} /><CardSkeleton h={200} /></>

  const FOREST_GRADIENT = { background: 'linear-gradient(135deg, var(--forest) 0%, var(--forest-mid) 100%)' }

  return (
    <div className="ce-slide-up">
      <section style={{ margin: 16, borderRadius: 20, padding: 24, ...FOREST_GRADIENT }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>{greeting}, {name} 🌿</p>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--sage)', margin: '4px 0 0' }}>Your Close Eye Family Shield</p>
        <span style={{ display: 'inline-block', marginTop: 16, background: 'rgba(168,213,181,0.15)', border: '1px solid rgba(168,213,181,0.3)', borderRadius: 100, padding: '8px 18px', fontSize: 12, fontWeight: 600, color: 'var(--sage)' }}>
          Founding Member{member?.society_name ? ` · ${member.society_name}` : ''}
        </span>
      </section>

      <Link to="/dashboard/ask" className="ce-press" style={{ display: 'block', margin: '0 16px', background: '#fff', borderRadius: 'var(--radius-card)', padding: 20, boxShadow: 'var(--shadow-card)', textDecoration: 'none' }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--black)', margin: '0 0 12px' }}>What health question can we answer for you today?</p>
        <div style={{ background: 'var(--cream)', border: '1px solid var(--gray-light)', borderRadius: 12, padding: '14px 16px', fontSize: 15, color: 'var(--gray-mid)' }}>
          e.g. My child has had a fever for 2 days…
        </div>
        <span className="ce-btn ce-btn-primary ce-btn-full" style={{ marginTop: 12, padding: 14, fontSize: 16 }}>Ask Close Eye →</span>
      </Link>

      {recent.length > 0 && (
        <div style={{ margin: '12px 16px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-mid)', letterSpacing: '0.08em', margin: '0 0 8px' }}>RECENT QUESTIONS</p>
          {recent.map(q => (
            <Link key={q.id} to="/dashboard/ask" style={{ display: 'block', background: '#fff', borderRadius: 'var(--radius-card)', padding: 16, boxShadow: 'var(--shadow-card)', marginBottom: 10, textDecoration: 'none' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question}</p>
              <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: '4px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {q.answer || q.ai_answer || (q.status === 'pending' ? 'Our care team is reviewing…' : '')}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div style={{ margin: '12px 16px 0' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-mid)', letterSpacing: '0.08em', margin: '0 0 8px' }}>BOOK A SERVICE</p>
        <div className="ce-noscroll" style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
          {[['🏠', 'Home Visit', '₹1,000'], ['👨‍⚕️', 'Doctor Support', '₹1,500'], ['🚨', 'Emergency', '₹3,000'], ['🛒', 'Grocery', '₹500']].map(([e, n, p]) => (
            <Link key={n} to="/dashboard/book" className="ce-press" style={{ minWidth: 140, flexShrink: 0, background: '#fff', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow-card)', textDecoration: 'none' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{e}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>{n}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--forest)', marginTop: 4 }}>{p}</div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ margin: '12px 16px 0', background: 'var(--cream-dark)', borderRadius: 'var(--radius-card)', padding: '18px 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-mid)', letterSpacing: '0.08em', margin: '0 0 8px' }}>TODAY'S HEALTH TIP</p>
        <p style={{ fontSize: 14, color: 'var(--gray-dark)', lineHeight: 1.6, margin: 0 }}>{tip}</p>
      </div>

      <section style={{ margin: '12px 16px 24px', borderRadius: 20, padding: 24, ...FOREST_GRADIENT }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Have elderly parents at home?</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '6px 0 0' }}>Add Close Eye companion visits to your family plan.</p>
        <p style={{ fontSize: 13, color: 'var(--sage)', margin: '8px 0 0' }}>₹1,500/month — 1 visit + weekly calls + WhatsApp reports.</p>
        <Link to="/dashboard/book" className="ce-btn ce-btn-white ce-btn-full" style={{ marginTop: 18, padding: 14 }}>Add Elder Care →</Link>
      </section>
    </div>
  )
}

/* ================================================================== */

export function DashboardHome() {
  const { profile } = useAuth()
  return profile?.user_type === 'nri' ? <NriHome /> : <SocietyHome />
}
