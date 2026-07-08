'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFamilyData } from '@/components/family/family-data-provider'
import { RelationshipSelector } from '@/components/family/relationship-selector'
import { CityField } from '@/components/family/city-field'
import { PhotoPicker } from '@/components/family/photo-picker'
import { setLocalPhoto } from '@/lib/local-photos'
import { haptic } from '@/lib/haptics'

const labelCls = 'mb-2 block text-body-sm font-semibold text-ink'
const inputCls =
  'w-full rounded-2xl border border-line bg-ivory px-4 py-3.5 text-body text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

export default function AddFamilyMemberPage() {
  const router = useRouter()
  const { addLovedOne } = useFamilyData()
  const [fullName, setFullName] = React.useState('')
  const [relationship, setRelationship] = React.useState('')
  const [city, setCity] = React.useState('')
  const [photo, setPhoto] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  const valid = fullName.trim().length >= 2 && relationship.length > 0 && city.trim().length >= 2

  async function submit() {
    setError('')
    if (!valid) return setError('Please add a name, relationship and city.')
    setBusy(true)
    try {
      const created = await addLovedOne({ full_name: fullName, relationship, city })
      if (photo) setLocalPhoto(created.id, photo)
      haptic('success')
      router.replace('/family/members')
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <Link href="/family/members" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to family
      </Link>

      <div>
        <h1 className="text-h2 text-ink">Add a family member</h1>
        <p className="mt-2 text-body text-muted">Just the essentials — you can add health details and contacts later.</p>
      </div>

      <div className="ce-fade-in flex flex-col gap-6 rounded-[20px] border border-line bg-card p-6 shadow-sm sm:p-8">
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
