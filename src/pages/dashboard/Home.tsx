import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ChevronRight, MessageCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { isOnboardingDismissed } from '@/pages/Onboarding'

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function initials(name?: string | null) {
  return (name || 'CE').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
function istTime(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}
function istDate(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' })
}
function durationMin(start?: string | null, end?: string | null) {
  if (!start || !end) return null
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000))
}

const FOREST_GRADIENT = { background: 'linear-gradient(135deg, #0E2A1F 0%, #1B4332 100%)' }

function CardSkeleton({ h = 180 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h, margin: '16px', borderRadius: 20 }} />
}

/* ================================================================== */
/*  NRI FAMILY HOME                                                    */
/* ================================================================== */

interface VisitRow {
  id: string; start_time: string | null; end_time: string | null; created_at: string
  flags: string; flag_notes: string | null; one_moment: string | null; mood_score: number | null
  checklist_data: Record<string, unknown> | null
}

function NriHome() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [elderName, setElderName] = useState<string>('')
  const [visit, setVisit] = useState<VisitRow | null>(null)
  const [nextBooking, setNextBooking] = useState<{ scheduled_at: string } | null>(null)
  const [activeRequest, setActiveRequest] = useState<{ id: string; service_name: string; status: string } | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      const { data: lo } = await supabase
        .from('loved_ones').select('id, full_name').eq('family_user_id', user.id)
        .order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (!active) return
      setElderName(lo?.full_name || 'Your loved one')

      if (lo?.id) {
        const { data: ep } = await supabase
          .from('elder_profiles').select('id').eq('loved_one_id', lo.id).maybeSingle()
        if (ep?.id) {
          const { data: v } = await supabase
            .from('visits').select('id,start_time,end_time,created_at,flags,flag_notes,one_moment,mood_score,checklist_data')
            .eq('elder_id', ep.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
          if (active && v) setVisit(v as VisitRow)
        }
      }

      const { data: bk } = await supabase
        .from('bookings').select('scheduled_at')
        .eq('family_user_id', user.id).gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true }).limit(1).maybeSingle()
      if (active && bk) setNextBooking(bk)

      const { data: ar } = await supabase
        .from('booking_requests')
        .select('id, service_name, status')
        .eq('user_id', user.id)
        .not('status', 'in', '("cancelled")')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (active && ar) setActiveRequest(ar)

      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [user])

  if (loading) return <><CardSkeleton h={230} /><CardSkeleton h={120} /></>

  const state: 'A' | 'B' | 'C' = !visit ? 'B' : visit.flags && visit.flags !== 'none' ? 'C' : 'A'
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const visitMins = durationMin(visit?.start_time, visit?.end_time)
  const moodGood = (visit?.mood_score ?? 4) >= 4

  // Show resume card if onboarding was dismissed mid-way (no whatsapp yet = Step 1 never finished)
  const showSetupCard = !profile?.whatsapp_number && isOnboardingDismissed()

  return (
    <div className="ce-slide-up">
      {/* ── Welcome + setup resume card ───────────────────────── */}
      {showSetupCard && (
        <div style={{
          margin: '16px 16px 0',
          background: 'linear-gradient(135deg, #0E2A1F 0%, #1B4332 100%)',
          borderRadius: 20, padding: '20px 20px 16px',
        }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
            Welcome, {firstName} 🌿
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Finish setting up your parent's care — takes under 2 minutes.
          </p>
          <Link
            to="/onboarding"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--sage)', color: 'var(--forest)',
              borderRadius: 100, padding: '12px 22px',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
              minHeight: 44,
            }}
          >
            Continue setup <ChevronRight size={16} />
          </Link>
        </div>
      )}

      {/* ── Wellbeing status card ─────────────────────────────── */}
      <section style={{ margin: 16, borderRadius: 20, overflow: 'hidden' }}>
        <div style={{
          padding: 24,
          ...(state === 'A' ? FOREST_GRADIENT
            : state === 'B' ? { background: 'linear-gradient(135deg, #1a3a28 0%, #0E2A1F 100%)' }
            : { background: 'linear-gradient(135deg, #3d2000 0%, #2a1500 100%)' }),
        }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{elderName}</span>
            <span style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(168,213,181,0.20)', border: '2px solid var(--sage)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: 'var(--sage)',
            }}>{initials(elderName)}</span>
          </div>

          <div style={{ textAlign: 'center', margin: '16px 0' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 100,
              background: state === 'A' ? 'rgba(168,213,181,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${state === 'A' ? 'rgba(168,213,181,0.4)' : 'rgba(255,255,255,0.15)'}`,
            }}>
              {state === 'A' && <span className="ce-pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />}
              {state === 'C' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />}
              <span style={{ fontSize: 16, fontWeight: 600, color: state === 'A' ? '#fff' : state === 'B' ? 'var(--sage)' : '#FFA500' }}>
                {state === 'A' ? 'All well today' : state === 'B' ? (nextBooking ? 'Visit being arranged' : `Welcome, ${firstName}`) : 'Needs your attention'}
              </span>
            </span>
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
            {state === 'A' && `Visited ${istTime(visit?.start_time || visit?.created_at)}${visitMins ? ` · ${visitMins} min` : ''}`}
            {state === 'B' && (nextBooking ? `We'll confirm the time for ${elderName}'s visit shortly` : `Let's arrange ${elderName}'s first visit`)}
            {state === 'C' && `Noticed ${istTime(visit?.created_at)}`}
          </p>

          {state === 'B' && !nextBooking && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <Link to="/dashboard/book" style={{ display: 'inline-block', background: 'var(--sage)', color: 'var(--forest)', borderRadius: 100, padding: '12px 28px', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
                Book the first visit →
              </Link>
            </div>
          )}

          {state === 'A' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
              {[
                ['😊', 'Mood', moodGood ? 'Good' : 'Okay'],
                ['🍽️', 'Eating', 'Normal'],
                ['💊', 'Medicines', 'Taken'],
                ['🏠', 'Home', 'Safe'],
              ].map(([emoji, label, value]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{emoji}</span>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {state === 'C' && (
            <>
              <div style={{ background: 'rgba(255,165,0,0.10)', border: '1px solid rgba(255,165,0,0.30)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#FFA500', marginTop: 12 }}>
                {visit?.flag_notes || 'Your companion flagged something from the last visit. We will reach out.'}
              </div>
              <a href="https://wa.me/919000221261?text=Hi%2C%20I%20saw%20a%20flag%20on%20my%20dashboard" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', border: '1px solid #FFA500', color: '#FFA500', borderRadius: 'var(--radius-btn)', padding: '10px 20px', fontSize: 14, fontWeight: 600, marginTop: 12, textDecoration: 'none' }}>
                Call us about this →
              </a>
            </>
          )}
        </div>
      </section>

      {/* ── Quick actions ─────────────────────────────────────── */}
      <div className="ce-noscroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px', marginTop: 12 }}>
        {[
          { label: '📋 View Report', to: '/dashboard/reports' },
          { label: '📅 Book Visit', to: '/dashboard/book' },
          { label: '💬 Ask Health', to: '/dashboard/ask' },
        ].map(p => (
          <Link key={p.label} to={p.to} className="ce-press" style={{ background: '#fff', border: '1px solid var(--gray-light)', borderRadius: 100, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: 'var(--forest)', boxShadow: 'var(--shadow-card)', whiteSpace: 'nowrap', flexShrink: 0, textDecoration: 'none' }}>{p.label}</Link>
        ))}
        <a href="https://wa.me/919000221261" target="_blank" rel="noopener noreferrer" className="ce-press" style={{ background: '#fff', border: '1px solid var(--gray-light)', borderRadius: 100, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: 'var(--forest)', boxShadow: 'var(--shadow-card)', whiteSpace: 'nowrap', flexShrink: 0, textDecoration: 'none' }}>📞 Call Us</a>
      </div>

      {/* ── Active booking status line ────────────────────────── */}
      {activeRequest && (() => {
        const statusCopy: Record<string, string> = {
          requested:           'Request received — confirming a companion',
          needs_details:       'Missing info needed',
          confirmed:           'Confirmed',
          companion_confirmed: 'Companion confirmed — pay to confirm visit',
          paid:                'Visit confirmed ✓',
        }
        const copy = statusCopy[activeRequest.status] || activeRequest.status.replace(/_/g, ' ')
        return (
          <Link
            to="/dashboard/bookings"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              margin: '12px 16px 0', background: '#fff',
              border: '1px solid var(--gray-light)', borderRadius: 14, padding: '12px 14px',
              textDecoration: 'none', boxShadow: 'var(--shadow-card)',
            }}
          >
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-mid)', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeRequest.service_name}
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest)', margin: 0 }}>{copy}</p>
            </div>
            <ChevronRight size={16} color="var(--forest)" style={{ flexShrink: 0 }} />
          </Link>
        )
      })()}

      {/* ── How it works / What's next strip ────────────────── */}
      {state === 'B' && !nextBooking && (() => {
        const isMember = !!profile?.is_founding_member
        const steps = isMember
          ? [
              { done: true,  label: '✓', title: `Founding Member${profile?.founding_number ? ` #${profile.founding_number}` : ''}`, desc: 'Your place is reserved — we launch visits on 15 August' },
              { done: false, label: '2', title: 'Book the first visit',      desc: 'Schedule a companion to visit your parent in India' },
              { done: false, label: '3', title: 'You get a WhatsApp report', desc: 'Health, mood, medicines — sent within the hour' },
            ]
          : [
              { done: false, label: '1', title: 'Join as a Founding Member', desc: '₹100 one-time — locks your place and activates health support' },
              { done: false, label: '2', title: 'We visit and check on them', desc: 'A verified companion visits your parent in person' },
              { done: false, label: '3', title: 'You get a WhatsApp report', desc: 'Health, mood, medicines — sent within the hour' },
            ]
        return (
          <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', padding: '20px 20px 16px', boxShadow: 'var(--shadow-card)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-mid)', letterSpacing: '0.08em', margin: '0 0 16px' }}>
              {isMember ? "WHAT'S NEXT" : 'HOW IT WORKS'}
            </p>
            {steps.map(({ done, label, title, desc }, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < steps.length - 1 ? 14 : 0 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: done ? '#16a34a' : 'var(--forest)', color: '#fff', fontSize: done ? 14 : 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{label}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: done ? 'var(--gray-mid)' : 'var(--black)', margin: 0 }}>{title}</p>
                  <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '2px 0 0' }}>{desc}</p>
                </div>
              </div>
            ))}
            {isMember && (
              <Link to="/dashboard/book" style={{ display: 'block', marginTop: 16, background: 'var(--forest)', color: '#fff', borderRadius: 100, padding: '12px 20px', fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                Book the first visit →
              </Link>
            )}
          </div>
        )
      })()}

      {/* ── Last visit preview ────────────────────────────────── */}
      {visit && (
        <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', padding: 20, boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-mid)', letterSpacing: '0.08em' }}>LAST VISIT</span>
            <Link to="/dashboard/reports" style={{ fontSize: 12, fontWeight: 500, color: 'var(--forest)', textDecoration: 'none' }}>Full report →</Link>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--black)', margin: '8px 0 0' }}>{elderName}</p>
          <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: '2px 0 0' }}>{istTime(visit.start_time || visit.created_at)}{visitMins ? ` · ${visitMins} min` : ''}</p>
          {visit.one_moment && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid var(--gray-light)', margin: '14px 0' }} />
              <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--sage)', opacity: 0.5, lineHeight: 0.5 }}>“</span>
              <p style={{ fontSize: 15, color: 'var(--gray-dark)', lineHeight: 1.7, fontStyle: 'italic', margin: '6px 0 0' }}>{visit.one_moment}</p>
            </>
          )}
          <hr style={{ border: 'none', borderTop: '1px solid var(--gray-light)', margin: '14px 0' }} />
          <div className="flex items-center" style={{ gap: 8 }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--forest)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>K</span>
            <span style={{ fontSize: 12, color: 'var(--gray-mid)' }}>Krishna · Companion</span>
          </div>
        </div>
      )}

      {/* ── Upcoming visit ────────────────────────────────────── */}
      {nextBooking && (
        <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', padding: '16px 20px', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center' }}>
          <Calendar size={20} color="var(--forest)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', marginLeft: 10, flex: 1 }}>Next visit — {istDate(nextBooking.scheduled_at)}</span>
          <Link to="/dashboard/book" style={{ fontSize: 12, color: 'var(--gray-mid)', textDecoration: 'none' }}>Reschedule</Link>
        </div>
      )}

      {/* ── Health query shortcut ─────────────────────────────── */}
      <Link to="/dashboard/ask" className="ce-press" style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '12px 16px 24px', background: 'var(--cream-dark)', borderRadius: 'var(--radius-card)', padding: '18px 20px', textDecoration: 'none' }}>
        <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--forest)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MessageCircle size={20} color="#fff" />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--black)' }}>Have a health question?</span>
          <span style={{ display: 'block', fontSize: 13, color: 'var(--gray-mid)' }}>Ask Close Eye — guided by our medical team</span>
        </span>
        <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--forest)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-btn)' }}>
          <ChevronRight size={18} color="#fff" />
        </span>
      </Link>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray-mid)', padding: '0 24px 8px' }}>Signed in as {profile?.full_name || 'you'}</p>
    </div>
  )
}

/* ================================================================== */
/*  SOCIETY MEMBER HOME                                                */
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
                {q.answer || q.ai_answer || (q.status === 'pending' ? 'Doctor review in progress…' : '')}
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
