'use client'

/**
 * Complete profile — one calm, sectioned page (founder decision, 2026-07-21). Replaces the old
 * one-question-at-a-time essay flow: the paging wasn't what made it feel good, the big single
 * fields and pre-filled answers were. So everything lives on one page, grouped into three
 * chapters — Basics · Her health · Around her — with a progress bar pinned at the top. It reads
 * and writes ONLY existing columns (loved_ones via editFamilyMember + elder_profiles via
 * upsertElderProfile) — no schema change. Address is here because it's what enables Care.
 */
import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useLovedOnes } from '@/components/family/family-data-provider'
import { RelationshipSelector } from '@/components/family/relationship-selector'
import { CountryField } from '@/components/family/country-field'
import { CityField } from '@/components/family/city-field'
import { PhotoPicker } from '@/components/family/photo-picker'
import { fetchElderProfile, upsertElderProfile, type ElderProfileForm } from '@/lib/db/family'
import { computeCompleteness, EMPTY_HEALTH } from '@/lib/db/profile'
import { titleCase } from '@/lib/family/relationship-words'
import { phonePlaceholder, dialCode } from '@/lib/platform/locale'
import { setLocalPhoto } from '@/lib/local-photos'
import type { LovedOne } from '@/lib/db/types'
import { haptic } from '@/lib/haptics'

const KNOWN_CONDITIONS = ['Diabetes', 'High BP', 'Heart', 'Thyroid', 'Arthritis']

const labelCls = 'mb-2 block text-body-sm font-semibold text-ink'
const inputCls =
  'w-full min-h-[52px] rounded-2xl border border-line bg-ivory px-4 py-3.5 text-body text-ink placeholder:text-muted/70 transition-colors focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

/** Split a stored "Diabetes, High BP, low sodium" string into known chips + free text. */
function parseConditions(s: string): { chips: Set<string>; extra: string } {
  const chips = new Set<string>()
  const extra: string[] = []
  for (const part of s.split(',').map((x) => x.trim()).filter(Boolean)) {
    if (/^none$/i.test(part)) { chips.add('None'); continue }
    const k = KNOWN_CONDITIONS.find((c) => c.toLowerCase() === part.toLowerCase())
    if (k) chips.add(k)
    else extra.push(part)
  }
  return { chips, extra: extra.join(', ') }
}

export default function CompleteProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { lovedOnes, loading, editFamilyMember } = useLovedOnes()
  const lo = lovedOnes.find((l) => l.id === id)

  const [ready, setReady] = React.useState(false)
  const [notFound, setNotFound] = React.useState(false)
  const elderRef = React.useRef<ElderProfileForm | null>(null)
  const startedRef = React.useRef(false)
  // The data provider starts with loading=false and only flips true once its fetch begins
  // (a mount effect). So we must NOT declare "not found" on the first render — wait until a
  // real fetch has happened (or the roster is already populated) before deciding.
  const everLoadedRef = React.useRef(false)

  // Basics
  const [name, setName] = React.useState('')
  const [relationship, setRelationship] = React.useState('')
  const [age, setAge] = React.useState('')
  const [country, setCountry] = React.useState('')
  const [city, setCity] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [photo, setPhoto] = React.useState<string | null>(null)
  // Health
  const [conditions, setConditions] = React.useState<Set<string>>(new Set())
  const [condExtra, setCondExtra] = React.useState('')
  const [allergies, setAllergies] = React.useState('')
  const [meds, setMeds] = React.useState<string[]>([])
  // Around her
  const [ecName, setEcName] = React.useState('')
  const [ecPhone, setEcPhone] = React.useState('')
  const [doctorName, setDoctorName] = React.useState('')
  const [doctorPhone, setDoctorPhone] = React.useState('')
  const [hospital, setHospital] = React.useState('')

  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  const relOnly = !!lo && /^your\s/i.test(lo.full_name)

  // Load once the loved one is known: prefill basics from loved_ones, health from elder_profiles.
  React.useEffect(() => {
    if (startedRef.current) return
    if (loading) { everLoadedRef.current = true; return } // fetch in flight — wait for it
    if (!lo) {
      // Only "not found" once we know the roster is real (a fetch ran, or people exist) —
      // never on the transient first render before the provider has started.
      if (everLoadedRef.current || lovedOnes.length) setNotFound(true)
      return
    }
    startedRef.current = true
    setName(relOnly ? '' : lo.full_name)
    setRelationship(lo.relationship ?? '')
    setAge(lo.age != null ? String(lo.age) : '')
    setCountry(lo.region_code ?? '')
    setCity(lo.city ?? '')
    setAddress(lo.address ?? '')
    setPhone(lo.phone_number ?? '')
    setEcName(lo.emergency_contact_name ?? '')
    setEcPhone(lo.emergency_contact_phone ?? '')
    setDoctorName(lo.doctor_name ?? '')
    setHospital(lo.nearest_hospital ?? '')
    void fetchElderProfile(lo.id).then((e) => {
      elderRef.current = e
      const { chips, extra } = parseConditions(e.medical_conditions)
      setConditions(chips)
      setCondExtra(extra)
      setAllergies(e.allergies)
      setMeds(e.current_medications)
      setDoctorPhone(e.doctor_phone)
      if (!lo.doctor_name && e.doctor_name) setDoctorName(e.doctor_name)
      setReady(true)
    }).catch(() => setReady(true))
  }, [loading, lo, lovedOnes, relOnly])

  function toggleCondition(c: string) {
    haptic('light')
    setConditions((prev) => {
      const next = new Set(prev)
      if (c === 'None') return next.has('None') ? new Set() : new Set(['None'])
      next.delete('None')
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }
  const conditionsString = React.useCallback(() => {
    if (conditions.has('None')) return 'None'
    return [...[...conditions].filter((c) => c !== 'None'), condExtra.trim()].filter(Boolean).join(', ')
  }, [conditions, condExtra])

  // Live progress — from the same measure the People list uses, over the editable form.
  const liveLo = {
    relationship, age: age.trim() ? Number(age) : null, city, address, phone_number: phone,
    emergency_contact_name: ecName, emergency_contact_phone: ecPhone, doctor_name: doctorName,
  } as Pick<LovedOne, 'relationship' | 'age' | 'city' | 'address' | 'phone_number' | 'emergency_contact_name' | 'emergency_contact_phone' | 'doctor_name'>
  const pct = computeCompleteness(liveLo, { ...EMPTY_HEALTH, medical_conditions: conditionsString(), allergies, current_medications: meds.filter((m) => m.trim()) }).pct

  async function save() {
    if (!lo || saving) return
    setSaving(true); setError('')
    try {
      const cleanMeds = meds.map((m) => m.trim()).filter(Boolean)
      await editFamilyMember(lo.id, {
        full_name: name.trim() || lo.full_name, // never wipe an existing name if they skipped it
        relationship: relationship.trim() || lo.relationship || 'Family',
        age: age.trim() ? Number(age) : null,
        city: city.trim(),
        region_code: country || null,
        phone_number: phone.trim(),
        address: address.trim(),
        doctor_name: doctorName.trim(),
        nearest_hospital: hospital.trim(),
        emergency_contact_name: ecName.trim(),
        emergency_contact_phone: ecPhone.trim(),
        medical_notes: lo.medical_notes ?? '',
      })
      const base = elderRef.current ?? await fetchElderProfile(lo.id)
      await upsertElderProfile(lo.id, {
        ...base,
        medical_conditions: conditionsString(),
        allergies: allergies.trim(),
        current_medications: cleanMeds,
        doctor_name: doctorName.trim(),
        doctor_phone: doctorPhone.trim(),
      }, { name: name.trim() || lo.full_name, age: age.trim() ? Number(age) : null })
      if (photo) setLocalPhoto(lo.id, photo)
      haptic('success')
      toast('Profile saved.')
      router.replace(`/space/people/${lo.id}`)
    } catch (e) {
      console.error('[complete-profile] save failed:', e)
      setSaving(false)
      setError('We couldn’t save just now — please try again.')
    }
  }

  const backHref = `/space/people/${id}`
  const who = (name.trim() || (lo && relOnly ? titleCase(lo.full_name.replace(/^your\s+/i, '')) : lo?.full_name) || 'them')

  if (notFound) return (
    <div className="py-20 text-center">
      <p className="text-body-sm text-ink">We couldn’t open this just now.</p>
      <Link href={backHref} className="mt-4 inline-block text-body-sm font-semibold text-green">← Back</Link>
    </div>
  )
  if (!ready) return <p className="py-20 text-center text-caption text-muted">Opening…</p>

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 pb-4">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> {who}
      </Link>

      {/* title + pinned progress */}
      <div>
        <p className="text-caption font-semibold uppercase tracking-widest text-green">Complete profile</p>
        <h1 className="mt-2 text-h2 leading-snug text-ink">Help Close&nbsp;Eye know {who}</h1>
        <p className="mt-2 text-body-sm text-muted">Every answer makes each check-in, reminder and reply more personal — and lets Care act faster.</p>
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-accent-soft">
            <span className="block h-full rounded-full bg-green transition-[width] duration-500" style={{ width: `${Math.max(pct, 4)}%` }} />
          </div>
          <p className="mt-1.5 text-caption font-semibold text-muted">{pct}% complete</p>
        </div>
      </div>

      {/* ① The basics */}
      <section className="flex flex-col gap-5 rounded-3xl border border-line/70 bg-card p-5 shadow-sm sm:p-6">
        <p className="text-caption font-semibold uppercase tracking-widest text-green">The basics</p>
        <PhotoPicker onChange={setPhoto} />
        <div>
          <label htmlFor="p-name" className={labelCls}>Their name</label>
          <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lakshmi" autoComplete="off" className={inputCls} />
        </div>
        <div>
          <span className={labelCls}>Relationship</span>
          <RelationshipSelector value={relationship} onChange={setRelationship} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="p-age" className={labelCls}>Age</label>
            <input id="p-age" value={age} onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, '').slice(0, 3))} inputMode="numeric" placeholder="72" className={inputCls} />
          </div>
          <div>
            <span className={labelCls}>City</span>
            <CityField value={city} onChange={setCity} />
          </div>
        </div>
        <div>
          <span className={labelCls}>Country</span>
          <CountryField value={country} onChange={(c) => { setCountry(c); const dc = dialCode(c); if (dc && !phone.replace(/\D/g, '')) setPhone(`${dc} `) }} />
        </div>
        <div>
          <label htmlFor="p-address" className={labelCls}>Home address <span className="font-normal text-green">· enables Care</span></label>
          <textarea id="p-address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Flat / house, street, area" className={`${inputCls} min-h-0 resize-none`} />
          <p className="mt-1.5 text-caption text-muted">This is what lets a Close Eye Care visit reach their door when you request one.</p>
        </div>
        <div>
          <label htmlFor="p-phone" className={labelCls}>Phone</label>
          <input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder={phonePlaceholder(country)} autoComplete="off" className={inputCls} />
          <p className="mt-1.5 text-caption text-muted">So you can call them with one tap from their page.</p>
        </div>
      </section>

      {/* ② Her health */}
      <section className="flex flex-col gap-5 rounded-3xl border border-line/70 bg-card p-5 shadow-sm sm:p-6">
        <p className="text-caption font-semibold uppercase tracking-widest text-green">Their health</p>
        <div>
          <span className={labelCls}>Any of these?</span>
          <div className="flex flex-wrap gap-2.5">
            {[...KNOWN_CONDITIONS, 'None'].map((c) => {
              const on = conditions.has(c)
              return (
                <button key={c} type="button" onClick={() => toggleCondition(c)}
                  className={`rounded-full border px-4 py-2.5 text-body-sm font-semibold transition-colors ${on ? 'border-green/50 bg-accent-soft text-green' : 'border-line bg-ivory text-ink hover:border-green/40'}`}>
                  {on && c !== 'None' ? '✓ ' : ''}{c}
                </button>
              )
            })}
          </div>
          {!conditions.has('None') && (
            <input value={condExtra} onChange={(e) => setCondExtra(e.target.value)} placeholder="Anything else — type it here" autoComplete="off" className={`${inputCls} mt-3`} />
          )}
        </div>
        <div>
          <label htmlFor="p-allergies" className={labelCls}>Allergies</label>
          <input id="p-allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. Penicillin — or “None”" autoComplete="off" className={inputCls} />
        </div>
        <div>
          <span className={labelCls}>Regular medicines</span>
          <div className="flex flex-col gap-2.5">
            {meds.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={m} onChange={(e) => setMeds((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder="e.g. Metformin 500mg" autoComplete="off" className={inputCls} />
                <button type="button" onClick={() => setMeds((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Remove" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-error/10 hover:text-error">
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setMeds((prev) => [...prev, ''])} className="inline-flex items-center gap-1.5 self-start rounded-full border border-line bg-ivory px-4 py-2.5 text-body-sm font-semibold text-ink transition-colors hover:border-green/40">
              <Plus className="h-4 w-4" strokeWidth={2.2} /> Add a medicine
            </button>
          </div>
        </div>
        <Link href={`/space/people/${id}/health`} className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-green/40 bg-accent-soft/30 px-4 py-3.5 text-body-sm font-semibold text-green transition-colors hover:bg-accent-soft/60">
          <span>Care &amp; preferences — routine, food, language &amp; what makes them feel known</span>
          <span aria-hidden>→</span>
        </Link>
      </section>

      {/* ③ Around her */}
      <section className="flex flex-col gap-5 rounded-3xl border border-line/70 bg-card p-5 shadow-sm sm:p-6">
        <p className="text-caption font-semibold uppercase tracking-widest text-green">Around them</p>
        <div>
          <span className={labelCls}>Someone close by</span>
          <p className="-mt-1 mb-2.5 text-caption text-muted">A neighbour or relative who can reach them quickly if ever needed.</p>
          <div className="flex flex-col gap-2.5">
            <input value={ecName} onChange={(e) => setEcName(e.target.value)} placeholder="Name" autoComplete="off" className={inputCls} />
            <input value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} type="tel" inputMode="tel" placeholder={`Phone — ${phonePlaceholder(country)}`} autoComplete="off" className={inputCls} />
          </div>
        </div>
        <div>
          <span className={labelCls}>Their doctor <span className="font-normal text-muted">(optional)</span></span>
          <div className="flex flex-col gap-2.5">
            <input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Doctor’s name" autoComplete="off" className={inputCls} />
            <input value={doctorPhone} onChange={(e) => setDoctorPhone(e.target.value)} type="tel" inputMode="tel" placeholder={`Phone — ${phonePlaceholder(country)}`} autoComplete="off" className={inputCls} />
          </div>
        </div>
        <div>
          <label htmlFor="p-hospital" className={labelCls}>Nearest hospital <span className="font-normal text-muted">(optional)</span></label>
          <input id="p-hospital" value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="Hospital name" autoComplete="off" className={inputCls} />
        </div>
      </section>

      {error && <p className="text-caption text-error">{error}</p>}

      <Button size="lg" className="w-full" disabled={saving} onClick={save}>
        {saving ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</> : <><Check className="h-5 w-5" strokeWidth={2} /> Save profile</>}
      </Button>
      <p className="text-center text-caption text-muted">You can come back and add more anytime. Private to your family.</p>
    </div>
  )
}
