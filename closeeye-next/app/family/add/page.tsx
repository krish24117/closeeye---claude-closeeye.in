'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { Button } from '@/components/ui/button'
import { useFamilyData } from '@/components/family/family-data-provider'
import { RELATIONSHIPS } from '@/lib/plans'
import { haptic } from '@/lib/haptics'

const inputCls =
  'w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

export default function AddLovedOnePage() {
  const router = useRouter()
  const { addLovedOne } = useFamilyData()
  const [fullName, setFullName] = React.useState('')
  const [relationship, setRelationship] = React.useState('')
  const [city, setCity] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  async function submit() {
    setError('')
    if (fullName.trim().length < 2) return setError('Please enter their name.')
    if (!relationship) return setError('Please choose your relationship to them.')
    setBusy(true)
    try {
      await addLovedOne({ full_name: fullName, relationship, city })
      haptic('success')
      router.replace('/family/members')
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Could not add your loved one. Please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/family/members" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to family
      </Link>
      <PageHeader title="Add a loved one" subtitle="Just the essentials for now — health details and contacts can be added later." />

      <div className="flex max-w-lg flex-col gap-5 rounded-lg border border-line bg-card p-6 shadow-sm">
        <label className="block">
          <span className="mb-1.5 block text-body-sm font-medium text-ink">Full name</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ramesh Rao" autoComplete="name" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-body-sm font-medium text-ink">Your relationship to them</span>
          <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className={inputCls}>
            <option value="" disabled>Choose one…</option>
            {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-body-sm font-medium text-ink">City</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Hyderabad" autoComplete="address-level2" className={inputCls} />
        </label>
        {error && <p className="text-caption text-error">{error}</p>}
        <Button size="lg" disabled={busy} onClick={submit}>
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Adding…</> : <><UserPlus className="h-5 w-5" strokeWidth={2} /> Add to my family</>}
        </Button>
      </div>
    </div>
  )
}
