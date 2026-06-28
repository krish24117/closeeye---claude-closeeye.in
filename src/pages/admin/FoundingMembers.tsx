import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TbArrowLeft, TbBrandWhatsapp } from 'react-icons/tb'
import { supabase } from '@/lib/supabase'
import {
  Avatar, Badge, Card, PageHeader, EmptyState, ErrorBox, Skeleton,
  istDate, serviceLabel,
  type Tone,
} from './_shared'

/* ─── helpers ─────────────────────────────────────────────────────── */

function waLink(number: string | null, name: string | null, num: number | null): string {
  if (!number) return 'https://wa.me/'
  const digits = number.replace(/\D/g, '')
  const full = digits.length === 10 ? `91${digits}` : digits
  const first = (name || 'there').split(' ')[0]
  const msg = encodeURIComponent(
    `Hi ${first} 🌿 This is Krishna from Close Eye. You're our Founding Member #${num ?? '—'}. We're counting down to 15 August! I'll be in touch soon to schedule the first visit for your loved one.`
  )
  return `https://wa.me/${full}?text=${msg}`
}

function visitStatusFromBookings(bookings: { status: string }[]): { label: string; tone: Tone } {
  if (bookings.some(b => b.status === 'completed')) return { label: 'First visit done ✓', tone: 'green' }
  if (bookings.length > 0)                          return { label: 'First visit scheduled', tone: 'blue' }
  return { label: 'First visit: not yet', tone: 'amber' }
}

/* ─── types ───────────────────────────────────────────────────────── */

interface LovedOneRow {
  id: string
  full_name: string | null
  city: string | null
  address: string | null
  relationship: string | null
  age: number | null
  elder_profiles?: ElderProfileRow[] | null
}

interface ElderProfileRow {
  id: string
  name: string | null
  age: number | null
  conditions: string | null
  medications: string | null
  doctor_name: string | null
  notes: string | null
}

interface MembershipRow {
  status: string
  razorpay_payment_id: string | null
  activated_at: string | null
}

interface MemberRow {
  id: string
  full_name: string | null
  whatsapp_number: string | null
  country: string | null
  founding_number: number | null
  founding_date: string | null
  memberships: MembershipRow[]
  loved_ones: LovedOneRow[]
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  LIST                                                               */
/* ═══════════════════════════════════════════════════════════════════ */

export function AdminFoundingMembers() {
  const navigate = useNavigate()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [visitMap, setVisitMap]   = useState<Record<string, { status: string }[]>>({})
  const [loading, setLoading]     = useState(true)
  const [err, setErr]             = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setErr(false)
    try {
      const { data: profs, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, whatsapp_number, country, founding_number, founding_date')
        .eq('is_founding_member', true)
        .order('founding_number', { ascending: true })
      if (pErr) throw pErr
      if (!profs?.length) { setMembers([]); setLoading(false); return }

      const ids = profs.map((p: any) => p.id)
      const [msRes, loRes, bkRes] = await Promise.all([
        supabase.from('memberships').select('user_id, status, razorpay_payment_id, activated_at').in('user_id', ids),
        supabase.from('loved_ones').select('id, family_user_id, full_name, city, relationship, age').in('family_user_id', ids),
        supabase.from('bookings').select('family_user_id, status').in('family_user_id', ids).not('status', 'in', '("cancelled")'),
      ])

      const msMap: Record<string, MembershipRow[]> = {}
      ;(msRes.data || []).forEach((m: any) => { (msMap[m.user_id] = msMap[m.user_id] || []).push(m) })
      const loMap: Record<string, LovedOneRow[]> = {}
      ;(loRes.data || []).forEach((lo: any) => { (loMap[lo.family_user_id] = loMap[lo.family_user_id] || []).push(lo) })
      const vm: Record<string, { status: string }[]> = {}
      ;(bkRes.data || []).forEach((b: any) => { (vm[b.family_user_id] = vm[b.family_user_id] || []).push({ status: b.status }) })

      setMembers(profs.map((p: any) => ({ ...p, memberships: msMap[p.id] || [], loved_ones: loMap[p.id] || [] })))
      setVisitMap(vm)
    } catch (e) {
      console.error('[FoundingMembers] load error:', e)
      setErr(true)
    } finally { setLoading(false) }
  }

  const total      = members.length
  const thisWeekCutoff = new Date(); thisWeekCutoff.setDate(thisWeekCutoff.getDate() - 7)
  const thisWeek   = members.filter(m => m.founding_date && new Date(m.founding_date) >= thisWeekCutoff).length

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[...Array(3)].map((_, i) => <Skeleton key={i} h={140} />)}</div>
  if (err) return <ErrorBox onRetry={load} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title="Founding Members" subtitle="Paid ₹100 founding members — pre-launch" />

      {/* ── Summary strip ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Members',      value: String(total) },
          { label: 'Collected',    value: `₹${(total * 100).toLocaleString('en-IN')}` },
          { label: 'This week',    value: String(thisWeek) },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '0.5px solid var(--gray-light)', borderRadius: 12, padding: '12px 14px', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-mid)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--black)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Member cards ──────────────────────────────────────── */}
      {members.length === 0
        ? <EmptyState title="No founding members yet" sub="They'll appear here once someone completes the ₹100 payment." />
        : members.map(m => {
            const lo   = m.loved_ones?.[0]
            const paid = m.memberships?.some(ms => ms.status === 'active')
            const vs   = visitStatusFromBookings(visitMap[m.id] || [])
            return (
              <div key={m.id} style={{ background: '#fff', border: '0.5px solid var(--gray-light)', borderRadius: 16, padding: '16px 16px 14px', boxShadow: 'var(--shadow-card)' }}>
                {/* Name + number + payment badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Avatar name={m.full_name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--black)' }}>{m.full_name || '—'}</span>
                      {m.founding_number != null && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--forest)', background: 'rgba(14,42,31,0.08)', borderRadius: 100, padding: '2px 8px' }}>#{m.founding_number}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 1 }}>📱 {m.whatsapp_number || '—'}</div>
                  </div>
                  <Badge tone={paid ? 'green' : 'amber'}>{paid ? 'Paid ✓' : 'Pending'}</Badge>
                </div>

                {/* Loved one */}
                {lo ? (
                  <div style={{ fontSize: 13, color: 'var(--gray-dark)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>🧓</span>
                    <span>
                      <strong style={{ color: 'var(--black)' }}>{lo.full_name || '—'}</strong>
                      {lo.city
                        ? <span style={{ color: 'var(--gray-mid)' }}> · {lo.city}</span>
                        : <span className="adm-badge amber" style={{ marginLeft: 6, fontSize: 10 }}>City missing</span>
                      }
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginBottom: 8 }}>No loved one recorded yet</div>
                )}

                {/* Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  <Badge tone="gray">Joined {istDate(m.founding_date)}</Badge>
                  <Badge tone={vs.tone}>{vs.label}</Badge>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a href={waLink(m.whatsapp_number, m.full_name, m.founding_number)} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#25D366', color: '#fff', borderRadius: 100, padding: '8px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                    <TbBrandWhatsapp size={15} /> Message
                  </a>
                  <button onClick={() => navigate(`/admin/founding-members/${m.id}`)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--cream)', border: '0.5px solid var(--gray-light)', color: 'var(--forest)', borderRadius: 100, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                    View profile →
                  </button>
                </div>
              </div>
            )
          })
      }
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  DETAIL                                                             */
/* ═══════════════════════════════════════════════════════════════════ */

export function AdminFoundingMemberDetail() {
  const { userId } = useParams<{ userId: string }>()
  const navigate   = useNavigate()
  const [data, setData]         = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState(false)

  useEffect(() => { if (userId) load() }, [userId])

  async function load() {
    setLoading(true); setErr(false)
    try {
      const [profRes, msRes, loRes, bkRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, whatsapp_number, country, founding_number, founding_date').eq('id', userId!).eq('is_founding_member', true).maybeSingle(),
        supabase.from('memberships').select('status, razorpay_payment_id, activated_at, created_at').eq('user_id', userId!),
        supabase.from('loved_ones').select('id, full_name, city, address, relationship, age').eq('family_user_id', userId!),
        supabase.from('bookings').select('id, status, scheduled_at, service_type, amount_paise').eq('family_user_id', userId!).order('scheduled_at', { ascending: false }).limit(20),
      ])
      if (!profRes.data) throw new Error('Profile not found')

      const loIds = (loRes.data || []).map((lo: any) => lo.id)
      let elderProfiles: any[] = []
      if (loIds.length) {
        const { data } = await supabase
          .from('elder_profiles')
          .select('id, loved_one_id, name, age, conditions, medications, doctor_name, notes')
          .in('loved_one_id', loIds)
        elderProfiles = data || []
      }
      const loWithEp = (loRes.data || []).map((lo: any) => ({
        ...lo,
        elder_profiles: elderProfiles.filter((ep: any) => ep.loved_one_id === lo.id),
      }))

      setData({ ...profRes.data, memberships: msRes.data || [], loved_ones: loWithEp })
      setBookings(bkRes.data || [])
    } catch (e) {
      console.error('[FoundingMemberDetail] load error:', e)
      setErr(true)
    } finally { setLoading(false) }
  }

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><Skeleton h={120} /><Skeleton h={200} /><Skeleton h={160} /></div>

  const backBtn = (
    <button onClick={() => navigate('/admin/founding-members')}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--gray-mid)', fontSize: 13, cursor: 'pointer', marginBottom: 12, padding: 0 }}>
      <TbArrowLeft size={16} /> Founding Members
    </button>
  )

  if (err || !data) return <div>{backBtn}<ErrorBox onRetry={load} /></div>

  const lo              = data.loved_ones?.[0] as LovedOneRow | undefined
  const ep              = lo?.elder_profiles?.[0] as ElderProfileRow | undefined
  const activeMembership: MembershipRow = data.memberships?.find((m: MembershipRow) => m.status === 'active') || data.memberships?.[0]
  const paid            = activeMembership?.status === 'active'
  const activeBookings  = bookings.filter((b: any) => b.status !== 'cancelled')
  const vs              = visitStatusFromBookings(activeBookings)

  return (
    <div style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {backBtn}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Avatar name={data.full_name} size={44} />
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--black)' }}>{data.full_name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            {data.founding_number != null && (
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)', background: 'rgba(14,42,31,0.08)', borderRadius: 100, padding: '2px 10px' }}>
                Founding Member #{data.founding_number}
              </span>
            )}
            <Badge tone={paid ? 'green' : 'amber'}>{paid ? 'Paid ✓' : 'Payment pending'}</Badge>
            <Badge tone={vs.tone}>{vs.label}</Badge>
          </div>
        </div>
      </div>

      {/* ── Member ─────────────────────────────────────────────── */}
      <Card>
        <div className="adm-card-head"><span className="adm-card-title">Member</span></div>
        <DetailTable rows={[
          ['WhatsApp',   data.whatsapp_number || '—'],
          ['Country',    data.country || '—'],
          ['Joined',     istDate(data.founding_date)],
          ['Payment',    paid ? 'Paid ✓' : 'Pending'],
          ['Payment ID', activeMembership?.razorpay_payment_id || '—'],
        ]} />
        <div style={{ marginTop: 14 }}>
          <a href={waLink(data.whatsapp_number, data.full_name, data.founding_number)} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#25D366', color: '#fff', borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            <TbBrandWhatsapp size={15} /> Message on WhatsApp
          </a>
        </div>
      </Card>

      {/* ── Loved one ──────────────────────────────────────────── */}
      {lo ? (
        <Card>
          <div className="adm-card-head"><span className="adm-card-title">Loved one</span></div>
          <DetailTable rows={[
            ['Name',         lo.full_name || '—'],
            ['Relationship', lo.relationship || '—'],
            ['Age',          lo.age ? `${lo.age} yrs` : '—'],
            ['City',         lo.city || '—'],
            ['Address',      lo.address || '—'],
          ]} />
        </Card>
      ) : (
        <Card><EmptyState title="No loved one recorded" sub="They may not have completed onboarding step 1." /></Card>
      )}

      {/* ── Elder profile ───────────────────────────────────────── */}
      {ep ? (
        <Card>
          <div className="adm-card-head"><span className="adm-card-title">Elder profile</span></div>
          <DetailTable rows={[
            ['Conditions',  ep.conditions  || '—'],
            ['Medications', ep.medications || '—'],
            ['Doctor',      ep.doctor_name || '—'],
            ['Notes',       ep.notes       || '—'],
          ]} />
        </Card>
      ) : lo ? (
        <Card>
          <div className="adm-card-head"><span className="adm-card-title">Elder profile</span></div>
          <EmptyState title="No elder profile yet" sub="Created by admin after the first visit is arranged." />
        </Card>
      ) : null}

      {/* ── Visits / bookings ───────────────────────────────────── */}
      <Card>
        <div className="adm-card-head">
          <span className="adm-card-title">Visits</span>
          <Badge tone={vs.tone}>{vs.label}</Badge>
        </div>
        {activeBookings.length === 0
          ? <EmptyState title="No visits yet" sub="Use Bookings tab to schedule the first one." />
          : activeBookings.map((b: any) => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '0.5px solid var(--gray-light)', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{istDate(b.scheduled_at)}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-mid)' }}>{serviceLabel(b.service_type)}</div>
                </div>
                <Badge tone={b.status === 'completed' ? 'green' : b.status === 'cancelled' ? 'gray' : 'blue'}>
                  {b.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))
        }
      </Card>
    </div>
  )
}

/* ── Internal helper ───────────────────────────────────────────────── */
function DetailTable({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td style={{ padding: '5px 0', color: 'var(--gray-mid)', width: 110, fontWeight: 500, verticalAlign: 'top' }}>{label}</td>
            <td style={{ padding: '5px 0', color: 'var(--black)', fontWeight: 600, lineHeight: 1.5 }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
