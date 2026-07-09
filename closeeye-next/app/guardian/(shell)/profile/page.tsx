'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, CalendarCheck2, Loader2, LogOut, MapPin, Phone } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { initialsOf } from '@/components/family/loved-one-card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/lib/supabase'
import { fetchGuardianProfile, type GuardianProfile } from '@/lib/db/guardian'

/** The Guardian's own profile — real identity, lifetime visits, and sign out. */
export default function GuardianProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [p, setP] = React.useState<GuardianProfile | null | undefined>(undefined)
  const [signingOut, setSigningOut] = React.useState(false)

  React.useEffect(() => {
    if (!user?.id) {
      setP(null)
      return
    }
    fetchGuardianProfile(user.id).then(setP).catch(() => setP(null))
  }, [user?.id])

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace('/guardian/login')
  }

  if (p === undefined) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }

  const name = p?.fullName || 'Guardian'

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4 rounded-lg border border-line bg-card p-6 shadow-sm">
        <Avatar initials={initialsOf(name)} src={user?.user_metadata?.avatar_url as string | undefined} size="xl" tone="solid" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-h3 text-ink">{name}</h1>
          <p className="mt-1 inline-flex items-center gap-1.5 text-body-sm font-semibold text-success">
            <BadgeCheck className="h-4 w-4" strokeWidth={1.75} /> Verified Guardian
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-card p-4 shadow-sm">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><CalendarCheck2 className="h-5 w-5" strokeWidth={1.75} /></span>
          <div>
            <p className="text-h4 leading-none text-ink">{p?.visitsCompleted ?? 0}</p>
            <p className="mt-1 text-caption text-muted">Visits completed with Close Eye</p>
          </div>
        </div>
        {p?.city && (
          <div className="flex items-center gap-3 rounded-lg border border-line bg-card p-4 shadow-sm">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><MapPin className="h-5 w-5" strokeWidth={1.75} /></span>
            <div>
              <p className="text-body-sm font-semibold text-ink">{p.city}</p>
              <p className="text-caption text-muted">Service area</p>
            </div>
          </div>
        )}
        {p?.phone && (
          <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 rounded-lg border border-line bg-card p-4 shadow-sm transition-colors hover:border-accent">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Phone className="h-5 w-5" strokeWidth={1.75} /></span>
            <div>
              <p className="text-body-sm font-semibold text-ink">{p.phone}</p>
              <p className="text-caption text-muted">Phone</p>
            </div>
          </a>
        )}
      </section>

      {user?.email && <p className="text-center text-caption text-muted">Signed in as {user.email}</p>}

      <Button variant="secondary" size="lg" className="w-full" onClick={signOut} disabled={signingOut}>
        {signingOut ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> : <LogOut className="h-5 w-5" strokeWidth={1.75} />}
        Sign out
      </Button>
    </div>
  )
}
