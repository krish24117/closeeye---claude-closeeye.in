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
import { CountryField } from '@/components/family/country-field'
import { CityField } from '@/components/family/city-field'
import { PhoneField } from '@/components/family/phone-field'
import { PhotoPicker } from '@/components/family/photo-picker'
import { relationshipWord, objectPronoun, titleCase } from '@/lib/family/relationship-words'
import { RELATIONSHIP_OPTIONS } from '@/lib/plans'
import { setLocalPhoto } from '@/lib/local-photos'
import { haptic } from '@/lib/haptics'

const labelCls = 'mb-2 block text-body-sm font-semibold text-ink'
const inputCls =
  'w-full min-h-[52px] rounded-2xl border border-line bg-ivory px-4 py-3.5 text-body text-ink placeholder:text-muted/70 transition-colors focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

export default function AddPersonPage() {
  const router = useRouter()
  const toast = useToast()
  const { addLovedOne, identity } = useFamilyData()
  const [fullName, setFullName] = React.useState('')
  const [relationship, setRelationship] = React.useState('')
  const [country, setCountry] = React.useState('')
  const [city, setCity] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [photo, setPhoto] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  // The Family tab's WHO sheet pre-sets the relationship (?rel=Self|Spouse|Other…). Read via
  // window.location (an effect, not useSearchParams) so no Suspense boundary is needed.
  React.useEffect(() => {
    const rel = new URLSearchParams(window.location.search).get('rel')
    if (rel && RELATIONSHIP_OPTIONS.includes(rel as (typeof RELATIONSHIP_OPTIONS)[number])) setRelationship(rel)
  }, [])

  // ABOUT YOU — adding yourself is not "adding someone you love": the whole form speaks to
  // you directly, and your name arrives pre-filled from your account.
  const selfMode = relationship === 'Self'
  React.useEffect(() => {
    if (selfMode && !fullName.trim() && identity.fullName) setFullName(identity.fullName)
  }, [selfMode, identity.fullName]) // eslint-disable-line react-hooks/exhaustive-deps

  // If they typed a relationship as the name ("mother", "amma"), infer the relationship so they
  // don't pick it twice — then we gently ask below for the name they actually call them.
  const relMatch = relationshipWord(fullName)
  React.useEffect(() => {
    if (relMatch && !relationship.trim()) setRelationship(titleCase(relMatch.canon))
  }, [relMatch?.canon]) // eslint-disable-line react-hooks/exhaustive-deps

  const valid = fullName.trim().length >= 2 && relationship.length > 0 && country.length > 0 && city.trim().length >= 2

  async function submit() {
    if (busy) return // guard against rapid double-clicks → only one record
    setError('')
    if (fullName.trim().length < 2) { setError('Please add their name.'); return }
    if (!relationship) { setError('Please choose a relationship.'); return }
    if (!country) { setError(`Please choose ${fullName.trim().split(/\s+/)[0] || 'them'}'s country — it helps Close Eye show the right emergency number.`); return }
    if (city.trim().length < 2) { setError('Please add the city they live in.'); return }
    setBusy(true)
    try {
      const created = await addLovedOne({ full_name: fullName, relationship, city, region_code: country || null, phone_number: phone.trim() || undefined })
      if (photo) setLocalPhoto(created.id, photo)
      haptic('success')
      toast(selfMode ? 'Your profile was created.' : `${fullName.trim().split(/\s+/)[0]} was added to your family.`)
      // Land ON the new person's Space (not the generic home, which ignores ?member) — where the
      // guided first task begins understanding them. Fixes the dropped deep-link.
      router.replace(`/space/people/${created.id}`)
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
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Family
      </Link>

      <div>
        <h1 className="text-h2 text-ink">{selfMode ? 'About you' : 'Add someone you love'}</h1>
        <p className="mt-2 text-body text-muted">{selfMode ? 'Your details help in an emergency — and help Close Eye help your family better.' : 'Just the essentials — you can add health details and contacts later.'}</p>
      </div>

      <div className="ce-fade-in flex flex-col gap-6 rounded-[20px] border border-line/70 bg-card p-6 shadow-sm sm:p-8">
        <PhotoPicker onChange={setPhoto} />

        <div>
          <label htmlFor="fm-name" className={labelCls}>{selfMode ? 'Your name' : 'Their name'}</label>
          <input id="fm-name" value={fullName} onChange={(e) => setFullName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder={selfMode ? 'Your full name' : 'e.g. Ramesh Reddy'} autoComplete="off" className={inputCls} />
          {relMatch && (
            <p className="mt-2 rounded-xl bg-accent-soft/40 px-3.5 py-2.5 text-caption leading-relaxed text-green">
              That’s a relationship — what do you <b>call</b> {objectPronoun(relMatch.gender)}? A name like “Lakshmi” lets Close Eye speak about {objectPronoun(relMatch.gender)} personally. You can keep “{titleCase(relMatch.canon)}” if you’d rather.
            </p>
          )}
        </div>

        <div>
          <span className={labelCls}>Relationship</span>
          <RelationshipSelector value={relationship} onChange={setRelationship} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Country</span>
            <CountryField value={country} onChange={setCountry} placeholder={selfMode ? 'Select your country' : 'Select their country'} />
          </div>
          <div>
            <span className={labelCls}>City</span>
            <CityField value={city} onChange={setCity} />
          </div>
        </div>

        <div>
          <label htmlFor="fm-phone" className={labelCls}>Phone <span className="font-normal text-muted">(optional)</span></label>
          <PhoneField id="fm-phone" value={phone} onChange={setPhone} country={country} />
          <p className="mt-1.5 text-caption text-muted">{selfMode ? 'Stored with the country code — so your family and Presence Manager can reach you in one tap.' : 'Stored with the country code, so you can call them with one tap from their page — wherever they are.'}</p>
        </div>

        {error && <p className="text-caption text-error">{error}</p>}

        <Button size="lg" className="mt-1 w-full" disabled={!valid || busy} onClick={submit}>
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</> : <>Save &amp; Continue <ArrowRight className="h-5 w-5" strokeWidth={2} /></>}
        </Button>
      </div>
    </div>
  )
}
