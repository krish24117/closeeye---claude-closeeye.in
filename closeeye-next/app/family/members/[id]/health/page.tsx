'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { Button } from '@/components/ui/button'
import { useFamilyData } from '@/components/family/family-data-provider'
import { useToast } from '@/components/ui/toast'
import { fetchElderProfile, upsertElderProfile, type ElderProfileForm } from '@/lib/db/family'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

const labelCls = 'mb-2 block text-body-sm font-semibold text-ink'
const inputCls =
  'w-full min-h-[52px] rounded-2xl border border-line bg-ivory px-4 py-3.5 text-body text-ink placeholder:text-muted/70 transition-colors focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'
const areaCls =
  'w-full min-h-[6rem] resize-y rounded-2xl border border-line bg-ivory px-4 py-3.5 text-body text-ink placeholder:text-muted/70 transition-colors focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-line/70 bg-card p-6 shadow-sm sm:p-7">
      <h2 className="text-h4 text-ink">{title}</h2>
      {hint && <p className="mt-1 text-body-sm text-muted">{hint}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </div>
  )
}

export default function HealthProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { lovedOnes, loading } = useFamilyData()
  const member = lovedOnes.find((l) => l.id === id)

  const [form, setForm] = React.useState<ElderProfileForm | null>(null)
  const [meds, setMeds] = React.useState('') // one per line
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!id) return
    fetchElderProfile(id)
      .then((p) => {
        setForm(p)
        setMeds(p.current_medications.join('\n'))
      })
      .catch(() => {
        setForm({
          food_preferences: '', conversation_interests: '', daily_routine: '', things_to_avoid: '',
          medical_conditions: '', allergies: '', current_medications: [], doctor_name: '', doctor_phone: '',
          pinned_note: '', photo_consent: false,
        })
      })
  }, [id])

  const set = <K extends keyof ElderProfileForm>(k: K, v: ElderProfileForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  async function save() {
    if (!form || !member) return
    setError('')
    setBusy(true)
    try {
      await upsertElderProfile(
        id,
        { ...form, current_medications: meds.split('\n').map((m) => m.trim()).filter(Boolean) },
        { name: member.full_name, age: member.age ?? null },
      )
      haptic('success')
      toast(`${member.full_name.trim().split(/\s+/)[0]}’s health profile saved.`)
      router.replace(`/family/members/${id}`)
    } catch (e) {
      console.error('[health-profile] save failed:', e)
      setBusy(false)
      setError('We couldn’t save the health profile. Please try again.')
    }
  }

  const back = (
    <Link href={`/family/members/${id}`} className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
      <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back
    </Link>
  )

  if (!member || !form) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        {back}
        <div className="grid place-items-center rounded-lg border border-line/70 bg-card py-20 shadow-sm">
          {loading || !member ? <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /> : <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />}
        </div>
      </div>
    )
  }

  const firstName = member.full_name.trim().split(/\s+/)[0]

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      {back}
      <PageHeader title={`${firstName}’s health profile`} subtitle="What you share here helps your Guardian give warm, personal care on every visit." />

      <div className="flex flex-col gap-5">
        <Section title="What they love" hint="Helps the Guardian connect from the first minute.">
          <div>
            <label htmlFor="h-food" className={labelCls}>Food & drink preferences</label>
            <textarea id="h-food" value={form.food_preferences} onChange={(e) => set('food_preferences', e.target.value)} placeholder="e.g. Prefers Telugu meals, filter coffee in the morning" className={areaCls} />
          </div>
          <div>
            <label htmlFor="h-conv" className={labelCls}>Conversation starters</label>
            <textarea id="h-conv" value={form.conversation_interests} onChange={(e) => set('conversation_interests', e.target.value)} placeholder="e.g. Old cricket days, the grandchildren, film songs" className={areaCls} />
          </div>
          <div>
            <label htmlFor="h-routine" className={labelCls}>Daily routine</label>
            <textarea id="h-routine" value={form.daily_routine} onChange={(e) => set('daily_routine', e.target.value)} placeholder="e.g. Morning walk, rest after lunch, tea around 5 pm" className={areaCls} />
          </div>
        </Section>

        <Section title="Health & care" hint="Only your care team sees this.">
          <div>
            <label htmlFor="h-cond" className={labelCls}>Medical conditions</label>
            <textarea id="h-cond" value={form.medical_conditions} onChange={(e) => set('medical_conditions', e.target.value)} placeholder="e.g. Type-2 diabetes, mild knee stiffness — uses a walking stick" className={areaCls} />
          </div>
          <div>
            <label htmlFor="h-meds" className={labelCls}>Medications <span className="font-normal text-muted">(one per line)</span></label>
            <textarea id="h-meds" value={meds} onChange={(e) => setMeds(e.target.value)} placeholder={'BP tablet — morning\nVitamin D — weekly'} className={areaCls} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="h-allergy" className={labelCls}>Allergies</label>
              <input id="h-allergy" value={form.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="e.g. Penicillin" className={inputCls} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="h-avoid" className={labelCls}>Things to avoid</label>
              <input id="h-avoid" value={form.things_to_avoid} onChange={(e) => set('things_to_avoid', e.target.value)} placeholder="e.g. Long stairs" className={inputCls} autoComplete="off" />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="h-doc" className={labelCls}>Doctor</label>
              <input id="h-doc" value={form.doctor_name} onChange={(e) => set('doctor_name', e.target.value)} placeholder="Dr. name" className={inputCls} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="h-docp" className={labelCls}>Doctor’s phone</label>
              <input id="h-docp" value={form.doctor_phone} onChange={(e) => set('doctor_phone', e.target.value)} type="tel" inputMode="tel" placeholder="+91 90000 00000" className={inputCls} />
            </div>
          </div>
        </Section>

        <Section title="A note for every visit">
          <div>
            <label htmlFor="h-note" className={labelCls}>Anything you’d like the Guardian to keep in mind</label>
            <textarea id="h-note" value={form.pinned_note} onChange={(e) => set('pinned_note', e.target.value)} placeholder="e.g. Please send a quick photo from each visit." className={areaCls} />
          </div>
          <button
            type="button"
            onClick={() => set('photo_consent', !form.photo_consent)}
            aria-pressed={form.photo_consent}
            className="flex items-start gap-3 rounded-2xl border border-line bg-ivory p-4 text-left transition-colors hover:border-green/40"
          >
            <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors', form.photo_consent ? 'border-green bg-green text-ivory' : 'border-line bg-card')}>
              {form.photo_consent && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
            <span>
              <span className="block text-body-sm font-semibold text-ink">Share visit photos with me on WhatsApp</span>
              <span className="block text-caption text-muted">Your Guardian can include a photo from each visit in your Presence Story.</span>
            </span>
          </button>
        </Section>
      </div>

      {error && <p className="text-caption text-error">{error}</p>}

      <Button size="lg" className="w-full sm:w-auto sm:self-start" disabled={busy} onClick={save}>
        {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</> : <><Check className="h-5 w-5" strokeWidth={2} /> Save health profile</>}
      </Button>
    </div>
  )
}
