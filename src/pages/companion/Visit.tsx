import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import {
  Camera, X, MapPin, CheckCircle2, Clock, Loader2, AlertTriangle,
  ArrowLeft, Heart, Utensils, Pill, Home, AlertCircle,
  Calendar, Send, Check,
} from 'lucide-react'
import { format, differenceInMinutes, startOfMonth, endOfMonth } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = 'briefing' | 'tier1' | 'tier2' | 'tier3_prompt' | 'tier3' | 'post_update' | 'report'

interface Tier1 {
  mood:       boolean | null
  eating:     boolean | null
  medicines:  boolean | null
  home:       boolean | null
  concerns:   boolean | null
  one_moment: string
}

interface Tier2 {
  mood_loneliness?:  boolean
  mood_confusion?:   boolean
  mood_repetitive?:  boolean
  mood_refused?:     boolean
  eating_last_meal?: string
  eating_fridge?:    boolean
  eating_dehydration?: boolean
  eating_nausea?:    boolean
  med_which_missed?: string
  med_stock_low?:    boolean
  med_doctor_overdue?: boolean
  med_new_symptoms?: boolean
  home_safety_issue?: string
  home_cleanliness?: boolean
  home_maintenance?: boolean
  home_fraud?:       boolean
  concerns_text?:    string
  concerns_urgency?: 'monitor' | 'urgent'
}

interface Tier3 {
  bp_reading?:       string
  weight_change?:    boolean | null
  wounds?:           boolean | null
  mental_sharpness?: boolean | null
  social_active?:    boolean | null
  assessment?:       string
  _photos?:          { file: File; url: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_PHOTO_MB   = 5
const MIN_VISIT_MINS = 30

function getGPS(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      p  => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 10_000, enableHighAccuracy: true },
    )
  })
}

function deriveMoodScore(t1: Tier1): number {
  const no = [t1.mood, t1.eating, t1.medicines, t1.home].filter(v => v === false).length
  return Math.max(1, 5 - no)
}

function deriveFlags(t1: Tier1, t2: Tier2): 'none' | 'monitor' | 'urgent' {
  if (t2.concerns_urgency === 'urgent') return 'urgent'
  const anyNo = [t1.mood, t1.eating, t1.medicines, t1.home].some(v => v === false)
  if (t1.concerns === true || anyNo) return 'monitor'
  return 'none'
}

function buildFlagSummary(t1: Tier1, t2: Tier2): string {
  const lines: string[] = []
  if (t1.mood === false) {
    if (t2.mood_loneliness) lines.push('Expressed loneliness or sadness')
    if (t2.mood_confusion)  lines.push('Confusion or memory issues observed')
    if (t2.mood_repetitive) lines.push('Repetitive questions / disorientation')
    if (t2.mood_refused)    lines.push('Refused company or conversation')
  }
  if (t1.eating === false) {
    if (t2.eating_last_meal)     lines.push(`Last meal: ${t2.eating_last_meal}`)
    if (t2.eating_dehydration)   lines.push('Signs of dehydration')
    if (t2.eating_nausea)        lines.push('Nausea or appetite loss mentioned')
    if (t2.eating_fridge)        lines.push('Fridge not stocked')
  }
  if (t1.medicines === false) {
    if (t2.med_which_missed)     lines.push(`Medicines missed: ${t2.med_which_missed}`)
    if (t2.med_stock_low)        lines.push('Medicine stock running low')
    if (t2.med_doctor_overdue)   lines.push('Doctor visit overdue')
    if (t2.med_new_symptoms)     lines.push('New symptoms since last visit')
  }
  if (t1.home === false) {
    if (t2.home_safety_issue)    lines.push(`Safety issue: ${t2.home_safety_issue}`)
    if (t2.home_cleanliness)     lines.push('Cleanliness needs attention')
    if (t2.home_maintenance)     lines.push('Maintenance required')
    if (t2.home_fraud)           lines.push('Elder fraud concern — someone asking for money')
  }
  return lines.join('\n') || 'See companion notes.'
}

function generateWhatsAppReport(params: {
  elderName:     string
  companionName: string
  startTime:     Date
  endTime:       Date
  t1:            Tier1
  t2:            Tier2 | null
  flags:         'none' | 'monitor' | 'urgent'
}): string {
  const { elderName, companionName, startTime, endTime, t1, t2, flags } = params
  const date     = format(startTime, 'dd MMM yyyy')
  const dur      = differenceInMinutes(endTime, startTime)
  const durLabel = dur >= 60 ? `${Math.floor(dur / 60)}h ${dur % 60}m` : `${dur}m`
  const e = (v: boolean | null) => v === true ? '✅' : v === false ? '❌' : '—'
  const w = (v: boolean | null, good: string, bad: string) => v === true ? good : v === false ? bad : '—'

  const summary =
    flags === 'none'   ? `${elderName} was in good spirits today. The visit went smoothly — comfortable, well-fed, and at ease.` :
    flags === 'urgent' ? `⚠️ A concern that needs your immediate attention came up during today's visit. Please read below.` :
                         `Today's visit went mostly well. A couple of things worth keeping an eye on — details below.`

  const flagSection = flags !== 'none' && t2
    ? `\n*⚠️ Needs your attention:*\n${t2.concerns_text || buildFlagSummary(t1, t2)}\n`
    : ''

  return `*Close Eye Visit Report — ${elderName}*
📅 ${date} | ⏱ ${durLabel}

*How they are today:*
${summary}

*Health snapshot:*
Mood: ${e(t1.mood)} ${w(t1.mood, 'Good', 'Low')}
Eating: ${e(t1.eating)} ${w(t1.eating, 'Well', 'Concern')}
Medicines: ${e(t1.medicines)} ${w(t1.medicines, 'Taken', 'Missed')}
Home: ${e(t1.home)} ${w(t1.home, 'Safe & clean', 'Check needed')}
${flagSection}
*From today's visit:*
${t1.one_moment}

Questions? Reply here.
— Close Eye 🌿 | Visited by ${companionName}`
}

// ─── Reusable UI pieces ───────────────────────────────────────────────────────

function GpsCapture({
  gps, loading, error, onCapture,
}: { gps: { lat: number; lng: number } | null; loading: boolean; error: string; onCapture: () => void }) {
  return (
    <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
      <MapPin size={18} className={`mt-0.5 flex-shrink-0 ${gps ? 'text-green-600' : 'text-gray-400'}`} />
      <div className="flex-1 min-w-0">
        {gps ? (
          <>
            <p className="text-xs font-semibold text-green-700 mb-0.5">GPS captured</p>
            <p className="text-xs text-gray-500 font-mono truncate">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold text-gray-600 mb-0.5">{loading ? 'Capturing location…' : 'Location not captured'}</p>
            {error && <p className="text-xs text-amber-600">{error}</p>}
          </>
        )}
      </div>
      {!gps && (
        <button type="button" onClick={onCapture} disabled={loading}
          className="text-xs font-semibold text-green-700 disabled:text-gray-400 whitespace-nowrap">
          {loading ? 'Capturing…' : 'Capture GPS'}
        </button>
      )}
    </div>
  )
}

function PhotoPicker({
  label, photos, onAdd, onRemove, max, error, single = false,
}: {
  label: string; photos: { file: File; url: string }[];
  onAdd: (f: FileList) => void; onRemove: (i: number) => void;
  max: number; error: string; single?: boolean
}) {
  return (
    <div className="space-y-3">
      {label && <p className="text-xs font-semibold text-green-900">{label}</p>}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photos.map((p, i) => (
            <div key={p.url} className="relative w-20 h-20">
              <img src={p.url} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-100" />
              <button type="button" onClick={() => onRemove(i)}
                className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      {photos.length < max && (
        <label className="inline-flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 cursor-pointer hover:border-green-300 hover:text-green-700 transition-colors min-h-[44px]">
          <Camera size={16} />
          {photos.length === 0 ? 'Add photo' : 'Add more'}
          <input type="file" accept="image/*" multiple={!single} capture="environment" className="sr-only"
            onChange={e => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = '' }} />
        </label>
      )}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}

function BoolRow({ label, value, onChange }: {
  label: string; value: boolean | undefined; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700 flex-1 leading-snug">{label}</span>
      <div className="flex gap-2 flex-shrink-0">
        <button type="button" onClick={() => onChange(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors min-h-[36px] min-w-[44px] ${
            value === true ? 'bg-amber-50 border-amber-400 text-amber-700' : 'border-gray-200 text-gray-400'}`}>
          Yes
        </button>
        <button type="button" onClick={() => onChange(false)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors min-h-[36px] min-w-[44px] ${
            value === false ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-200 text-gray-400'}`}>
          No
        </button>
      </div>
    </div>
  )
}

// ─── Tier 1 ───────────────────────────────────────────────────────────────────

const T1_QUESTIONS: { key: keyof Omit<Tier1, 'one_moment'>; label: string; icon: React.ReactNode }[] = [
  { key: 'mood',      label: 'Mood & spirits good?',        icon: <Heart size={20} />        },
  { key: 'eating',    label: 'Eating and hydrated well?',   icon: <Utensils size={20} />     },
  { key: 'medicines', label: 'Medicines taken on schedule?', icon: <Pill size={20} />        },
  { key: 'home',      label: 'Home safe and clean?',        icon: <Home size={20} />         },
  { key: 'concerns',  label: 'Any concerns to flag?',       icon: <AlertCircle size={20} />  },
]

function Tier1Screen({ onNext }: { onNext: (t1: Tier1) => void }) {
  const [ans, setAns] = useState<Tier1>({ mood: null, eating: null, medicines: null, home: null, concerns: null, one_moment: '' })
  const [err, setErr] = useState('')

  function toggle(key: keyof Omit<Tier1, 'one_moment'>, val: boolean) {
    setAns(p => ({ ...p, [key]: p[key] === val ? null : val }))
  }

  function submit() {
    if (T1_QUESTIONS.some(q => ans[q.key] === null)) { setErr('Please answer all questions.'); return }
    if (!ans.one_moment.trim()) { setErr("Please share one moment from today's visit."); return }
    setErr(''); onNext(ans)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-1">Quick Check</p>
        <h2 className="font-serif text-xl text-green-900">How was today's visit?</h2>
        <p className="text-xs text-gray-400 mt-0.5">Tap Yes or No for each — takes 2 minutes</p>
      </div>

      <div className="space-y-3">
        {T1_QUESTIONS.map(({ key, label, icon }) => {
          const val         = ans[key]
          const isConcerns  = key === 'concerns'
          return (
            <div key={key} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-green-600">{icon}</span>
                <p className="font-semibold text-green-900 text-sm flex-1 leading-snug">{label}</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => toggle(key, true)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-colors min-h-[48px] ${
                    val === true
                      ? isConcerns ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-green-50 border-green-500 text-green-700'
                      : 'border-gray-200 text-gray-400'}`}>
                  {isConcerns ? '⚠️ Yes' : '✓ Yes'}
                </button>
                <button type="button" onClick={() => toggle(key, false)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-colors min-h-[48px] ${
                    val === false
                      ? isConcerns ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-400 text-red-600'
                      : 'border-gray-200 text-gray-400'}`}>
                  {isConcerns ? '✓ No' : '✗ No'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <label className="block text-sm font-semibold text-green-900 mb-1">One Moment *</label>
        <p className="text-xs text-gray-400 mb-3">Share one thing from today's visit</p>
        <textarea
          value={ans.one_moment}
          onChange={e => setAns(p => ({ ...p, one_moment: e.target.value }))}
          rows={2}
          placeholder="e.g. She showed me photos of her grandchildren and lit up talking about them."
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none"
        />
      </div>

      {err && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-sm">
          <AlertTriangle size={15} className="flex-shrink-0" /> {err}
        </div>
      )}

      <button onClick={submit}
        className="w-full bg-green-800 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-colors min-h-[52px]">
        Next →
      </button>
    </div>
  )
}

// ─── Tier 2 ───────────────────────────────────────────────────────────────────

function Tier2Screen({ t1, onNext }: { t1: Tier1; onNext: (t2: Tier2) => void }) {
  const [t2, setT2] = useState<Tier2>({})
  const set = <K extends keyof Tier2>(k: K, v: Tier2[K]) => setT2(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">Expanded Detail</p>
        <h2 className="font-serif text-xl text-green-900">Tell us more</h2>
        <p className="text-xs text-gray-400 mt-0.5">Only the flagged sections are shown</p>
      </div>

      {t1.mood === false && (
        <div className="bg-white rounded-2xl border border-amber-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={16} className="text-amber-600" />
            <p className="font-semibold text-green-900 text-sm">Mood — what did you notice?</p>
          </div>
          <BoolRow label="Expressed loneliness / sadness / anxiety" value={t2.mood_loneliness} onChange={v => set('mood_loneliness', v)} />
          <BoolRow label="Confusion or memory issues observed"       value={t2.mood_confusion}  onChange={v => set('mood_confusion', v)} />
          <BoolRow label="Repetitive questions or disorientation"    value={t2.mood_repetitive} onChange={v => set('mood_repetitive', v)} />
          <BoolRow label="Refused company or conversation"           value={t2.mood_refused}    onChange={v => set('mood_refused', v)} />
        </div>
      )}

      {t1.eating === false && (
        <div className="bg-white rounded-2xl border border-amber-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Utensils size={16} className="text-amber-600" />
            <p className="font-semibold text-green-900 text-sm">Eating & hydration details</p>
          </div>
          <div className="py-2.5 border-b border-gray-50">
            <label className="text-sm text-gray-700 block mb-1.5">Last meal time</label>
            <input value={t2.eating_last_meal || ''} onChange={e => set('eating_last_meal', e.target.value)}
              placeholder="e.g. Yesterday evening, 7pm"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600" />
          </div>
          <BoolRow label="Fridge not stocked / no food at home" value={t2.eating_fridge}      onChange={v => set('eating_fridge', v)} />
          <BoolRow label="Signs of dehydration"                  value={t2.eating_dehydration} onChange={v => set('eating_dehydration', v)} />
          <BoolRow label="Nausea or appetite loss mentioned"     value={t2.eating_nausea}      onChange={v => set('eating_nausea', v)} />
        </div>
      )}

      {t1.medicines === false && (
        <div className="bg-white rounded-2xl border border-amber-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Pill size={16} className="text-amber-600" />
            <p className="font-semibold text-green-900 text-sm">Medicine details</p>
          </div>
          <div className="py-2.5 border-b border-gray-50">
            <label className="text-sm text-gray-700 block mb-1.5">Which medicines missed?</label>
            <input value={t2.med_which_missed || ''} onChange={e => set('med_which_missed', e.target.value)}
              placeholder="e.g. Morning BP tablet"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600" />
          </div>
          <BoolRow label="Stock running low"             value={t2.med_stock_low}       onChange={v => set('med_stock_low', v)} />
          <BoolRow label="Doctor visit overdue"          value={t2.med_doctor_overdue}  onChange={v => set('med_doctor_overdue', v)} />
          <BoolRow label="New symptoms since last visit" value={t2.med_new_symptoms}    onChange={v => set('med_new_symptoms', v)} />
        </div>
      )}

      {t1.home === false && (
        <div className="bg-white rounded-2xl border border-amber-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Home size={16} className="text-amber-600" />
            <p className="font-semibold text-green-900 text-sm">Home & safety details</p>
          </div>
          <div className="py-2.5 border-b border-gray-50">
            <label className="text-sm text-gray-700 block mb-1.5">Specific safety issue (bathroom / gas / lighting)</label>
            <input value={t2.home_safety_issue || ''} onChange={e => set('home_safety_issue', e.target.value)}
              placeholder="Describe the issue"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600" />
          </div>
          <BoolRow label="Cleanliness needs attention"                        value={t2.home_cleanliness} onChange={v => set('home_cleanliness', v)} />
          <BoolRow label="Maintenance required"                               value={t2.home_maintenance} onChange={v => set('home_maintenance', v)} />
          <BoolRow label="Elder fraud concern (someone asking for money)"     value={t2.home_fraud}       onChange={v => set('home_fraud', v)} />
        </div>
      )}

      {t1.concerns === true && (
        <div className="bg-white rounded-2xl border border-red-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-red-500" />
            <p className="font-semibold text-green-900 text-sm">Concern details</p>
          </div>
          <label className="text-sm text-gray-700 block mb-1.5">What is the concern?</label>
          <textarea value={t2.concerns_text || ''} onChange={e => set('concerns_text', e.target.value)}
            rows={3} placeholder="Describe what you observed or heard..."
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none mb-3" />
          <label className="text-sm font-semibold text-gray-700 block mb-2">Urgency</label>
          <div className="flex gap-3">
            <button type="button" onClick={() => set('concerns_urgency', 'monitor')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-colors min-h-[48px] ${
                t2.concerns_urgency === 'monitor' ? 'bg-amber-50 border-amber-400 text-amber-700' : 'border-gray-200 text-gray-400'}`}>
              🟡 Monitor
            </button>
            <button type="button" onClick={() => set('concerns_urgency', 'urgent')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-colors min-h-[48px] ${
                t2.concerns_urgency === 'urgent' ? 'bg-red-50 border-red-400 text-red-600' : 'border-gray-200 text-gray-400'}`}>
              🔴 Urgent
            </button>
          </div>
        </div>
      )}

      <button onClick={() => onNext(t2)}
        className="w-full bg-green-800 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-colors min-h-[52px]">
        Continue →
      </button>
    </div>
  )
}

// ─── Tier 3 ───────────────────────────────────────────────────────────────────

function Tier3Screen({ onNext, onDefer }: { onNext: (t3: Tier3) => void; onDefer: () => void }) {
  const [t3,      setT3]      = useState<Tier3>({})
  const [photos,  setPhotos]  = useState<{ file: File; url: string }[]>([])
  const [photoErr,setPhotoErr]= useState('')
  const set = <K extends keyof Tier3>(k: K, v: Tier3[K]) => setT3(p => ({ ...p, [k]: v }))

  function addPhoto(files: FileList) {
    setPhotoErr('')
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) { setPhotoErr('Images only.'); continue }
      if (f.size > MAX_PHOTO_MB * 1024 * 1024) { setPhotoErr(`Max ${MAX_PHOTO_MB} MB.`); continue }
      setPhotos(prev => prev.length < 2 ? [...prev, { file: f, url: URL.createObjectURL(f) }] : prev)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-1">Monthly Deep Check</p>
        <h2 className="font-serif text-xl text-green-900">Health indicators</h2>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-1">
        <div className="pb-2.5 border-b border-gray-50">
          <label className="text-sm text-gray-700 block mb-1.5">BP reading (if device available)</label>
          <input value={t3.bp_reading || ''} onChange={e => set('bp_reading', e.target.value)}
            placeholder="e.g. 130/80"
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600" />
        </div>
        <BoolRow label="Weight change noted"                                value={t3.weight_change ?? undefined}    onChange={v => set('weight_change', v)} />
        <BoolRow label="Wounds, bruises, or skin conditions"               value={t3.wounds ?? undefined}           onChange={v => set('wounds', v)} />
        <BoolRow label="Mental sharpness — remembers your name and day"    value={t3.mental_sharpness ?? undefined} onChange={v => set('mental_sharpness', v)} />
        <BoolRow label="Social — leaving house, receiving visitors"        value={t3.social_active ?? undefined}    onChange={v => set('social_active', v)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <label className="block text-sm font-semibold text-green-900 mb-1.5">Overall assessment this month</label>
        <textarea value={t3.assessment || ''} onChange={e => set('assessment', e.target.value)}
          rows={3} placeholder="Your honest overall impression — any changes, trends, things family should know..."
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-green-900 mb-1">Photos (optional, 1–2)</p>
        <PhotoPicker label="" photos={photos} onAdd={addPhoto}
          onRemove={i => { URL.revokeObjectURL(photos[i].url); setPhotos(p => p.filter((_, j) => j !== i)) }}
          max={2} error={photoErr} />
      </div>

      <div className="flex gap-3">
        <button onClick={onDefer}
          className="flex-1 py-4 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-500 min-h-[52px]">
          Defer once
        </button>
        <button onClick={() => onNext({ ...t3, _photos: photos })}
          className="flex-1 bg-green-800 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-colors min-h-[52px]">
          Save & continue →
        </button>
      </div>
    </div>
  )
}

// ─── Post-visit update ────────────────────────────────────────────────────────

function PostVisitUpdateScreen({ elderName, onNext }: { elderName: string; onNext: (note: string | null) => void }) {
  const [note, setNote] = useState('')
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-1">Profile Update</p>
        <h2 className="font-serif text-xl text-green-900">Anything new to note?</h2>
        <p className="text-xs text-gray-400 mt-0.5">About {elderName} — helps future companions be prepared</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <label className="block text-sm font-semibold text-green-900 mb-1.5">New preference, habit, or thing to know</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
          placeholder="e.g. She mentioned she now wakes at 5am for prayers. Prefers no visitors before 9am."
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
        <p className="text-xs text-gray-400 mt-2">Appended to continuity notes with today's date and your name.</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => onNext(null)}
          className="flex-1 py-4 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-500 min-h-[52px]">
          Nothing new — skip
        </button>
        <button onClick={() => onNext(note.trim() || null)}
          className="flex-1 bg-green-800 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-colors min-h-[52px]">
          Save & continue →
        </button>
      </div>
    </div>
  )
}

// ─── Briefing screen ──────────────────────────────────────────────────────────

// Flag → coloured dot used in trend + history rows
const FLAG_DOT: Record<string, string> = { none: '🟢', monitor: '🟡', urgent: '🔴' }

// Continuity notes are stored as one blob, one entry per line
// ("12 Jun 2025 — Companion: note"). Return the last N entries, newest first.
function continuityEntries(notes: string | null | undefined, n = 3): string[] {
  if (!notes) return []
  return notes.split('\n').map(l => l.trim()).filter(Boolean).slice(-n).reverse()
}

function BriefingScreen({
  booking, profile, hasElderProfile, lastFlags, flagTrend, previousVisits, onStart,
}: {
  booking: any; profile: any | null; hasElderProfile: boolean; lastFlags: string | null;
  flagTrend: string[]; previousVisits: any[]; onStart: () => void
}) {
  const lo         = booking.loved_ones
  const name       = profile?.name || lo?.full_name || 'your loved one'
  const age        = profile?.age ?? lo?.age
  const conditions = profile?.medical_conditions || lo?.medical_notes
  const entries    = continuityEntries(profile?.continuity_notes)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Pinned note — most prominent, pinned to the very top */}
      {profile?.pinned_note && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-lg leading-none mt-0.5">📌</span>
          <div>
            <p className="text-xs font-bold text-amber-800 mb-0.5 uppercase tracking-wide">Pinned note</p>
            <p className="text-sm text-amber-900 leading-relaxed font-medium">{profile.pinned_note}</p>
          </div>
        </div>
      )}

      {/* Visiting hero */}
      <div className="bg-gradient-to-br from-green-900 to-green-700 rounded-2xl p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-green-300 mb-2">You are visiting</p>
        <p className="font-serif text-2xl leading-tight mb-1">{name}{age ? `, ${age}` : ''}</p>
        {conditions && <p className="text-green-200 text-sm mt-2 leading-relaxed">{conditions}</p>}
      </div>

      {/* Fallback notice when no full elder profile exists yet */}
      {!hasElderProfile && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            Full elder profile not set up yet — contact admin. Showing basic details only.
          </p>
        </div>
      )}

      {/* Last visit flag */}
      {lastFlags && lastFlags !== 'none' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-800 mb-0.5">Last visit had a flag</p>
            <p className="text-sm text-amber-700">
              {lastFlags === 'urgent' ? '🔴 Urgent concern was noted' : '🟡 A concern was being monitored'}
            </p>
          </div>
        </div>
      )}

      {/* Flag trend — last up-to-4 visits as coloured dots */}
      {flagTrend.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-green-900 mb-2">Last {flagTrend.length} visit{flagTrend.length > 1 ? 's' : ''}</p>
          <div className="flex gap-2">
            {flagTrend.map((f, i) => <span key={i} className="text-xl">{FLAG_DOT[f] || '🟢'}</span>)}
          </div>
        </div>
      )}

      {/* Continuity notes — last 3 entries, newest first */}
      {entries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-green-900 mb-2">Continuity notes</p>
          <div className="space-y-2">
            {entries.map((e, i) => (
              <p key={i} className="text-sm text-gray-600 leading-relaxed border-l-2 border-green-200 pl-3">{e}</p>
            ))}
          </div>
        </div>
      )}

      {/* Things to avoid */}
      {profile?.things_to_avoid && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-700 mb-1">⚠️ Things to avoid</p>
          <p className="text-sm text-red-700 leading-relaxed">{profile.things_to_avoid}</p>
        </div>
      )}

      {/* Previous visits with this elder — last 5, by any companion */}
      {previousVisits.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-green-900 mb-2">Previous visits with {profile?.name || lo?.full_name || 'them'}</p>
          <div className="space-y-2.5">
            {previousVisits.map(v => (
              <div key={v.id} className="flex items-start gap-2 text-sm">
                <span className="leading-none mt-0.5">{FLAG_DOT[v.flags] || '🟢'}</span>
                <p className="text-gray-700 min-w-0">
                  <span className="font-medium">{format(new Date(v.end_time || v.created_at), 'dd MMM yyyy')}</span>
                  {v.one_moment && <span className="text-gray-500"> — {v.one_moment}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onStart}
        className="w-full bg-green-800 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-colors min-h-[52px] text-base">
        Start Visit →
      </button>
    </div>
  )
}

// ─── Report screen ────────────────────────────────────────────────────────────

function ReportScreen({
  report, flags, onSend, sending, sent,
}: { report: string; flags: 'none' | 'monitor' | 'urgent'; onSend: () => void; sending: boolean; sent: boolean }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-1">Report Ready</p>
        <h2 className="font-serif text-xl text-green-900">Send to family</h2>
      </div>

      {flags === 'urgent' && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-700 text-sm mb-1">🔴 Urgent flag — call family first</p>
            <p className="text-sm text-red-600">Please call the family before sending this WhatsApp report.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{report}</pre>
      </div>

      <button onClick={onSend} disabled={sending || sent}
        className={`w-full font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[52px] ${
          sent
            ? 'bg-green-100 text-green-700'
            : 'bg-green-800 text-white hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400'
        }`}>
        {sent
          ? <><Check size={18} /> Report sent!</>
          : sending
          ? <><Loader2 size={18} className="animate-spin" /> Sending…</>
          : <><Send size={18} /> Send WhatsApp to family</>}
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CompanionVisit() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const { user, profile: authProfile } = useAuth()
  const navigate      = useNavigate()

  const [booking,        setBooking]        = useState<any>(null)
  const [elderProfile,   setElderProfile]   = useState<any>(null)
  const [lastFlags,      setLastFlags]      = useState<string | null>(null)
  const [flagTrend,      setFlagTrend]      = useState<string[]>([])
  const [previousVisits, setPreviousVisits] = useState<any[]>([])
  const [isFirstOfMonth, setIsFirstOfMonth] = useState(false)
  const [loading,        setLoading]        = useState(true)
  const [loadError,      setLoadError]      = useState<string | null>(null)

  // Check-in state
  const [gps,        setGps]        = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError,   setGpsError]   = useState('')
  const [ciPhotos,   setCiPhotos]   = useState<{ file: File; url: string }[]>([])
  const [ciPhotoErr, setCiPhotoErr] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)
  const [ciError,    setCiError]    = useState('')

  // Post-checkin state
  const [screen,     setScreen]     = useState<Screen>('briefing')
  const [t1Data,     setT1Data]     = useState<Tier1 | null>(null)
  const [t2Data,     setT2Data]     = useState<Tier2 | null>(null)
  const [t3Data,     setT3Data]     = useState<Tier3 | null>(null)
  const startTimeRef = useRef<Date>(new Date())

  const [reportText, setReportText] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')
  const [reportSent, setReportSent] = useState(false)

  // Minimum-duration warning
  const [showDurationWarning, setShowDurationWarning] = useState(false)
  const [shortReason,         setShortReason]         = useState('')
  const [warningMins,         setWarningMins]         = useState(0)
  const [pendingNote,         setPendingNote]         = useState<string | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!user || !bookingId) return
    setLoading(true); setLoadError(null)
    try {
      const { data: b, error: bErr } = await supabase
        .from('bookings')
        .select('*, loved_ones(*)')
        .eq('id', bookingId)
        .eq('companion_id', user.id)
        .single()
      if (bErr) throw bErr
      setBooking(b)

      if (b.loved_one_id) {
        const { data: ep } = await supabase
          .from('elder_profiles')
          .select('*')
          .eq('loved_one_id', b.loved_one_id)
          .maybeSingle()
        setElderProfile(ep || null)

        if (ep?.id) {
          // Last 5 visits for this elder (by ANY companion). Powers the flag
          // trend dots and the "Previous visits with <Name>" briefing list.
          const { data: recentVisits } = await supabase
            .from('visits')
            .select('id, flags, one_moment, tier_completed, start_time, end_time, created_at')
            .eq('elder_id', ep.id)
            .order('created_at', { ascending: false })
            .limit(5)

          if (recentVisits?.length) {
            setLastFlags(recentVisits[0].flags || null)
            setFlagTrend(recentVisits.slice(0, 4).map(v => v.flags || 'none'))
            setPreviousVisits(recentVisits)
          }

          const { count } = await supabase
            .from('visits')
            .select('id', { count: 'exact', head: true })
            .eq('elder_id', ep.id)
            .gte('created_at', startOfMonth(new Date()).toISOString())
            .lte('created_at', endOfMonth(new Date()).toISOString())
          setIsFirstOfMonth((count ?? 0) === 0)
        }
      }
    } catch {
      setLoadError('Could not load visit — please try again.')
    } finally {
      setLoading(false)
    }
  }, [user, bookingId])

  useEffect(() => { load() }, [load])

  const captureGPS = useCallback(async () => {
    setGpsLoading(true); setGpsError('')
    const coords = await getGPS()
    if (coords) setGps(coords)
    else setGpsError('Could not get location. You can still check in without GPS.')
    setGpsLoading(false)
    return coords
  }, [])

  useEffect(() => {
    if (booking && !booking.checked_in_at && !gps) captureGPS()
  }, [booking]) // eslint-disable-line

  // ── Check-in ──────────────────────────────────────────────────────────

  async function handleCheckIn() {
    if (!booking || !user) return
    setCheckingIn(true); setCiError('')
    let coords = gps
    if (!coords) coords = await captureGPS()

    let ciPhotoPath: string | null = null
    if (ciPhotos[0]) {
      const { file } = ciPhotos[0]
      const path = `${booking.id}/checkin-${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('visit-photos').upload(path, file)
      if (error) { setCiError(`Photo upload failed: ${error.message}`); setCheckingIn(false); return }
      ciPhotoPath = path
    }

    const { error } = await supabase.from('bookings').update({
      checked_in_at:       new Date().toISOString(),
      check_in_lat:        coords?.lat ?? null,
      check_in_lng:        coords?.lng ?? null,
      check_in_photo_path: ciPhotoPath,
      status:              'in_progress',
    }).eq('id', booking.id)

    if (error) { setCiError(error.message); setCheckingIn(false); return }
    startTimeRef.current = new Date()
    window.dispatchEvent(new Event('closeeye:active-booking-changed'))
    await load()
    setScreen('briefing')
    setCheckingIn(false)
  }

  // ── Checklist flow ────────────────────────────────────────────────────

  function onTier1Done(t1: Tier1) {
    setT1Data(t1)
    const anyNo = [t1.mood, t1.eating, t1.medicines, t1.home].some(v => v === false) || t1.concerns === true
    if (anyNo)           setScreen('tier2')
    else if (isFirstOfMonth) setScreen('tier3_prompt')
    else                 setScreen('post_update')
  }

  function onTier2Done(t2: Tier2) {
    setT2Data(t2)
    if (isFirstOfMonth) setScreen('tier3_prompt')
    else setScreen('post_update')
  }

  function onTier3Done(t3: Tier3) { setT3Data(t3); setScreen('post_update') }
  function onTier3Defer()          { setScreen('post_update') }

  async function onPostUpdateDone(note: string | null) {
    if (!t1Data) return
    // Gate completion on the recommended minimum visit duration.
    const mins = differenceInMinutes(new Date(), startTimeRef.current)
    if (mins < MIN_VISIT_MINS) {
      setPendingNote(note)
      setWarningMins(mins)
      setShortReason('')
      setShowDurationWarning(true)
      return
    }
    await commitVisit(note, null)
  }

  async function confirmShortVisit() {
    setShowDurationWarning(false)
    await commitVisit(pendingNote, shortReason.trim() || null)
  }

  // Appends the optional continuity note, then writes the visit record.
  async function commitVisit(note: string | null, shortVisitReason: string | null) {
    if (note && elderProfile?.id) {
      const companion = authProfile?.full_name || 'Companion'
      const datePart  = format(new Date(), 'dd MMM yyyy')
      const existing  = elderProfile.continuity_notes || ''
      await supabase
        .from('elder_profiles')
        .update({ continuity_notes: `${existing}\n${datePart} — ${companion}: ${note}` })
        .eq('id', elderProfile.id)
    }
    await finaliseVisit(shortVisitReason)
  }

  async function finaliseVisit(shortVisitReason: string | null = null) {
    if (!booking || !user || !t1Data) return
    setSaving(true); setSaveError('')

    const endTime   = new Date()
    const startTime = startTimeRef.current
    const flags     = deriveFlags(t1Data, t2Data || {})
    const moodScore = deriveMoodScore(t1Data)

    // Upload tier-3 photos
    const tier3PhotoUrls: string[] = []
    const t3Photos: { file: File; url: string }[] = (t3Data as any)?._photos || []
    for (const { file } of t3Photos) {
      const path = `${booking.id}/monthly-${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('visit-photos').upload(path, file)
      if (!error) tier3PhotoUrls.push(path)
    }

    const checkOutGps = await getGPS()
    const checkOutAt  = endTime.toISOString()

    await supabase.from('bookings').update({
      checked_out_at: checkOutAt,
      check_out_lat:  checkOutGps?.lat ?? null,
      check_out_lng:  checkOutGps?.lng ?? null,
      status:         'completed',
      completed_at:   checkOutAt,
    }).eq('id', booking.id)

    // Build the WhatsApp report up-front so it can be persisted with the visit
    const elderName     = elderProfile?.name || booking.loved_ones?.full_name || 'Aunty/Uncle'
    const companionName = authProfile?.full_name || 'Companion'
    const text = generateWhatsAppReport({
      elderName, companionName, startTime, endTime: new Date(checkOutAt),
      t1: t1Data, t2: t2Data, flags,
    })

    const { error: visErr } = await supabase.from('visits').insert({
      booking_id:         booking.id,
      elder_id:           elderProfile?.id ?? null,
      companion_id:       user.id,
      start_time:         startTime.toISOString(),
      end_time:           checkOutAt,
      tier_completed:     t3Data ? 3 : t2Data ? 2 : 1,
      checklist_data:     { tier1: t1Data, tier2: t2Data ?? null, tier3: t3Data ?? null },
      flags,
      flag_notes:         t2Data?.concerns_text || null,
      one_moment:         t1Data.one_moment,
      photo_urls:         tier3PhotoUrls,
      mood_score:         moodScore,
      report_text:        text,
      short_visit_reason: shortVisitReason,
    })

    if (visErr) { setSaveError(visErr.message); setSaving(false); return }

    setReportText(text)
    setSaving(false)
    setScreen('report')
    window.dispatchEvent(new Event('closeeye:active-booking-changed'))
  }

  async function sendReport() {
    if (!booking) return
    setSaving(true)
    try {
      await supabase.functions.invoke('send-visit-whatsapp', {
        body: { booking_id: booking.id, message: reportText },
      })
      await supabase.from('visits')
        .update({ report_sent: true, report_sent_at: new Date().toISOString() })
        .eq('booking_id', booking.id)
    } catch (e) {
      console.warn('WhatsApp send (non-fatal):', e)
    } finally {
      setReportSent(true)
      setSaving(false)
      setTimeout(() => navigate('/companion'), 1500)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="max-w-lg mx-auto space-y-5 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-24" />
      <div className="h-48 bg-gray-200 rounded-2xl" />
      <div className="h-12 bg-gray-200 rounded-xl" />
    </div>
  )

  if (loadError) return (
    <div className="text-center py-20">
      <p className="text-red-600 font-semibold mb-2">{loadError}</p>
      <button onClick={load} className="text-sm text-green-700 font-medium underline">Retry</button>
    </div>
  )

  if (!booking) return (
    <div className="text-center py-20">
      <p className="text-green-900 font-semibold mb-1">Visit not found</p>
      <button onClick={() => navigate('/companion')} className="text-sm text-green-700 font-medium">← Back</button>
    </div>
  )

  const isCheckIn = !booking.checked_in_at

  // ─── CHECK-IN ─────────────────────────────────────────────────────────────

  if (isCheckIn) return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/companion')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-green-800 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <p className="text-xs font-semibold text-gray-400">Step 1 of 6</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={14} className="text-green-600" />
          <p className="text-xs font-bold uppercase tracking-widest text-green-600">Check In</p>
        </div>
        <p className="font-serif text-xl text-green-900 mb-0.5">{booking.loved_ones?.full_name}</p>
        <p className="text-sm text-gray-400">{booking.loved_ones?.city}</p>
        {booking.scheduled_at && (
          <p className="text-xs text-green-600 font-semibold mt-2">
            Scheduled {format(new Date(booking.scheduled_at), 'd MMM, h:mm a')}
          </p>
        )}
      </div>

      {booking.notes && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">Instructions from the family</p>
          <p className="text-sm text-amber-900 leading-relaxed">{booking.notes}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <h2 className="font-semibold text-green-900 text-sm">Your location</h2>
        <GpsCapture gps={gps} loading={gpsLoading} error={gpsError} onCapture={captureGPS} />
        <p className="text-xs text-gray-400">GPS is recorded at check-in to verify the visit location. You can still check in without it.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h2 className="font-semibold text-green-900 text-sm mb-3">Arrival photo (optional)</h2>
        <PhotoPicker
          label="Take a photo on arrival"
          photos={ciPhotos}
          onAdd={files => {
            setCiPhotoErr('')
            for (const f of Array.from(files)) {
              if (!f.type.startsWith('image/')) { setCiPhotoErr('Images only.'); continue }
              if (f.size > MAX_PHOTO_MB * 1024 * 1024) { setCiPhotoErr(`Max ${MAX_PHOTO_MB} MB.`); continue }
              setCiPhotos(prev => prev.length < 1 ? [{ file: f, url: URL.createObjectURL(f) }] : prev)
            }
          }}
          onRemove={i => { URL.revokeObjectURL(ciPhotos[i].url); setCiPhotos(p => p.filter((_, j) => j !== i)) }}
          max={1} error={ciPhotoErr} single
        />
      </div>

      <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-green-800">Check-in timestamp</p>
          <p className="text-xs text-gray-500">Will be recorded as: {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
      </div>

      {ciError && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm">{ciError}</p>
        </div>
      )}

      <button onClick={handleCheckIn} disabled={checkingIn}
        className="w-full bg-green-800 text-white font-bold py-4 rounded-xl hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors flex items-center justify-center gap-2 min-h-[52px]">
        {checkingIn ? <><Loader2 size={16} className="animate-spin" /> Checking in…</> : 'Confirm Check-In →'}
      </button>
    </div>
  )

  // ─── POST CHECK-IN ────────────────────────────────────────────────────────

  const stepNum: Record<Screen, number> = {
    briefing: 2, tier1: 3, tier2: 3, tier3_prompt: 4, tier3: 4, post_update: 5, report: 6,
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/companion')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-green-800 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <p className="text-xs font-semibold text-gray-400">Step {stepNum[screen]} of 6</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-1.5 h-6 bg-green-700 rounded-full" />
        <p className="font-semibold text-green-900">{booking.loved_ones?.full_name}</p>
        {booking.loved_ones?.city && <>
          <span className="text-gray-300">·</span>
          <p className="text-sm text-gray-400">{booking.loved_ones.city}</p>
        </>}
      </div>

      {saveError && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm">{saveError}</p>
        </div>
      )}

      {saving && screen !== 'report' && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2 text-green-700 text-sm">
          <Loader2 size={15} className="animate-spin" /> Saving…
        </div>
      )}

      {screen === 'briefing' && (
        <BriefingScreen booking={booking} profile={elderProfile} hasElderProfile={!!elderProfile}
          lastFlags={lastFlags} flagTrend={flagTrend} previousVisits={previousVisits}
          onStart={() => setScreen('tier1')} />
      )}

      {screen === 'tier1' && <Tier1Screen onNext={onTier1Done} />}

      {screen === 'tier2' && t1Data && <Tier2Screen t1={t1Data} onNext={onTier2Done} />}

      {screen === 'tier3_prompt' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <p className="text-3xl mb-3">📅</p>
            <p className="font-semibold text-amber-900 text-lg mb-2">Monthly check due</p>
            <p className="text-sm text-amber-700">This is your first visit this month. A 3-minute health check helps track long-term trends.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onTier3Defer}
              className="flex-1 py-4 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-700 transition-colors min-h-[52px]">
              Defer once
            </button>
            <button onClick={() => setScreen('tier3')}
              className="flex-1 bg-green-800 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-colors min-h-[52px]">
              Do it now →
            </button>
          </div>
        </div>
      )}

      {screen === 'tier3' && <Tier3Screen onNext={onTier3Done} onDefer={onTier3Defer} />}

      {screen === 'post_update' && (
        <PostVisitUpdateScreen
          elderName={elderProfile?.name || booking.loved_ones?.full_name || 'them'}
          onNext={onPostUpdateDone}
        />
      )}

      {screen === 'report' && (
        <ReportScreen report={reportText}
          flags={t1Data ? deriveFlags(t1Data, t2Data || {}) : 'none'}
          onSend={sendReport} sending={saving} sent={reportSent} />
      )}

      {/* Minimum-duration warning */}
      {showDurationWarning && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDurationWarning(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
              <h3 className="font-serif text-lg text-green-900">Short visit</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This visit was only {warningMins} minute{warningMins === 1 ? '' : 's'}. Close Eye recommends a
              minimum of {MIN_VISIT_MINS} minutes. Are you sure you want to complete?
            </p>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Reason for the short visit *</label>
            <textarea
              value={shortReason}
              onChange={e => setShortReason(e.target.value)}
              rows={3}
              placeholder="e.g. Elder was asleep, or asked me to leave early."
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowDurationWarning(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-600 hover:border-gray-300 transition-colors min-h-[48px]">
                Go Back
              </button>
              <button onClick={confirmShortVisit} disabled={!shortReason.trim()}
                className="flex-1 bg-amber-600 text-white font-bold py-3 rounded-xl hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors min-h-[48px]">
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
