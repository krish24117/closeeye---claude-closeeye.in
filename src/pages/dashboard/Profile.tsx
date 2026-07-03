import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LogOut, Edit2, Save, X, Plus, ChevronRight, MapPin, Loader2, Check,
  Star, Calendar, FileText, MessageCircle, Phone, Heart,
  CheckCircle2, Stethoscope, Pill, Shield, Home, Activity,
  Award, Share2, HelpCircle, CreditCard, ChevronDown,
  Copy, Trash2, Bell, AlertCircle
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LovedOne { id: string; full_name: string; relationship: string | null; city: string | null; phone_number: string | null }
interface ElderProfile {
  id?: string; loved_one_id: string; age: number | null; address: string | null
  medical_conditions: string | null; current_medications: MedItem[]; allergies: string | null
  doctor_name: string | null; doctor_phone: string | null; emergency_contacts: EC[]; photo_consent: boolean
}
interface MedItem { name?: string; dose?: string; timing?: string }
interface EC { name?: string; relationship?: string; phone?: string }
interface Booking { id: string; service_name: string; scheduled_at: string | null; status: string; recipient_name: string; created_at: string; amount_paise: number | null }
interface NotifPrefs { whatsapp: boolean; email: boolean; push: boolean; sms: boolean; medicine: boolean; visit: boolean; emergency: boolean; weekly: boolean }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name?: string | null) {
  return (name || 'CE').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function memberEmoji(rel: string | null): string {
  const r = (rel || '').toLowerCase()
  if (r.includes('mother') || r.includes('grandm')) return '👵'
  if (r.includes('father') || r.includes('grandf')) return '👴'
  if (r.includes('daughter')) return '👧'
  if (r.includes('son')) return '👦'
  if (r.includes('spouse')) return '💑'
  if (r.includes('sibling') || r.includes('brother') || r.includes('sister')) return '👫'
  return '👤'
}

function fmtDate(iso: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtRel(iso: string) {
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${Math.round(hours)}h ago`
  if (hours < 48) return 'Yesterday'
  return fmtDate(iso, { day: 'numeric', month: 'short' })
}

function isFuture(iso: string | null) { return !!iso && new Date(iso) > new Date() }

function statusPill(status: string) {
  const map: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-emerald-50 text-emerald-700',
    pending_confirmation: 'bg-amber-50 text-amber-700',
    needs_details: 'bg-orange-50 text-orange-700',
    cancelled: 'bg-red-50 text-red-500',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

function statusLabel(s: string) {
  const m: Record<string, string> = { confirmed: 'Confirmed', completed: 'Completed', pending_confirmation: 'Pending', needs_details: 'Needs details', cancelled: 'Cancelled' }
  return m[s] ?? s
}

function activityIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes('doctor') || n.includes('health') || n.includes('vitals')) return <Stethoscope size={13} />
  if (n.includes('medicine') || n.includes('medic')) return <Pill size={13} />
  if (n.includes('companion') || n.includes('home') || n.includes('visit')) return <Home size={13} />
  if (n.includes('ask') || n.includes('ai')) return <MessageCircle size={13} />
  return <Calendar size={13} />
}

function medLabel(m: MedItem | string) {
  if (typeof m === 'string') return m
  return [m.name, m.dose, m.timing].filter(Boolean).join(' · ')
}

// ─── Care score ───────────────────────────────────────────────────────────────

function computeScore(
  profile: { full_name: string | null; whatsapp_number: string | null; address: string | null } | null,
  los: LovedOne[], eps: Record<string, ElderProfile>
) {
  const items = [
    { label: 'Name & WhatsApp saved', done: !!(profile?.full_name && profile.whatsapp_number) },
    { label: 'Your address added', done: !!profile?.address },
    { label: 'Family member added', done: los.length > 0 },
    { label: "Family member's address saved", done: Object.values(eps).some(ep => !!ep.address) },
    { label: 'Health details recorded', done: Object.values(eps).some(ep => !!ep.medical_conditions || (ep.current_medications?.length ?? 0) > 0) },
    { label: 'Emergency contacts saved', done: Object.values(eps).some(ep => (ep.emergency_contacts?.length ?? 0) > 0) },
  ]
  return { score: Math.round(items.filter(i => i.done).length / items.length * 100), items }
}

// ─── CareScoreRing ────────────────────────────────────────────────────────────

function CareScoreRing({ score }: { score: number }) {
  const r = 50, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#A8D5B5' : score >= 50 ? '#C9A84C' : '#C07050'
  return (
    <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }} aria-label={`Care score ${score}%`}>
      <circle cx={60} cy={60} r={r} strokeWidth={10} fill="none" stroke="#EDE8E0" />
      <circle cx={60} cy={60} r={r} strokeWidth={10} fill="none"
        stroke={color} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button onClick={onToggle} role="switch" aria-checked={on} aria-label={label}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${on ? 'bg-[#0E2A1F]' : 'bg-gray-200'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pt-7">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6E6E73] mb-3 px-1">{label}</p>
      {children}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-[24px] shadow-[0_2px_16px_rgba(0,0,0,.06)] overflow-hidden ${className}`}>{children}</div>
}

// ─── Country codes ────────────────────────────────────────────────────────────

const CC = [
  { code: '+91', flag: '🇮🇳' }, { code: '+1', flag: '🇺🇸' }, { code: '+44', flag: '🇬🇧' },
  { code: '+971', flag: '🇦🇪' }, { code: '+61', flag: '🇦🇺' }, { code: '+65', flag: '🇸🇬' },
  { code: '+49', flag: '🇩🇪' }, { code: '+974', flag: '🇶🇦' }, { code: '+966', flag: '🇸🇦' },
  { code: '+64', flag: '🇳🇿' },
]

function splitPhone(full: string): { code: string; local: string } {
  if (!full) return { code: '+91', local: '' }
  const sorted = [...CC].sort((a, b) => b.code.length - a.code.length)
  for (const c of sorted) { if (full.startsWith(c.code)) return { code: c.code, local: full.slice(c.code.length) } }
  return { code: '+91', local: full }
}

function PhoneInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { code, local } = splitPhone(value)
  return (
    <div className="flex rounded-xl border border-[#E5E5EA] overflow-hidden bg-[#FAF7F2]">
      <select value={code} onChange={e => onChange(e.target.value + local)}
        className="border-none bg-transparent px-3 py-3 text-sm outline-none border-r border-[#E5E5EA] shrink-0 cursor-pointer">
        {CC.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
      </select>
      <input type="tel" value={local} onChange={e => onChange(code + e.target.value.replace(/\s/g, ''))}
        placeholder={placeholder ?? '9876543210'}
        className="flex-1 border-none bg-transparent px-3 py-3 text-sm outline-none min-w-0" />
    </div>
  )
}

// ─── AddressInput ─────────────────────────────────────────────────────────────

function AddressInput({ value, onChange, rows = 2, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const [detecting, setDetecting] = useState(false)
  const [geoErr, setGeoErr] = useState('')

  async function detect() {
    if (!navigator.geolocation) { setGeoErr('Location not available on this device'); return }
    setDetecting(true); setGeoErr('')
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&addressdetails=1`, { headers: { 'Accept-Language': 'en' } })
          const d = await r.json()
          const a = d.address || {}
          const parts = [a.house_number, a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village, a.state, a.postcode].filter(Boolean)
          onChange(parts.length ? parts.join(', ') : d.display_name || '')
        } catch { setGeoErr('Could not get address. Type it manually.') }
        finally { setDetecting(false) }
      },
      () => { setGeoErr('Location denied — type it manually.'); setDetecting(false) },
      { timeout: 10000 }
    )
  }

  return (
    <div>
      <textarea value={value} onChange={e => { onChange(e.target.value); setGeoErr('') }}
        placeholder={placeholder ?? 'Flat / house, area, landmark, pincode…'}
        rows={rows}
        className="w-full rounded-xl border border-[#E5E5EA] bg-[#FAF7F2] px-3 py-3 text-sm outline-none resize-none leading-relaxed" />
      <button type="button" onClick={detect} disabled={detecting}
        className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-[#0E2A1F] bg-[#F5F0E8] border border-[#0E2A1F]/10 rounded-xl px-3 py-2 min-h-[36px] disabled:opacity-50">
        {detecting ? <Loader2 size={12} className="ce-spin" /> : <MapPin size={12} />}
        {detecting ? 'Detecting…' : 'Auto-detect my location'}
      </button>
      {geoErr && <p className="text-[11px] text-red-600 mt-1.5">{geoErr}</p>}
    </div>
  )
}

// ─── Field styles ─────────────────────────────────────────────────────────────

const LBL = 'block text-[11px] font-bold uppercase tracking-[0.07em] text-[#6E6E73] mb-1.5'
const INP = 'w-full rounded-xl border border-[#E5E5EA] bg-[#FAF7F2] px-3 py-3 text-sm outline-none'

// ─── MemberForm ───────────────────────────────────────────────────────────────

interface MemberForm {
  full_name: string; relationship: string; city: string; phone_number: string
  age: string; address: string; medical_conditions: string; medications_text: string
  allergies: string; doctor_name: string; doctor_phone: string
  ec1_name: string; ec1_rel: string; ec1_phone: string
  ec2_name: string; ec2_rel: string; ec2_phone: string
  photo_consent: boolean; health_consent: boolean
}

const BLANK_FORM: MemberForm = {
  full_name: '', relationship: '', city: '', phone_number: '',
  age: '', address: '', medical_conditions: '', medications_text: '',
  allergies: '', doctor_name: '', doctor_phone: '',
  ec1_name: '', ec1_rel: '', ec1_phone: '',
  ec2_name: '', ec2_rel: '', ec2_phone: '',
  photo_consent: false, health_consent: false,
}

const RELS = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Sibling', 'Other']

function MemberFormFields({ form, setForm }: { form: MemberForm; setForm: (fn: (f: MemberForm) => MemberForm) => void }) {
  const needsConsent = !!(form.medical_conditions.trim() || form.medications_text.trim())
  return (
    <div className="flex flex-col gap-4">
      <div><label className={LBL}>Full name *</label>
        <input className={INP} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full name" /></div>

      <div>
        <label className={LBL}>Relationship</label>
        <div className="flex flex-wrap gap-2">
          {RELS.map(r => (
            <button key={r} type="button" onClick={() => setForm(f => ({ ...f, relationship: f.relationship === r ? '' : r }))}
              className={`rounded-full px-4 py-2 text-[13px] min-h-[36px] border transition-all ${form.relationship === r ? 'bg-[#0E2A1F] text-white border-transparent font-bold' : 'bg-[#FAF7F2] text-[#3A3A3C] border-[#E5E5EA]'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className={LBL}>City in India</label>
          <input className={INP} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Hyderabad" /></div>
        <div><label className={LBL}>Age</label>
          <input className={INP} type="number" min={1} max={120} value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="—" /></div>
      </div>

      <div><label className={LBL}>Their phone number</label>
        <PhoneInput value={form.phone_number} onChange={v => setForm(f => ({ ...f, phone_number: v }))} /></div>

      <div>
        <label className={LBL}>Address in India *</label>
        <AddressInput value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} rows={2} />
        <p className="text-[11px] text-[#6E6E73] mt-1">Auto-detect uses your current location.</p>
      </div>

      <div className="border-t border-[#EDE8E0] pt-4">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#6E6E73] mb-3">Health details (optional)</p>
        <div className="flex flex-col gap-3">
          <div><label className={LBL}>Health conditions</label>
            <input className={INP} value={form.medical_conditions} onChange={e => setForm(f => ({ ...f, medical_conditions: e.target.value }))} placeholder="e.g. Diabetes, Hypertension" /></div>
          <div><label className={LBL}>Medications</label>
            <input className={INP} value={form.medications_text} onChange={e => setForm(f => ({ ...f, medications_text: e.target.value }))} placeholder="Metformin 500mg, Amlodipine 5mg" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LBL}>Allergies</label>
              <input className={INP} value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="e.g. Penicillin" /></div>
            <div><label className={LBL}>Doctor's name</label>
              <input className={INP} value={form.doctor_name} onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))} placeholder="Dr. Name" /></div>
          </div>
          <div><label className={LBL}>Doctor's phone</label>
            <PhoneInput value={form.doctor_phone} onChange={v => setForm(f => ({ ...f, doctor_phone: v }))} /></div>
        </div>
        {needsConsent && (
          <label className="flex items-start gap-3 mt-3 cursor-pointer bg-[#FAF7F2] rounded-xl p-3">
            <input type="checkbox" checked={form.health_consent} onChange={e => setForm(f => ({ ...f, health_consent: e.target.checked }))} className="mt-0.5 w-4 h-4 shrink-0" />
            <span className="text-[12px] text-[#6E6E73] leading-relaxed">I consent to Close Eye storing this health information solely to coordinate care visits.</span>
          </label>
        )}
      </div>

      <div className="border-t border-[#EDE8E0] pt-4">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#6E6E73] mb-3">Emergency contacts</p>
        {(['ec1', 'ec2'] as const).map((pfx, i) => (
          <div key={pfx} className={i === 0 ? 'mb-4' : ''}>
            <p className="text-[11px] text-[#6E6E73] font-semibold mb-2 uppercase tracking-wide">{i === 0 ? 'Primary' : 'Secondary (optional)'}</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div><label className={LBL}>Name</label>
                <input className={INP} value={form[`${pfx}_name` as keyof MemberForm] as string}
                  onChange={e => setForm(f => ({ ...f, [`${pfx}_name`]: e.target.value }))} placeholder="Full name" /></div>
              <div><label className={LBL}>Relation</label>
                <input className={INP} value={form[`${pfx}_rel` as keyof MemberForm] as string}
                  onChange={e => setForm(f => ({ ...f, [`${pfx}_rel`]: e.target.value }))} placeholder="Son" /></div>
            </div>
            <div><label className={LBL}>Phone</label>
              <PhoneInput value={form[`${pfx}_phone` as keyof MemberForm] as string}
                onChange={v => setForm(f => ({ ...f, [`${pfx}_phone`]: v }))} /></div>
          </div>
        ))}
      </div>

      <label className="flex items-start gap-3 cursor-pointer bg-[#FAF7F2] rounded-xl p-4">
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${form.photo_consent ? 'bg-[#0E2A1F] border-[#0E2A1F]' : 'border-[#E5E5EA]'}`}>
          {form.photo_consent && <Check size={11} color="#fff" strokeWidth={3} />}
        </div>
        <input type="checkbox" checked={form.photo_consent} onChange={e => setForm(f => ({ ...f, photo_consent: e.target.checked }))} className="sr-only" />
        <div>
          <p className="text-[13px] font-semibold text-[#1D1D1F]">Allow photo updates</p>
          <p className="text-[11.5px] text-[#6E6E73] mt-0.5">Companion may include a photo in the WhatsApp report.</p>
        </div>
      </label>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_NOTIFS: NotifPrefs = { whatsapp: true, email: true, push: true, sms: false, medicine: true, visit: true, emergency: true, weekly: true }

export function DashboardProfile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isNri = profile?.user_type === 'nri'
  const isFounder = !!profile?.is_founding_member

  // ── Data ──────────────────────────────────────────────────────────────────
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([])
  const [elderProfiles, setElderProfiles] = useState<Record<string, ElderProfile>>({})
  const [bookings, setBookings] = useState<Booking[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [editingMemberId, setEditingMemberId] = useState<string | 'new' | null>(null)
  const [forms, setForms] = useState<Record<string, MemberForm>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [memberErr, setMemberErr] = useState<Record<string, string>>({})
  const [expandedHealth, setExpandedHealth] = useState<Record<string, boolean>>({})
  const [editingAcct, setEditingAcct] = useState(false)
  const [acctForm, setAcctForm] = useState({ full_name: '', whatsapp_number: '', country: '', address: '' })
  const [savingAcct, setSavingAcct] = useState(false)
  const [acctErr, setAcctErr] = useState('')
  const [acctSaved, setAcctSaved] = useState(false)
  const [notifs, setNotifs] = useState<NotifPrefs>(() => {
    try { return JSON.parse(localStorage.getItem('ce_notif_prefs') || 'null') || DEFAULT_NOTIFS }
    catch { return DEFAULT_NOTIFS }
  })
  const [copied, setCopied] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    setAcctForm({ full_name: profile?.full_name || '', whatsapp_number: profile?.whatsapp_number || '', country: profile?.country || '', address: profile?.address || '' })
    ;(async () => {
      try {
        const tasks: Promise<void>[] = [
          Promise.resolve(
            supabase.from('booking_requests')
              .select('id, service_name, scheduled_at, status, recipient_name, created_at, amount_paise')
              .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
              .then(({ data }) => { if (data) setBookings(data as Booking[]) })
          ),
        ]
        if (isNri) {
          tasks.push((async () => {
            const { data: los } = await supabase
              .from('loved_ones').select('id, full_name, relationship, city, phone_number')
              .eq('family_user_id', user.id).order('created_at')
            if (los?.length) {
              setLovedOnes(los as LovedOne[])
              const { data: eps } = await supabase.from('elder_profiles')
                .select('id, loved_one_id, age, address, medical_conditions, current_medications, allergies, doctor_name, doctor_phone, emergency_contacts, photo_consent')
                .in('loved_one_id', los.map(l => l.id))
              const epMap: Record<string, ElderProfile> = {}
              ;(eps || []).forEach((ep: unknown) => { const e = ep as ElderProfile; epMap[e.loved_one_id] = e })
              setElderProfiles(epMap)
              const fm: Record<string, MemberForm> = {}
              los.forEach((lo: unknown) => {
                const l = lo as LovedOne; const ep = epMap[l.id]
                const ecs: EC[] = Array.isArray(ep?.emergency_contacts) ? ep.emergency_contacts : []
                fm[l.id] = {
                  full_name: l.full_name || '', relationship: l.relationship || '', city: l.city || '', phone_number: l.phone_number || '',
                  age: ep?.age ? String(ep.age) : '', address: ep?.address || '',
                  medical_conditions: ep?.medical_conditions || '',
                  medications_text: Array.isArray(ep?.current_medications) ? ep.current_medications.map(medLabel).join(', ') : '',
                  allergies: ep?.allergies || '', doctor_name: ep?.doctor_name || '', doctor_phone: ep?.doctor_phone || '',
                  ec1_name: ecs[0]?.name || '', ec1_rel: ecs[0]?.relationship || '', ec1_phone: ecs[0]?.phone || '',
                  ec2_name: ecs[1]?.name || '', ec2_rel: ecs[1]?.relationship || '', ec2_phone: ecs[1]?.phone || '',
                  photo_consent: ep?.photo_consent ?? false, health_consent: false,
                }
              })
              setForms(fm)
            }
          })())
        }
        await Promise.all(tasks)
      } finally { setDataLoading(false) }
    })()
  }, [user, isNri, profile])

  // ── Derived ───────────────────────────────────────────────────────────────
  const upcomingVisit = bookings.find(b => isFuture(b.scheduled_at) && b.status !== 'cancelled')
  const recentActivity = bookings.slice(0, 6)
  const completedCount = bookings.filter(b => b.status === 'completed').length
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
  const { score: careScore, items: careItems } = computeScore(profile, lovedOnes, elderProfiles)

  // ── Notification toggle ───────────────────────────────────────────────────
  function toggleNotif(key: keyof NotifPrefs) {
    setNotifs(p => { const n = { ...p, [key]: !p[key] }; localStorage.setItem('ce_notif_prefs', JSON.stringify(n)); return n })
  }

  // ── Account save ──────────────────────────────────────────────────────────
  async function saveAcct() {
    if (!user) return
    setSavingAcct(true); setAcctErr(''); setAcctSaved(false)
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: acctForm.full_name.trim() || null,
        whatsapp_number: acctForm.whatsapp_number.trim(),
        country: acctForm.country.trim() || null,
        address: acctForm.address.trim() || null,
      }).eq('id', user.id)
      if (error) throw error
      setAcctSaved(true); setEditingAcct(false)
    } catch { setAcctErr('Could not save — please try again.') }
    finally { setSavingAcct(false) }
  }

  // ── Member helpers ────────────────────────────────────────────────────────
  function setMemberForm(id: string, fn: (f: MemberForm) => MemberForm) { setForms(fs => ({ ...fs, [id]: fn(fs[id] || BLANK_FORM) })) }
  function cancelEdit() { setEditingMemberId(null) }

  async function saveMember(id: string) {
    const form = forms[id]
    if (!user || !form) return
    if (!form.full_name.trim()) { setMemberErr(e => ({ ...e, [id]: 'Name is required.' })); return }
    if (!form.address.trim()) { setMemberErr(e => ({ ...e, [id]: 'Address is required.' })); return }
    const needsConsent = !!(form.medical_conditions.trim() || form.medications_text.trim())
    if (needsConsent && !form.health_consent) { setMemberErr(e => ({ ...e, [id]: 'Please tick the health data consent.' })); return }
    setSavingId(id); setMemberErr(e => ({ ...e, [id]: '' }))
    const meds = form.medications_text.split(',').map(s => s.trim()).filter(Boolean)
    const ecs: EC[] = []
    if (form.ec1_name.trim()) ecs.push({ name: form.ec1_name.trim(), relationship: form.ec1_rel.trim(), phone: form.ec1_phone.trim() })
    if (form.ec2_name.trim()) ecs.push({ name: form.ec2_name.trim(), relationship: form.ec2_rel.trim(), phone: form.ec2_phone.trim() })
    try {
      if (id === 'new') {
        const { data: newLo, error: loErr } = await supabase.from('loved_ones').insert({ family_user_id: user.id, full_name: form.full_name.trim(), relationship: form.relationship || null, city: form.city.trim() || null, phone_number: form.phone_number.trim() || null }).select('id, full_name, relationship, city, phone_number').single()
        if (loErr || !newLo) throw loErr ?? new Error('Failed')
        const epData = { loved_one_id: newLo.id, age: form.age ? parseInt(form.age) : null, address: form.address.trim(), medical_conditions: form.medical_conditions.trim() || null, current_medications: meds.length ? meds : [], allergies: form.allergies.trim() || null, doctor_name: form.doctor_name.trim() || null, doctor_phone: form.doctor_phone.trim() || null, emergency_contacts: ecs, photo_consent: form.photo_consent }
        const { data: newEp, error: epErr } = await supabase.from('elder_profiles').insert(epData).select('id').single()
        if (epErr) throw epErr
        setLovedOnes(p => [...p, newLo as LovedOne])
        setElderProfiles(p => ({ ...p, [newLo.id]: { id: newEp.id, ...epData } as ElderProfile }))
        setForms(fs => { const n = { ...fs }; n[newLo.id] = { ...form, health_consent: false }; delete n.new; return n })
      } else {
        const { error: loErr } = await supabase.from('loved_ones').update({ full_name: form.full_name.trim(), relationship: form.relationship || null, city: form.city.trim() || null, phone_number: form.phone_number.trim() || null }).eq('id', id)
        if (loErr) throw loErr
        const epData = { loved_one_id: id, age: form.age ? parseInt(form.age) : null, address: form.address.trim(), medical_conditions: form.medical_conditions.trim() || null, current_medications: meds.length ? meds : [], allergies: form.allergies.trim() || null, doctor_name: form.doctor_name.trim() || null, doctor_phone: form.doctor_phone.trim() || null, emergency_contacts: ecs, photo_consent: form.photo_consent }
        const ep = elderProfiles[id]
        if (ep?.id) await supabase.from('elder_profiles').update(epData).eq('id', ep.id)
        else { const { data: newEp, error: epErr } = await supabase.from('elder_profiles').insert(epData).select('id').single(); if (epErr) throw epErr; setElderProfiles(p => ({ ...p, [id]: { id: newEp.id, ...epData } as ElderProfile })) }
        setLovedOnes(p => p.map(l => l.id === id ? { ...l, full_name: form.full_name.trim(), relationship: form.relationship || null, city: form.city.trim() || null, phone_number: form.phone_number.trim() || null } : l))
        setElderProfiles(p => ({ ...p, [id]: { ...(p[id] || {}), ...epData } as ElderProfile }))
        setForms(fs => ({ ...fs, [id]: { ...form, health_consent: false } }))
      }
      setEditingMemberId(null)
    } catch { setMemberErr(e => ({ ...e, [id]: 'Could not save — please try again.' })) }
    finally { setSavingId(null) }
  }

  async function handleSignOut() { await signOut(); window.location.replace('/auth') }

  function copyReferral() {
    navigator.clipboard.writeText('https://closeeye.in/?ref=' + (user?.id?.slice(0, 8) || 'friend'))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (dataLoading) return (
    <div className="px-4 pt-6 pb-24 space-y-4 animate-pulse">
      <div className="h-36 bg-white rounded-[24px]" />
      <div className="h-44 bg-white rounded-[24px]" />
      <div className="h-24 bg-white rounded-[24px]" />
      <div className="h-52 bg-white rounded-[24px]" />
    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="pb-28 bg-[#F2EDE4] min-h-screen animate-fade-in">

      {/* ══ 1. Hero ══════════════════════════════════════════════════════ */}
      <div className="bg-white px-5 pt-6 pb-5 shadow-[0_2px_16px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#0E2A1F] flex items-center justify-center text-white text-xl font-bold shrink-0 select-none">
            {initials(profile?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[19px] font-bold text-[#1D1D1F] truncate leading-tight">{profile?.full_name || 'Your account'}</h1>
            {isFounder && (
              <span className="inline-flex items-center gap-1 bg-[#0E2A1F] text-[#A8D5B5] text-[11px] font-bold px-2.5 py-1 rounded-full mt-1">
                <Star size={9} fill="currentColor" />
                Founding Member {profile?.founding_number ? `#${String(profile.founding_number).padStart(4, '0')}` : ''}
              </span>
            )}
            <p className="text-[12px] text-[#6E6E73] mt-1 truncate">
              {profile?.country ? `${profile.country} → India` : isNri ? 'NRI Family' : 'Society Member'}
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex gap-0 mt-5 pt-4 border-t border-[#F0EBE1]">
          {[
            { val: lovedOnes.length || 0, lbl: 'In care' },
            { val: completedCount, lbl: 'Visits done' },
            { val: `${careScore}%`, lbl: 'Care score' },
          ].map((s, i, arr) => (
            <div key={s.lbl} className={`flex-1 text-center ${i < arr.length - 1 ? 'border-r border-[#F0EBE1]' : ''}`}>
              <p className="text-[21px] font-bold text-[#0E2A1F]">{s.val}</p>
              <p className="text-[11px] text-[#6E6E73]">{s.lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ 2. Membership card ══════════════════════════════════════════ */}
      {isFounder && (
        <Section label="Membership">
          <div className="rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(14,42,31,.18)]"
            style={{ background: 'linear-gradient(135deg, #0E2A1F 0%, #1B4332 60%, #163D2A 100%)' }}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Star size={13} fill="#A8D5B5" color="#A8D5B5" />
                    <span className="text-[12px] font-bold text-[#A8D5B5] uppercase tracking-widest">Founding Member</span>
                  </div>
                  <p className="text-white text-[22px] font-bold leading-tight">Premium Active</p>
                </div>
                <span className="bg-[#A8D5B5]/20 text-[#A8D5B5] text-[10.5px] font-bold px-3 py-1.5 rounded-full">LIFETIME</span>
              </div>
              <div className="flex gap-6 mb-4">
                {[
                  { lbl: 'Member since', val: fmtDate(profile?.founding_date, { month: 'long', year: 'numeric' }) },
                  { lbl: 'Member #', val: String(profile?.founding_number ?? 0).padStart(4, '0') },
                ].map(d => (
                  <div key={d.lbl}>
                    <p className="text-white/50 text-[10px] uppercase tracking-widest mb-0.5">{d.lbl}</p>
                    <p className="text-white text-[13px] font-semibold">{d.val}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5">
                {['Priority booking', '10% discount', 'AI Health Assistant', 'Emergency priority'].map(b => (
                  <div key={b} className="flex items-center gap-2">
                    <CheckCircle2 size={12} color="#A8D5B5" />
                    <span className="text-white/80 text-[12px]">{b}</span>
                  </div>
                ))}
              </div>
              <Link to="/dashboard/bookings"
                className="flex items-center justify-center gap-2 bg-[#A8D5B5] text-[#0E2A1F] rounded-[16px] py-3 text-[13px] font-bold min-h-[44px] no-underline">
                View bookings &amp; receipts <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </Section>
      )}

      {/* ══ 3. Quick actions ════════════════════════════════════════════ */}
      <Section label="Quick actions">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Calendar size={20} />, label: 'Book Visit', to: '/dashboard/book', em: false },
            { icon: <MessageCircle size={20} />, label: 'Ask CloseEye', to: '/dashboard/ask', em: false },
            { icon: <Activity size={20} />, label: 'Emergency', to: '/dashboard/book', em: true },
            { icon: <FileText size={20} />, label: 'Reports', to: '/dashboard/reports', em: false },
            { icon: <Phone size={20} />, label: 'Call Support', href: 'tel:+919000221261', em: false },
            { icon: <Heart size={20} />, label: 'WhatsApp', href: 'https://wa.me/919000221261', em: false },
          ].map(a => {
            const cls = `bg-white rounded-[18px] flex flex-col items-center gap-2 py-4 shadow-[0_2px_12px_rgba(0,0,0,.06)] min-h-[80px] justify-center active:scale-95 transition-transform no-underline`
            const ico = <span className={a.em ? 'text-[#C07050]' : 'text-[#0E2A1F]'}>{a.icon}</span>
            const lbl = <span className={`text-[11px] font-semibold text-center leading-tight ${a.em ? 'text-[#C07050]' : 'text-[#3A3A3C]'}`}>{a.label}</span>
            return a.href
              ? <a key={a.label} href={a.href} target={a.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={cls}>{ico}{lbl}</a>
              : <Link key={a.label} to={a.to!} className={cls}>{ico}{lbl}</Link>
          })}
        </div>
      </Section>

      {/* ══ 4. Upcoming visit ═══════════════════════════════════════════ */}
      <Section label="Upcoming visit">
        {upcomingVisit ? (
          <Card>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[17px] font-bold text-[#1D1D1F] leading-tight">{upcomingVisit.service_name}</p>
                  <p className="text-[12.5px] text-[#6E6E73] mt-0.5">For {upcomingVisit.recipient_name || 'family member'}</p>
                </div>
                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0 ml-3 ${statusPill(upcomingVisit.status)}`}>
                  {statusLabel(upcomingVisit.status)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-1.5 text-[12.5px] text-[#3A3A3C]">
                  <Calendar size={13} className="text-[#0E2A1F]" />
                  {fmtDate(upcomingVisit.scheduled_at, { weekday: 'long', day: 'numeric', month: 'short' })}
                </div>
                {upcomingVisit.scheduled_at && (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-[#3A3A3C]">
                    <span className="text-[#0E2A1F] text-[11px]">🕐</span>
                    {new Date(upcomingVisit.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-[#F8F5EF] px-5 py-3 flex items-center gap-2">
              <CheckCircle2 size={12} className="text-green-600 shrink-0" />
              <span className="text-[11.5px] text-[#6E6E73]">You'll receive a WhatsApp report within 2 hours of the visit.</span>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="p-6 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#F5F0E8] flex items-center justify-center">
                <Calendar size={20} className="text-[#0E2A1F]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#1D1D1F]">No upcoming visits</p>
                <p className="text-[12px] text-[#6E6E73] mt-0.5">Schedule a care visit for your family in India.</p>
              </div>
              <Link to="/dashboard/book"
                className="bg-[#0E2A1F] text-white text-[13px] font-bold px-5 py-2.5 rounded-[14px] no-underline min-h-[44px] flex items-center">
                Book a visit →
              </Link>
            </div>
          </Card>
        )}
      </Section>

      {/* ══ 5. My Family ════════════════════════════════════════════════ */}
      {isNri && (
        <Section label="My Family">
          <div className="flex flex-col gap-3">
            {lovedOnes.length === 0 && editingMemberId !== 'new' && (
              <Card>
                <div className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="text-4xl">👨‍👩‍👴</div>
                  <p className="text-[14px] font-semibold text-[#1D1D1F]">Add your family members in India</p>
                  <p className="text-[12.5px] text-[#6E6E73]">Their details help us provide better care and health reports.</p>
                  <button onClick={() => { setForms(f => ({ ...f, new: { ...BLANK_FORM } })); setEditingMemberId('new') }}
                    className="bg-[#0E2A1F] text-white text-[13px] font-bold px-5 py-3 rounded-[14px] min-h-[44px] flex items-center gap-2">
                    <Plus size={15} /> Add family member
                  </button>
                </div>
              </Card>
            )}

            {lovedOnes.map(lo => {
              const ep = elderProfiles[lo.id]
              const isEditing = editingMemberId === lo.id
              const form = forms[lo.id]

              if (isEditing && form) return (
                <Card key={lo.id}>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[15px] font-bold text-[#1D1D1F]">Edit {lo.full_name}</p>
                      <div className="flex gap-2">
                        <button onClick={cancelEdit} className="flex items-center gap-1 text-[12px] text-[#6E6E73] border border-[#E5E5EA] rounded-[10px] px-3 py-2 min-h-[36px]">
                          <X size={11} /> Cancel
                        </button>
                        <button onClick={() => saveMember(lo.id)} disabled={savingId === lo.id}
                          className="flex items-center gap-1 text-[12px] bg-[#0E2A1F] text-white rounded-[10px] px-3 py-2 min-h-[36px] disabled:opacity-60">
                          {savingId === lo.id ? <Loader2 size={11} className="ce-spin" /> : <Save size={11} />}
                          Save
                        </button>
                      </div>
                    </div>
                    <MemberFormFields form={form} setForm={fn => setMemberForm(lo.id, fn)} />
                    {memberErr[lo.id] && <p className="text-[12px] text-red-600 mt-3">{memberErr[lo.id]}</p>}
                  </div>
                </Card>
              )

              return (
                <Card key={lo.id}>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-[14px] bg-[#F3EFE8] flex items-center justify-center text-2xl shrink-0">
                      {memberEmoji(lo.relationship)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[15px] font-bold text-[#1D1D1F] truncate">{lo.full_name}</p>
                        {lo.relationship && <span className="text-[10.5px] text-[#6E6E73] border border-[#EDE8E0] rounded-full px-2 py-0.5 shrink-0">{lo.relationship}</span>}
                      </div>
                      <p className="text-[12px] text-[#6E6E73] mt-0.5 truncate">
                        {[ep?.age && `${ep.age} yrs`, lo.city].filter(Boolean).join(' · ') || 'Tap edit to add details'}
                      </p>
                      {ep?.medical_conditions && (
                        <p className="text-[11.5px] text-[#0E6B35] font-medium mt-0.5 truncate">
                          {ep.medical_conditions.split(',').slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>
                    <button onClick={() => setEditingMemberId(lo.id)} aria-label="Edit member"
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F0E8] text-[#0E2A1F] shrink-0 min-w-[32px]">
                      <Edit2 size={13} />
                    </button>
                  </div>

                  {/* Expandable health */}
                  <div className="border-t border-[#F5F0E8]">
                    <button onClick={() => setExpandedHealth(p => ({ ...p, [lo.id]: !p[lo.id] }))}
                      className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] text-[12.5px] font-semibold text-[#0E2A1F]">
                      <span className="flex items-center gap-2"><Stethoscope size={13} /> Health details</span>
                      {expandedHealth[lo.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>

                  {expandedHealth[lo.id] && (
                    <div className="px-4 pb-4 flex flex-col gap-3 text-[13px] border-t border-[#F5F0E8]">
                      {ep?.medical_conditions && (
                        <div className="pt-3">
                          <p className="text-[10px] uppercase tracking-widest text-[#6E6E73] font-bold mb-1">Conditions</p>
                          <p className="text-[#3A3A3C]">{ep.medical_conditions}</p>
                        </div>
                      )}
                      {Array.isArray(ep?.current_medications) && ep.current_medications.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-[#6E6E73] font-bold mb-1">Medications</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ep.current_medications.map((m, i) => (
                              <span key={i} className="bg-[#F5F0E8] text-[#3A3A3C] text-[11.5px] px-2.5 py-1 rounded-full">{medLabel(m)}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {ep?.allergies && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-[#6E6E73] font-bold mb-1">Allergies</p>
                          <p className="text-[#3A3A3C]">{ep.allergies}</p>
                        </div>
                      )}
                      {ep?.doctor_name && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-[#6E6E73] font-bold mb-1">Doctor</p>
                          <p className="text-[#3A3A3C]">{ep.doctor_name}{ep.doctor_phone ? ` · ${ep.doctor_phone}` : ''}</p>
                        </div>
                      )}
                      {Array.isArray(ep?.emergency_contacts) && ep.emergency_contacts.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-[#6E6E73] font-bold mb-1">Emergency contacts</p>
                          {ep.emergency_contacts.map((ec, i) => (
                            <p key={i} className="text-[#3A3A3C]">{[ec.name, ec.relationship, ec.phone].filter(Boolean).join(' · ')}</p>
                          ))}
                        </div>
                      )}
                      {!ep?.medical_conditions && !ep?.doctor_name && (
                        <p className="text-[12px] text-[#6E6E73] italic pt-3">No health details — tap edit to add.</p>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}

            {editingMemberId === 'new' && forms.new && (
              <Card>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[15px] font-bold text-[#1D1D1F]">Add family member</p>
                    <button onClick={cancelEdit} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F0E8] text-[#6E6E73]"><X size={14} /></button>
                  </div>
                  <MemberFormFields form={forms.new} setForm={fn => setMemberForm('new', fn)} />
                  {memberErr.new && <p className="text-[12px] text-red-600 mt-3">{memberErr.new}</p>}
                  <button onClick={() => saveMember('new')} disabled={savingId === 'new'}
                    className="mt-5 w-full bg-[#0E2A1F] text-white text-[14px] font-bold rounded-[16px] py-4 min-h-[52px] flex items-center justify-center gap-2 disabled:opacity-60">
                    {savingId === 'new' ? <><Loader2 size={15} className="ce-spin" /> Adding…</> : 'Add family member →'}
                  </button>
                </div>
              </Card>
            )}

            {editingMemberId !== 'new' && lovedOnes.length > 0 && (
              <button onClick={() => { setForms(f => ({ ...f, new: { ...BLANK_FORM } })); setEditingMemberId('new') }}
                className="w-full flex items-center justify-center gap-2 bg-white text-[#0E2A1F] text-[13px] font-semibold border-2 border-dashed border-[#D8D3CA] rounded-[20px] py-4 min-h-[52px]">
                <Plus size={15} /> Add another family member
              </button>
            )}
          </div>
        </Section>
      )}

      {/* ══ 6. Care summary ═════════════════════════════════════════════ */}
      <Section label="Care summary">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <CheckCircle2 size={17} />, lbl: 'Visits done', val: completedCount },
            { icon: <Calendar size={17} />, lbl: 'Confirmed', val: confirmedCount },
            { icon: <FileText size={17} />, lbl: 'Total booked', val: bookings.length },
            { icon: <MessageCircle size={17} />, lbl: 'AI questions', val: '—' },
            { icon: <FileText size={17} />, lbl: 'Reports sent', val: completedCount },
            { icon: <Shield size={17} />, lbl: 'Emergency', val: 0 },
          ].map(s => (
            <div key={s.lbl} className="bg-white rounded-[18px] p-4 shadow-[0_2px_10px_rgba(0,0,0,.05)] text-center">
              <div className="flex justify-center mb-2 text-[#0E2A1F]">{s.icon}</div>
              <p className="text-[22px] font-bold text-[#0E2A1F] leading-none">{s.val}</p>
              <p className="text-[10.5px] text-[#6E6E73] mt-1 leading-tight">{s.lbl}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ══ 7. Recent activity ══════════════════════════════════════════ */}
      <Section label="Recent activity">
        <Card>
          {recentActivity.length === 0 ? (
            <div className="p-5 text-center text-[13px] text-[#6E6E73]">No activity yet — book your first visit.</div>
          ) : (
            <div className="divide-y divide-[#F8F5EF]">
              {recentActivity.map(b => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${b.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-[#F5F0E8] text-[#0E2A1F]'}`}>
                    {activityIcon(b.service_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1D1D1F] truncate">{b.service_name}</p>
                    <p className="text-[11px] text-[#6E6E73]">{fmtRel(b.created_at)}</p>
                  </div>
                  <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full shrink-0 ${statusPill(b.status)}`}>
                    {statusLabel(b.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {bookings.length > 6 && (
            <div className="border-t border-[#F8F5EF] px-4 py-3">
              <Link to="/dashboard/bookings" className="text-[13px] font-semibold text-[#0E2A1F] no-underline flex items-center gap-1">
                View full history <ChevronRight size={13} />
              </Link>
            </div>
          )}
        </Card>
      </Section>

      {/* ══ 8. Care score ═══════════════════════════════════════════════ */}
      <Section label="Care score">
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-5 mb-5">
              <div className="relative shrink-0">
                <CareScoreRing score={careScore} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[22px] font-bold text-[#0E2A1F]">{careScore}%</span>
                  <span className="text-[9px] uppercase tracking-widest text-[#6E6E73]">Score</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-bold text-[#1D1D1F] mb-1">
                  {careScore >= 80 ? 'Excellent care setup' : careScore >= 50 ? 'Good progress' : 'Just getting started'}
                </p>
                <p className="text-[12px] text-[#6E6E73] leading-relaxed">
                  {careScore >= 100 ? 'Your family profile is fully complete.' : 'Complete the steps below to improve your score.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {careItems.map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-green-100' : 'bg-[#F5F0E8]'}`}>
                    {item.done
                      ? <Check size={10} className="text-green-700" strokeWidth={3} />
                      : <AlertCircle size={10} className="text-[#AEAEAE]" />}
                  </div>
                  <span className={`text-[12.5px] ${item.done ? 'text-[#3A3A3C]' : 'text-[#AEAEAE]'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Section>

      {/* ══ 9. Account settings ═════════════════════════════════════════ */}
      <Section label="Your account">
        {!editingAcct ? (
          <Card>
            <div className="divide-y divide-[#F8F5EF]">
              {([
                { lbl: 'Name', val: profile?.full_name },
                { lbl: 'WhatsApp', val: profile?.whatsapp_number },
                { lbl: 'Email', val: user?.email },
                { lbl: 'Country', val: profile?.country },
                { lbl: 'Address', val: profile?.address },
              ] as { lbl: string; val: string | null | undefined }[]).filter(r => r.val).map(r => (
                <div key={r.lbl} className="flex items-center justify-between px-4 py-3.5 gap-3">
                  <span className="text-[13px] text-[#6E6E73] shrink-0">{r.lbl}</span>
                  <span className="text-[13px] font-semibold text-[#1D1D1F] text-right truncate max-w-[60%]">{r.val}</span>
                </div>
              ))}
            </div>
            {acctSaved && (
              <div className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-green-700 font-semibold border-t border-[#F8F5EF]">
                <Check size={12} /> Saved successfully
              </div>
            )}
            <div className="border-t border-[#F8F5EF] px-4 py-3">
              <button onClick={() => { setEditingAcct(true); setAcctSaved(false) }}
                className="flex items-center gap-1.5 text-[13px] font-bold text-[#0E2A1F] min-h-[36px]">
                <Edit2 size={12} /> Edit details
              </button>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[15px] font-bold text-[#1D1D1F]">Edit your details</p>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingAcct(false); setAcctErr('') }}
                    className="flex items-center gap-1 text-[12px] text-[#6E6E73] border border-[#E5E5EA] rounded-[10px] px-3 py-2 min-h-[36px]">
                    <X size={11} /> Cancel
                  </button>
                  <button onClick={saveAcct} disabled={savingAcct}
                    className="flex items-center gap-1 text-[12px] bg-[#0E2A1F] text-white rounded-[10px] px-3 py-2 min-h-[36px] disabled:opacity-60">
                    {savingAcct ? <Loader2 size={11} className="ce-spin" /> : <Save size={11} />}
                    Save
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div><label className={LBL}>Full name</label>
                  <input className={INP} value={acctForm.full_name} onChange={e => setAcctForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full name" /></div>
                <div><label className={LBL}>Email</label>
                  <input className={INP + ' opacity-50 cursor-not-allowed'} value={user?.email || ''} disabled /></div>
                <div>
                  <label className={LBL}>WhatsApp number *</label>
                  <PhoneInput value={acctForm.whatsapp_number} onChange={v => setAcctForm(f => ({ ...f, whatsapp_number: v }))} />
                  <p className="text-[11px] text-[#6E6E73] mt-1">Visit reports are sent here.</p>
                </div>
                <div><label className={LBL}>Where you live</label>
                  <input className={INP} value={acctForm.country} onChange={e => setAcctForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. USA, UK, UAE…" /></div>
                <div>
                  <label className={LBL}>Your address (optional)</label>
                  <AddressInput value={acctForm.address} onChange={v => setAcctForm(f => ({ ...f, address: v }))} placeholder="Auto-fills booking forms" />
                </div>
              </div>
              {acctErr && <p className="text-[12px] text-red-600 mt-3">{acctErr}</p>}
            </div>
          </Card>
        )}
      </Section>

      {/* ══ 10. Notifications ════════════════════════════════════════════ */}
      <Section label="Notifications">
        <Card>
          <div className="divide-y divide-[#F8F5EF]">
            {([
              { key: 'whatsapp', icon: <MessageCircle size={15} />, lbl: 'WhatsApp updates', sub: 'Visit reports & booking confirmations' },
              { key: 'email', icon: <Bell size={15} />, lbl: 'Email notifications', sub: 'Summaries & important alerts' },
              { key: 'push', icon: <Bell size={15} />, lbl: 'Push notifications', sub: 'Real-time visit alerts on your phone' },
              { key: 'medicine', icon: <Pill size={15} />, lbl: 'Medicine reminders', sub: 'Confirm your parent has taken meds' },
              { key: 'visit', icon: <Calendar size={15} />, lbl: 'Visit reminders', sub: '2 hours before each scheduled visit' },
              { key: 'emergency', icon: <Shield size={15} />, lbl: 'Emergency alerts', sub: 'Instant alerts — always recommended' },
              { key: 'weekly', icon: <FileText size={15} />, lbl: 'Weekly reports', sub: 'Summary every Sunday morning' },
            ] as { key: keyof NotifPrefs; icon: React.ReactNode; lbl: string; sub: string }[]).map(n => (
              <div key={n.key} className="flex items-center gap-3 px-4 py-3.5 min-h-[60px]">
                <div className="w-8 h-8 rounded-[10px] bg-[#F5F0E8] flex items-center justify-center text-[#0E2A1F] shrink-0">{n.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#1D1D1F]">{n.lbl}</p>
                  <p className="text-[11px] text-[#6E6E73]">{n.sub}</p>
                </div>
                <Toggle on={notifs[n.key]} onToggle={() => toggleNotif(n.key)} label={n.lbl} />
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* ══ 11. Payments ════════════════════════════════════════════════ */}
      <Section label="Payments & billing">
        <Card>
          <div className="p-4 flex items-center gap-3 border-b border-[#F8F5EF]">
            <div className="w-10 h-10 rounded-[12px] bg-[#0E2A1F] flex items-center justify-center shrink-0">
              <Star size={15} fill="#A8D5B5" color="#A8D5B5" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-[#1D1D1F]">{isFounder ? 'Founding Member' : 'Standard Plan'}</p>
              <p className="text-[11.5px] text-[#6E6E73]">
                {profile?.founding_date ? `Since ${fmtDate(profile.founding_date, { month: 'long', year: 'numeric' })}` : 'Active'}
              </p>
            </div>
            <span className="text-[11px] font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Active</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F8F5EF]">
            <div className="w-10 h-10 rounded-[12px] bg-[#F5F0E8] flex items-center justify-center shrink-0 text-[#0E2A1F]">
              <CreditCard size={16} />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[#1D1D1F]">Payment method</p>
              <p className="text-[11.5px] text-[#6E6E73]">Manage via receipts</p>
            </div>
            <ChevronRight size={14} className="text-[#C5C5C7]" />
          </div>
          <Link to="/dashboard/bookings" className="flex items-center gap-3 px-4 py-3.5 no-underline min-h-[52px]">
            <div className="w-10 h-10 rounded-[12px] bg-[#F5F0E8] flex items-center justify-center shrink-0 text-[#0E2A1F]">
              <FileText size={16} />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[#1D1D1F]">Invoices &amp; receipts</p>
              <p className="text-[11.5px] text-[#6E6E73]">View all transactions</p>
            </div>
            <ChevronRight size={14} className="text-[#C5C5C7]" />
          </Link>
        </Card>
      </Section>

      {/* ══ 12. Referral ════════════════════════════════════════════════ */}
      <Section label="Refer & earn">
        <div className="rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(14,42,31,.15)]"
          style={{ background: 'linear-gradient(135deg, #1B4332 0%, #0E2A1F 100%)' }}>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <Award size={24} color="#A8D5B5" />
              <div>
                <p className="text-[16px] font-bold text-white leading-tight">Invite a family</p>
                <p className="text-[12px] text-[#A8D5B5]">Earn one free Home Visit</p>
              </div>
            </div>
            <p className="text-[13px] text-white/70 mb-4 leading-relaxed">
              Know another NRI family with parents in India? They get ₹500 off their first visit — you earn a free visit.
            </p>
            <button onClick={copyReferral}
              className="w-full flex items-center justify-center gap-2 bg-[#A8D5B5] text-[#0E2A1F] rounded-[16px] py-3 text-[13px] font-bold min-h-[44px] mb-2">
              {copied ? <><Check size={14} /> Link copied!</> : <><Copy size={14} /> Copy referral link</>}
            </button>
            <button className="w-full flex items-center justify-center gap-2 border border-[#A8D5B5]/40 text-[#A8D5B5] rounded-[16px] py-3 text-[13px] font-bold min-h-[44px]">
              <Share2 size={14} /> Share on WhatsApp
            </button>
          </div>
        </div>
      </Section>

      {/* ══ 13. Help & support ══════════════════════════════════════════ */}
      <Section label="Help & support">
        <Card>
          {[
            { icon: <MessageCircle size={15} />, lbl: 'WhatsApp the care team', href: 'https://wa.me/919000221261' },
            { icon: <Phone size={15} />, lbl: 'Call us', href: 'tel:+919000221261' },
            { icon: <HelpCircle size={15} />, lbl: 'Help & FAQ', href: 'https://closeeye.in/faq' },
            { icon: <Shield size={15} />, lbl: 'Privacy Policy', href: 'https://closeeye.in/privacy' },
            { icon: <FileText size={15} />, lbl: 'Terms of Service', href: 'https://closeeye.in/terms' },
          ].map((item, i, arr) => (
            <a key={item.lbl} href={item.href} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-3 px-4 py-3.5 min-h-[52px] no-underline ${i < arr.length - 1 ? 'border-b border-[#F8F5EF]' : ''}`}>
              <div className="w-9 h-9 rounded-[10px] bg-[#F5F0E8] flex items-center justify-center text-[#0E2A1F] shrink-0">{item.icon}</div>
              <span className="flex-1 text-[13px] font-medium text-[#1D1D1F]">{item.lbl}</span>
              <ChevronRight size={14} className="text-[#C5C5C7]" />
            </a>
          ))}
        </Card>

        <Card className="mt-3">
          <button onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 min-h-[52px] text-[13px] font-bold text-[#C53030]">
            <LogOut size={15} /> Sign out
          </button>
        </Card>

        <button className="w-full flex items-center justify-center gap-2 mt-3 py-3 text-[12px] text-[#AEAEAE] min-h-[44px]">
          <Trash2 size={12} /> Delete my account
        </button>
      </Section>

      <p className="text-[11px] text-[#AEAEAE] text-center px-8 py-5 leading-relaxed">
        Your family's information is private and used only to provide care.
      </p>

    </div>
  )
}
