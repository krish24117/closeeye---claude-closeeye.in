'use client'

import { Pencil } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { Button } from '@/components/ui/button'
import { useFamilyData } from '@/components/family/family-data-provider'
import { whatsappLink } from '@/lib/site'

/** The signed-in user's real identity card (name, email, phone, avatar). */
export function ProfileIdentity() {
  const { identity, profile } = useFamilyData()
  const sub = [identity.email, profile?.phone].filter(Boolean).join(' · ')
  return (
    <section className="flex items-center gap-4 rounded-lg border border-line bg-card p-6 shadow-sm">
      <Avatar initials={identity.initials} src={identity.avatarUrl} alt={identity.fullName} size="xl" />
      <div className="min-w-0 flex-1">
        <p className="text-h4 text-ink">{identity.fullName}</p>
        {sub && <p className="truncate text-body-sm text-muted">{sub}</p>}
        {profile?.address && <p className="truncate text-caption text-muted">{profile.address}</p>}
      </div>
      <Button asChild variant="ghost" size="sm">
        <a href={whatsappLink("Hi — I'd like to update my profile details.")}>
          <Pencil className="h-4 w-4" strokeWidth={1.5} /> Edit
        </a>
      </Button>
    </section>
  )
}
