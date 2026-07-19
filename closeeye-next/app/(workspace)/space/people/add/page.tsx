'use client'

/**
 * Phase 4 · People — Add someone (Owner: People, /space/people/add). The workspace home for the
 * add flow, ported from /family/add: same fields, the same addLovedOne, the same uniform landing
 * on the new person's space (/space?member=…). Only the navigation is re-homed to /space. The
 * family route redirects here once this is live, so there is one add flow, one home.
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useFamilyData } from '@/components/family/family-data-provider'
import { RelationshipSelector } from '@/components/family/relationship-selector'
import { CityField } from '@/components/family/city-field'
import { PhotoPicker } from '@/components/family/photo-picker'
import { setLocalPhoto } from '@/lib/local-photos'
import { haptic } from '@/lib/haptics'

const labelCls = 'mb-2 block text-body-sm font-semibold text-ink'
const inputCls =
  'w-full min-h-[52px] rounded-2xl border border-line bg-ivory px-4 py-3.5 text-body text-ink placeholder:text-muted/70 transition-colors focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

export default function AddPersonPage() {
  const router = useRouter()
  const toast = useToast()
  const { addLovedOne } = useFamilyData()
  const [fullName, setFullName] = React.useState('')
  const [relationship, setRelationship] = React.useState('')
  const [city, setCity] = React.useState('')
  const [photo, setPhoto] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  const valid = fullName.trim().length >= 2 && relationship.length > 0 && city.trim().length >= 2

  async function submit() {
    if (busy) return // guard against rapid double-clicks → only one record
    setError('')
    if (!valid) return setError('Please add a name, relationship and city.')
    setBusy(true)
    try {
      const created = await addLovedOne({ full_name: fullName, relationship, city })
      if (photo) setLocalPhoto(created.id, photo)
      haptic('success')
      toast(`${fullName.trim().split(/\s+/)[0]} was added to your family.`)
      // Uniform add flow: land on the new person's Space, where Connect begins understanding them.
      router.replace(`/space?member=${created.id}`)
    } catch (e) {
      // Never surface a raw Postgres/Supabase error to the user; log it for us.
      console.error('[space-add-person] save failed:', e)
      setBusy(false)
      setError('We couldn’t save your family member. Please try again.')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <Link href="/space/people" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> People
      </Link>

      <div>
        <h1 className="text-h2 text-ink">Add someone you love</h1>
        <p className="mt-2 text-body text-muted">Just the essentials — you can add health details and contacts later.</p>
      </div>

      <div className="ce-fade-in flex flex-col gap-6 rounded-[20px] border border-line/70 bg-card p-6 shadow-sm sm:p-8">
        <PhotoPicker onChange={setPhoto} />

        <div>
          <label htmlFor="fm-name" className={labelCls}>Full name</label>
          <input id="fm-name" value={fullName} onChange={(e) => setFullName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="e.g. Ramesh Reddy" autoComplete="off" className={inputCls} />
        </div>

        <div>
          <span className={labelCls}>Relationship</span>
          <RelationshipSelector value={relationship} onChange={setRelationship} />
        </div>

        <div>
          <span className={labelCls}>City</span>
          <CityField value={city} onChange={setCity} />
        </div>

        {error && <p className="text-caption text-error">{error}</p>}

        <Button size="lg" className="mt-1 w-full" disabled={!valid || busy} onClick={submit}>
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</> : <>Save &amp; Continue <ArrowRight className="h-5 w-5" strokeWidth={2} /></>}
        </Button>
      </div>
    </div>
  )
}
