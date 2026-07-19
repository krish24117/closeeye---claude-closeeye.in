'use client'

/**
 * Phase 4 · People — Edit details (Owner: People, /space/people/[id]/edit). Ported from
 * /family/members/[id]: the same fields (basics · health profile · emergency contact), the same
 * editFamilyMember, restyled into the workspace. Navigation returns to the Person Space. The family
 * route redirects here once live — one edit form, one home.
 */
import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { Button } from '@/components/ui/button'
import { RelationshipSelector } from '@/components/family/relationship-selector'
import { CityField } from '@/components/family/city-field'
import { PhotoPicker } from '@/components/family/photo-picker'
import { useFamilyData } from '@/components/family/family-data-provider'
import { phonePlaceholder } from '@/lib/platform/locale'
import { useToast } from '@/components/ui/toast'
import { setLocalPhoto } from '@/lib/local-photos'
import { haptic } from '@/lib/haptics'

const labelCls = 'mb-2 block text-body-sm font-semibold text-ink'
const inputCls =
  'w-full min-h-[52px] rounded-2xl border border-line bg-ivory px-4 py-3.5 text-body text-ink placeholder:text-muted/70 transition-colors focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'
const areaCls =
  'w-full min-h-[6rem] resize-y rounded-2xl border border-line bg-ivory px-4 py-3.5 text-body text-ink placeholder:text-muted/70 transition-colors focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-line/70 bg-card p-6 shadow-sm sm:p-7">
      <h2 className="text-h4 text-ink">{title}</h2>
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </div>
  )
}

export default function EditPersonPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { lovedOnes, loading, editFamilyMember, region } = useFamilyData()
  const member = lovedOnes.find((l) => l.id === id)

  const [fullName, setFullName] = React.useState('')
  const [relationship, setRelationship] = React.useState('')
  const [city, setCity] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [age, setAge] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [medical, setMedical] = React.useState('')
  const [doctor, setDoctor] = React.useState('')
  const [hospital, setHospital] = React.useState('')
  const [ecName, setEcName] = React.useState('')
  const [ecPhone, setEcPhone] = React.useState('')
  const [photo, setPhoto] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    if (!member || ready) return
    setFullName(member.full_name ?? '')
    setRelationship(member.relationship ?? '')
    setCity(member.city ?? '')
    setAddress(member.address ?? '')
    setAge(member.age != null ? String(member.age) : '')
    setPhone(member.phone_number ?? '')
    setMedical(member.medical_notes ?? '')
    setDoctor(member.doctor_name ?? '')
    setHospital(member.nearest_hospital ?? '')
    setEcName(member.emergency_contact_name ?? '')
    setEcPhone(member.emergency_contact_phone ?? '')
    setReady(true)
  }, [member, ready])

  async function save() {
    setError('')
    if (fullName.trim().length < 2) return setError('Please enter their name.')
    setBusy(true)
    try {
      const ageNum = age.trim() ? Number(age.trim()) : null
      await editFamilyMember(id, {
        full_name: fullName,
        relationship,
        city,
        address,
        age: ageNum != null && !Number.isNaN(ageNum) ? ageNum : null,
        phone_number: phone,
        medical_notes: medical,
        doctor_name: doctor,
        nearest_hospital: hospital,
        emergency_contact_name: ecName,
        emergency_contact_phone: ecPhone,
      })
      if (photo) setLocalPhoto(id, photo)
      haptic('success')
      toast(`${fullName.trim().split(/\s+/)[0]}’s details saved.`)
      router.replace(`/space/people/${id}`)
    } catch (e) {
      console.error('[space-edit-person] failed:', e)
      setBusy(false)
      setError('We couldn’t save the changes. Please try again.')
    }
  }

  const back = (
    <Link href={`/space/people/${id}`} className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
      <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back
    </Link>
  )

  if (!member) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        {loading ? (
          <div className="grid place-items-center rounded-lg border border-line/70 bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
        ) : (
          <section className="flex flex-col items-center rounded-lg border border-line/70 bg-card px-6 py-14 text-center shadow-sm">
            <h2 className="text-h3 text-ink">Person not found</h2>
            <p className="mt-2 text-body text-muted">They may have been removed from your family.</p>
            <Button asChild size="lg" className="mt-6"><Link href="/space/people">Back to People</Link></Button>
          </section>
        )}
      </div>
    )
  }

  const firstName = member.full_name.trim().split(/\s+/)[0]

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      {back}
      <PageHeader title={`Edit ${firstName}`} subtitle="Update their details — Close Eye uses them everywhere." />

      <div className="flex flex-col gap-5">
        <Section title="Basics">
          <PhotoPicker onChange={setPhoto} />
          <div>
            <label htmlFor="e-name" className={labelCls}>Full name</label>
            <input id="e-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} autoComplete="off" />
          </div>
          <div>
            <span className={labelCls}>Relationship</span>
            <RelationshipSelector value={relationship} onChange={setRelationship} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <span className={labelCls}>City</span>
              <CityField value={city} onChange={setCity} />
            </div>
            <div>
              <label htmlFor="e-age" className={labelCls}>Age <span className="font-normal text-muted">(optional)</span></label>
              <input id="e-age" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" placeholder="e.g. 72" className={inputCls} />
            </div>
          </div>
          <div>
            <label htmlFor="e-addr" className={labelCls}>Address <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="e-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House / flat, street, area, landmark, pincode" className={areaCls} />
          </div>
          <div>
            <label htmlFor="e-phone" className={labelCls}>Phone <span className="font-normal text-muted">(optional)</span></label>
            <input id="e-phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder={phonePlaceholder(region)} className={inputCls} />
          </div>
        </Section>

        <Section title="Health profile">
          <div>
            <label htmlFor="e-med" className={labelCls}>Medical notes <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="e-med" value={medical} onChange={(e) => setMedical(e.target.value)} placeholder="Conditions, medication, mobility, allergies…" className={areaCls} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="e-doc" className={labelCls}>Doctor <span className="font-normal text-muted">(optional)</span></label>
              <input id="e-doc" value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="Dr. name" className={inputCls} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="e-hosp" className={labelCls}>Nearest hospital <span className="font-normal text-muted">(optional)</span></label>
              <input id="e-hosp" value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="Hospital name" className={inputCls} autoComplete="off" />
            </div>
          </div>
          <Link
            href={`/space/people/${id}/health`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-green/40 bg-accent-soft/30 px-4 py-3.5 text-body-sm font-semibold text-green transition-colors hover:bg-accent-soft/60"
          >
            <span>Care details for your Guardian — preferences, routine, medications &amp; photo consent</span>
            <span aria-hidden>→</span>
          </Link>
        </Section>

        <Section title="Emergency contact">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="e-ecn" className={labelCls}>Contact name <span className="font-normal text-muted">(optional)</span></label>
              <input id="e-ecn" value={ecName} onChange={(e) => setEcName(e.target.value)} placeholder="e.g. Anjali" className={inputCls} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="e-ecp" className={labelCls}>Contact phone <span className="font-normal text-muted">(optional)</span></label>
              <input id="e-ecp" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} type="tel" inputMode="tel" placeholder={phonePlaceholder(region)} className={inputCls} />
            </div>
          </div>
        </Section>
      </div>

      {error && <p className="text-caption text-error">{error}</p>}

      <Button size="lg" className="w-full sm:w-auto sm:self-start" disabled={busy} onClick={save}>
        {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</> : <><Check className="h-5 w-5" strokeWidth={2} /> Save changes</>}
      </Button>
    </div>
  )
}
