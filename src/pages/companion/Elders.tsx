import { useEffect, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  TbChevronRight, TbHistory, TbCalendar, TbWheelchair, TbArrowLeft,
  TbHeartRateMonitor, TbPill, TbHeart, TbPhoneCall, TbPhone,
} from 'react-icons/tb'
import { differenceInDays, format } from 'date-fns'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  Avatar, asArray, initialsOf, durationLabel, usePullToRefresh,
  type Medication, type EmergencyContact,
} from './_shared'

const FLAG_DOT: Record<string, string> = { none: '🟢', monitor: '🟡', urgent: '🔴' }

type ElderRow = {
  lovedOneId: string
  name: string | null
  age: number | null
  city: string | null
  address: string | null
  lastVisit: string | null
  nextVisit: string | null
}

// ── List ─────────────────────────────────────────────────────────────────────
export function CompanionElders() {
  const { user } = useAuth()
  const [rows, setRows] = useState<ElderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      const { data, error } = await supabase.from('bookings')
        .select('loved_one_id,status,scheduled_at,checked_in_at,loved_ones(full_name,city,address,age)')
        .eq('companion_id', user.id)
        .not('loved_one_id', 'is', null)
      if (error) throw error

      const now = new Date()
      const byElder = new Map<string, ElderRow>()
      for (const b of (data || []) as any[]) {
        const id = b.loved_one_id as string
        const lo = b.loved_ones
        const cur = byElder.get(id) || {
          lovedOneId: id, name: lo?.full_name ?? null, age: lo?.age ?? null,
          city: lo?.city ?? null, address: lo?.address ?? null, lastVisit: null, nextVisit: null,
        }
        // last visit = most recent completed check-in
        if (b.status === 'completed' && b.checked_in_at) {
          if (!cur.lastVisit || new Date(b.checked_in_at) > new Date(cur.lastVisit)) cur.lastVisit = b.checked_in_at
        }
        // next visit = earliest future assigned
        if (b.status === 'companion_assigned' && b.scheduled_at && new Date(b.scheduled_at) >= now) {
          if (!cur.nextVisit || new Date(b.scheduled_at) < new Date(cur.nextVisit)) cur.nextVisit = b.scheduled_at
        }
        byElder.set(id, cur)
      }
      setRows([...byElder.values()].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
    } catch (err) {
      console.error('Failed to load elders:', err)
      setError('Could not load your elders — please try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])
  const ptr = usePullToRefresh(load)

  function lastLabel(iso: string | null): string {
    if (!iso) return 'Never'
    const d = differenceInDays(new Date(), new Date(iso))
    if (d <= 0) return 'Today'
    if (d === 1) return 'Yesterday'
    return `${d} days ago`
  }

  return (
    <div {...ptr.bind}>
      {ptr.indicator}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-[0.08em]">Your elders</p>
        {rows.length > 0 && (
          <span className="bg-[#0E2A1F]/[0.08] rounded-full px-2.5 py-[3px] text-[11px] font-semibold text-[#0E2A1F]">
            {rows.length} elder{rows.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="px-4 space-y-2.5">{[0, 1, 2].map(i => <div key={i} className="skeleton h-[104px] rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center text-center px-6 py-20">
          <TbWheelchair size={48} className="text-[#E5E5EA] mb-4" />
          <p className="text-[18px] font-bold text-[#1D1D1F]">No elders assigned yet</p>
          <p className="text-[14px] text-[#6E6E73] mt-1.5 max-w-[260px]">
            Your elder profiles will appear here once visits are scheduled.
          </p>
        </div>
      ) : (
        rows.map(r => (
          <Link key={r.lovedOneId} to={`/companion/elder/${r.lovedOneId}`}
            className="block bg-white rounded-[14px] mx-4 mb-2.5 p-4 border-[0.5px] border-[#E5E5EA] shadow-[var(--shadow-card)] ce-press">
            <div className="flex items-center gap-3">
              <Avatar name={r.name} size={44} />
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold text-[#1D1D1F] truncate">{r.name || 'Elder'}</p>
                <p className="text-[12px] text-[#6E6E73] truncate">
                  {[r.age ? `${r.age} yrs` : null, r.address || r.city].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <TbChevronRight size={16} className="text-[#6E6E73] flex-shrink-0" />
            </div>
            <div className="h-px bg-[#E5E5EA] my-3" />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] text-[#6E6E73]">
                <TbHistory size={13} /> Last visit: {lastLabel(r.lastVisit)}
              </span>
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0E2A1F]">
                <TbCalendar size={13} /> {r.nextVisit ? `Next: ${format(new Date(r.nextVisit), 'EEE d MMM')}` : 'Not scheduled'}
              </span>
            </div>
          </Link>
        ))
      )}
      <div className="h-6" />
    </div>
  )
}

// ── Detail ───────────────────────────────────────────────────────────────────
export function CompanionElderDetail() {
  const { elderId } = useParams<{ elderId: string }>()  // elderId == loved_one_id
  const { user } = useAuth()
  const navigate = useNavigate()
  const [lovedOne, setLovedOne] = useState<any>(null)
  const [elder, setElder] = useState<any>(null)
  const [visits, setVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      if (!user || !elderId) return
      setLoading(true)
      try {
        const { data: lo } = await supabase.from('loved_ones')
          .select('id,full_name,city,address,age,medical_notes,emergency_contact_name,emergency_contact_phone')
          .eq('id', elderId).maybeSingle()
        setLovedOne(lo)
        const { data: ep } = await supabase.from('elder_profiles')
          .select('*').eq('loved_one_id', elderId).maybeSingle()
        setElder(ep || null)
        if (ep?.id) {
          const { data: vs } = await supabase.from('visits')
            .select('id,flags,one_moment,start_time,end_time,created_at')
            .eq('elder_id', ep.id).eq('companion_id', user.id)
            .order('created_at', { ascending: false }).limit(5)
          setVisits(vs || [])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [user, elderId])

  const name = elder?.name || lovedOne?.full_name || 'Elder'
  const age = elder?.age ?? lovedOne?.age
  const meds = asArray<Medication>(elder?.current_medications)
  const contacts = asArray<EmergencyContact>(elder?.emergency_contacts)
  const primary = contacts[0] || (lovedOne?.emergency_contact_name ? { name: lovedOne.emergency_contact_name, phone: lovedOne.emergency_contact_phone, relation: '' } : null)
  const conditions = elder?.medical_conditions || lovedOne?.medical_notes
  const prefs = [elder?.food_preferences, elder?.conversation_interests].filter(Boolean)

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-32 rounded-2xl" />
      </div>
    )
  }

  return (
    <div>
      {/* Header card */}
      <div className="bg-[#0E2A1F] px-4 pt-4 pb-6">
        <button onClick={() => navigate('/companion/elders')} className="flex items-center gap-1.5 text-white/70 text-[13px] mb-3">
          <TbArrowLeft size={16} /> Elders
        </button>
        <div className="flex items-center gap-3.5">
          <div className="w-[52px] h-[52px] rounded-full bg-[#A8D5B5]/15 border-2 border-[#A8D5B5] flex items-center justify-center flex-shrink-0">
            <span className="text-[18px] font-bold text-white">{initialsOf(name)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[20px] font-bold text-white truncate">{name}</p>
            <p className="text-[14px] text-[#A8D5B5]">{[age ? `${age} yrs` : null, elder?.city || lovedOne?.city].filter(Boolean).join(' · ')}</p>
            {lovedOne?.address && <p className="text-[12px] text-white/55 truncate">{lovedOne.address}</p>}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {/* Health info */}
        <Section icon={<TbHeartRateMonitor size={16} className="text-[#0E2A1F]" />} title="Health info">
          <InfoRow label="Medical condition" value={conditions} />
          <InfoRow label="Allergies" value={elder?.allergies} />
          <InfoRow label="Doctor" value={elder?.doctor_name} />
          {elder?.doctor_phone && (
            <div className="flex items-center justify-between py-2">
              <span className="text-[12px] text-[#6E6E73]">Doctor phone</span>
              <a href={`tel:${elder.doctor_phone}`} className="text-[13px] font-semibold text-[#0E2A1F]">{elder.doctor_phone}</a>
            </div>
          )}
        </Section>

        {/* Medicines */}
        {meds.length > 0 && (
          <Section icon={<TbPill size={16} className="text-[#0E2A1F]" />} title="Medicines">
            {meds.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b-[0.5px] border-[#F5F5F5] last:border-0">
                <span className="text-[14px] font-medium text-[#1D1D1F]">{m.name}{m.dosage ? ` · ${m.dosage}` : ''}</span>
                {m.timing && <span className="text-[12px] text-[#6E6E73]">{m.timing}</span>}
              </div>
            ))}
          </Section>
        )}

        {/* Preferences */}
        {(prefs.length > 0 || elder?.things_to_avoid) && (
          <Section icon={<TbHeart size={16} className="text-[#0E2A1F]" />} title="Preferences">
            {prefs.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {prefs.flatMap(p => String(p).split(',')).map(p => p.trim()).filter(Boolean).map((p, i) => (
                  <span key={i} className="bg-[#FAF7F2] border-[0.5px] border-[#EDE8E0] rounded-full px-3 py-1.5 text-[12px] text-[#3A3A3C]">{p}</span>
                ))}
              </div>
            )}
            {elder?.things_to_avoid && (
              <>
                <p className="text-[11px] font-semibold text-[#EF4444] mb-1.5">Avoid:</p>
                <div className="flex flex-wrap gap-2">
                  {String(elder.things_to_avoid).split(',').map(p => p.trim()).filter(Boolean).map((p, i) => (
                    <span key={i} className="bg-[#FEF2F2] border-[0.5px] border-[#FECACA] rounded-full px-3 py-1.5 text-[12px] text-[#B91C1C]">{p}</span>
                  ))}
                </div>
              </>
            )}
          </Section>
        )}

        {/* Emergency */}
        {primary && (
          <Section icon={<TbPhoneCall size={16} className="text-[#EF4444]" />} title="Emergency contacts">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-[#1D1D1F]">{primary.name}</p>
                {primary.relation && <p className="text-[12px] text-[#6E6E73]">{primary.relation}</p>}
                {primary.phone && <p className="text-[12px] text-[#6E6E73]">{primary.phone}</p>}
              </div>
              {primary.phone && (
                <a href={`tel:${primary.phone}`} className="bg-[#0E2A1F] text-white rounded-full px-4 py-2 text-[12px] font-semibold flex items-center gap-1.5">
                  <TbPhone size={14} /> Call
                </a>
              )}
            </div>
          </Section>
        )}

        {/* Visit history */}
        <Section icon={<TbHistory size={16} className="text-[#0E2A1F]" />} title="Visit history">
          {visits.length === 0 ? (
            <p className="text-[13px] text-[#6E6E73] py-1">No visits recorded with this elder yet.</p>
          ) : (
            visits.map(v => (
              <div key={v.id} className="py-2.5 border-b-[0.5px] border-[#F5F5F5] last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">
                    {format(new Date(v.end_time || v.created_at), 'dd MMM yyyy')}
                  </span>
                  <span className="text-[11px] text-[#6E6E73]">
                    {FLAG_DOT[v.flags] || '🟢'} {durationLabel(v.start_time && v.end_time ? Math.round((new Date(v.end_time).getTime() - new Date(v.start_time).getTime()) / 60000) : null)}
                  </span>
                </div>
                {v.one_moment && <p className="text-[13px] text-[#6E6E73] italic mt-0.5 line-clamp-2">"{v.one_moment}"</p>}
              </div>
            ))
          )}
        </Section>
        <div className="h-4" />
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[14px] p-4 border-[0.5px] border-[#E5E5EA]">
      <p className="text-[14px] font-bold text-[#1D1D1F] mb-2 flex items-center gap-2">{icon}{title}</p>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b-[0.5px] border-[#F5F5F5] last:border-0 gap-3">
      <span className="text-[12px] text-[#6E6E73] flex-shrink-0">{label}</span>
      <span className="text-[13px] text-[#1D1D1F] font-medium text-right">{value || '—'}</span>
    </div>
  )
}
