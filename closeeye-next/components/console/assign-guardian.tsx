'use client'

import * as React from 'react'
import { UserCog, X, Loader2 } from 'lucide-react'
import { Overlay } from '@/components/family/overlay'
import { Button } from '@/components/ui/button'
import { OptionCard } from '@/components/ui/choice'
import { useToast } from '@/components/ui/toast'
import { fetchConsoleGuardians, assignGuardian, type ConsoleGuardianLive } from '@/lib/db/console'

/**
 * Assign (or reassign) a Guardian to the next open visit, from the family
 * workspace. Lists the approved roster (RLS-scoped) as OptionCards; confirming
 * writes bookings.companion_id via assignGuardian, then refreshes the workspace.
 */
export function AssignGuardian({
  bookingId,
  currentGuardianId,
  onAssigned,
}: {
  bookingId: string
  currentGuardianId: string | null
  onAssigned: () => void
}) {
  const toast = useToast()
  const [open, setOpen] = React.useState(false)
  const [guardians, setGuardians] = React.useState<ConsoleGuardianLive[] | null>(null)
  const [selected, setSelected] = React.useState<string | null>(currentGuardianId)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setSelected(currentGuardianId)
    if (guardians) return
    fetchConsoleGuardians()
      .then((all) => setGuardians(all.filter((g) => g.status === 'approved')))
      .catch(() => setGuardians([]))
  }, [open, currentGuardianId, guardians])

  async function confirm() {
    if (!selected) return
    setSaving(true)
    try {
      await assignGuardian(bookingId, selected)
      const name = guardians?.find((g) => g.id === selected)?.name ?? 'Guardian'
      toast(`${name} assigned to this visit`, 'success')
      setOpen(false)
      onAssigned()
    } catch {
      toast('Could not assign the Guardian. Please try again.', 'info')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button variant={currentGuardianId ? 'secondary' : 'primary'} size="sm" onClick={() => setOpen(true)}>
        <UserCog className="h-4 w-4" strokeWidth={1.75} /> {currentGuardianId ? 'Reassign Guardian' : 'Assign Guardian'}
      </Button>

      <Overlay open={open} onClose={() => setOpen(false)}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-green">
              <UserCog className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <h2 className="text-h4">Assign a Guardian</h2>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-6">
          {guardians === null ? (
            <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-green" strokeWidth={2} /></div>
          ) : guardians.length === 0 ? (
            <p className="py-6 text-center text-body-sm text-muted">No approved Guardians yet. Approve an application before assigning.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {guardians.map((g) => (
                <OptionCard
                  key={g.id}
                  selected={selected === g.id}
                  title={g.name}
                  description={[g.city, g.phone].filter(Boolean).join(' · ') || undefined}
                  onClick={() => setSelected(g.id)}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={confirm} disabled={!selected || saving || selected === currentGuardianId}>
              {saving ? 'Assigning…' : 'Confirm assignment'}
            </Button>
          </div>
        </div>
      </Overlay>
    </>
  )
}
