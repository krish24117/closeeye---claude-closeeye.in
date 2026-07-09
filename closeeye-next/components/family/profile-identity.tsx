'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { getLocalPhoto } from '@/lib/local-photos'

/** The signed-in user's real identity card (name, email, phone, avatar). */
export function ProfileIdentity() {
  const { user } = useAuth()
  const { identity, profile } = useFamilyData()
  const [photo, setPhoto] = useState<string | null>(null)
  useEffect(() => { if (user?.id) setPhoto(getLocalPhoto(user.id)) }, [user?.id])

  const sub = [identity.email, profile?.phone].filter(Boolean).join(' · ')
  return (
    <section className="flex items-center gap-4 rounded-lg border border-line bg-card p-6 shadow-sm">
      <Avatar initials={identity.initials} src={photo || identity.avatarUrl} alt={identity.fullName} size="xl" />
      <div className="min-w-0 flex-1">
        <p className="text-h4 text-ink">{identity.fullName}</p>
        {sub && <p className="truncate text-body-sm text-muted">{sub}</p>}
        {profile?.address && <p className="truncate text-caption text-muted">{profile.address}</p>}
      </div>
      <Button asChild variant="ghost" size="sm">
        <Link href="/family/profile/edit"><Pencil className="h-4 w-4" strokeWidth={1.5} /> Edit</Link>
      </Button>
    </section>
  )
}
