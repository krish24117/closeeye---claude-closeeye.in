'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { Button } from '@/components/ui/button'
import { PhotoPicker } from '@/components/family/photo-picker'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { useToast } from '@/components/ui/toast'
import { saveMyProfile } from '@/lib/db/onboarding'
import { setLocalPhoto } from '@/lib/local-photos'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

const LANGUAGES = ['English', 'हिन्दी', 'తెలుగు']
const labelCls = 'mb-2 block text-body-sm font-semibold text-ink'
const inputCls =
  'w-full min-h-[52px] rounded-2xl border border-line bg-ivory px-4 py-3.5 text-body text-ink placeholder:text-muted/70 transition-colors focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

export default function EditProfilePage() {
  const router = useRouter()
  const toast = useToast()
  const { user } = useAuth()
  const { identity, profile } = useFamilyData()

  const [fullName, setFullName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [language, setLanguage] = React.useState('English')
  const [ecName, setEcName] = React.useState('')
  const [ecPhone, setEcPhone] = React.useState('')
  const [photo, setPhoto] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    if (ready || !user) return
    const m = (user.user_metadata ?? {}) as { language?: string; emergency_contact_name?: string; emergency_contact_phone?: string }
    setFullName(identity.isPlaceholder ? '' : identity.fullName)
    setPhone(profile?.phone ?? '')
    setLanguage(m.language || 'English')
    setEcName(m.emergency_contact_name ?? '')
    setEcPhone(m.emergency_contact_phone ?? '')
    setReady(true)
  }, [ready, user, identity, profile])

  async function save() {
    setError('')
    if (fullName.trim().length < 2) return setError('Please enter your name.')
    if (!user) return setError('You’re not signed in. Please sign in again.')
    setBusy(true)
    const { error: err } = await saveMyProfile(user.id, { fullName, phone, language, emergencyName: ecName, emergencyPhone: ecPhone })
    if (err) {
      console.error('[edit-profile] failed:', err)
      setBusy(false)
      return setError('We couldn’t save your changes. Please try again.')
    }
    if (photo) setLocalPhoto(user.id, photo)
    haptic('success')
    toast('Your profile has been updated.')
    router.replace('/family/profile')
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <Link href="/family/profile" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to profile
      </Link>
      <PageHeader title="Edit profile" subtitle="Your details and how we reach you." />

      <div className="flex flex-col gap-6 rounded-[20px] border border-line/70 bg-card p-6 shadow-sm sm:p-8">
        <PhotoPicker onChange={setPhoto} />

        <div>
          <label htmlFor="p-name" className={labelCls}>Full name</label>
          <input id="p-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} autoComplete="name" />
        </div>

        <div>
          <label htmlFor="p-email" className={labelCls}>Email</label>
          <input id="p-email" value={identity.email ?? ''} readOnly disabled className={cn(inputCls, 'cursor-not-allowed opacity-70')} />
          <p className="mt-1.5 text-caption text-muted">Your email is your sign-in and can’t be changed here.</p>
        </div>

        <div>
          <label htmlFor="p-phone" className={labelCls}>Mobile</label>
          <input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="+91 90000 00000" className={inputCls} autoComplete="tel" />
        </div>

        <div>
          <label htmlFor="p-lang" className={labelCls}>Language</label>
          <select id="p-lang" value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls}>
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="p-ecn" className={labelCls}>Emergency contact name</label>
            <input id="p-ecn" value={ecName} onChange={(e) => setEcName(e.target.value)} placeholder="e.g. Anjali" className={inputCls} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="p-ecp" className={labelCls}>Emergency contact phone</label>
            <input id="p-ecp" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} type="tel" inputMode="tel" placeholder="+91 90000 00000" className={inputCls} />
          </div>
        </div>

        {error && <p className="text-caption text-error">{error}</p>}

        <Button size="lg" disabled={busy} onClick={save}>
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</> : <><Check className="h-5 w-5" strokeWidth={2} /> Save changes</>}
        </Button>
      </div>
    </div>
  )
}
