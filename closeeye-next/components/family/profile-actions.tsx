'use client'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { downloadFile, brandedDocument } from '@/lib/download'
import { CURRENT_USER, MEMBERS, MEMBERSHIP, PRESENCE_MANAGER } from '@/lib/family-data'

/** Download my data — a real, immediate export of the family's Close Eye data. */
export function RequestDataButton() {
  const toast = useToast()
  function handle() {
    const members = MEMBERS.map(
      (m) => `<div class="row"><span class="label">${m.relationship}</span><span>${m.name} · ${m.age || '—'} · ${m.city}</span></div>`,
    ).join('')
    const content = brandedDocument('Your Close Eye data', `
      <h1>Your Close Eye data</h1>
      <p class="meta">Exported for ${CURRENT_USER.fullName}</p>
      <div class="card"><h2>Account</h2>
        <div class="row"><span class="label">Name</span><span>${CURRENT_USER.fullName}</span></div>
        <div class="row"><span class="label">Email</span><span>${CURRENT_USER.email}</span></div>
        <div class="row"><span class="label">Presence Manager</span><span>${PRESENCE_MANAGER.name}</span></div>
      </div>
      <div class="card"><h2>Family</h2>${members}</div>
      <div class="card"><h2>Membership</h2>
        <div class="row"><span class="label">Plan</span><span>${MEMBERSHIP.plan} · ${MEMBERSHIP.status}</span></div>
        <div class="row"><span class="label">Member since</span><span>${MEMBERSHIP.memberSince}</span></div>
      </div>`)
    downloadFile('close-eye-my-data.html', content)
    toast('Your data was exported — check your files.')
  }
  return (
    <Button variant="text" size="sm" onClick={handle}>
      Download
    </Button>
  )
}

export function ManageSessionsButton() {
  const toast = useToast()
  return (
    <Button variant="text" size="sm" onClick={() => toast("You're signed in on this device only.", 'info')}>
      Manage
    </Button>
  )
}
