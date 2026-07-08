'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { MemberCard } from '@/components/family/member-card'
import { AddMemberDialog } from '@/components/family/add-member-dialog'
import { Button } from '@/components/ui/button'
import { MEMBERS, type Member } from '@/lib/family-data'

export function MembersManager() {
  const [members, setMembers] = useState<Member[]>(MEMBERS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Member | undefined>(undefined)

  function openAdd() {
    setEditing(undefined)
    setDialogOpen(true)
  }
  function openEdit(m: Member) {
    setEditing(m)
    setDialogOpen(true)
  }
  function save(m: Member) {
    setMembers((list) => (list.some((x) => x.id === m.id) ? list.map((x) => (x.id === m.id ? m : x)) : [...list, m]))
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Your family"
        subtitle="Everyone we care for, and what helps us care for them well."
        action={
          <Button variant="secondary" size="sm" onClick={openAdd}>
            <UserPlus className="h-4 w-4" strokeWidth={1.5} /> Add family member
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        {members.map((m) => (
          <MemberCard key={m.id} member={m} onEdit={() => openEdit(m)} />
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-line bg-card/50 p-8 text-center">
        <p className="text-body-sm text-muted">
          Caring for someone else too? Add them and we&apos;ll look after them with the
          same warmth.
        </p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={openAdd}>
          <UserPlus className="h-4 w-4" strokeWidth={1.5} /> Add family member
        </Button>
      </div>

      <AddMemberDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={save} member={editing} />
    </div>
  )
}
