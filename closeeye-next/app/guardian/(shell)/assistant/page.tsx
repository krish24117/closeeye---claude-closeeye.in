'use client'

/**
 * Cloza for the Guardian — the same engine + UI, mounted with the Guardian's own visits (RLS-scoped
 * via their user id, exactly as the Today screen fetches them). Their day, their next stop, their
 * upcoming run — grounded, honest, with a jump into the visit itself.
 */
import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ErrorState } from '@/components/ui/states'
import { useAuth } from '@/components/auth/auth-provider'
import { fetchGuardianVisits } from '@/lib/db/guardian'
import { clozaBriefing, type ClozaContext, type GuardianSnapshot } from '@/lib/cloza/engine'
import { ClozaPanel, ClozaAnswerCard } from '@/components/cloza/cloza-panel'

const firstName = (full: string | null | undefined) => (full || '').trim().split(/\s+/)[0] || ''

export default function GuardianAssistantPage() {
  const { user } = useAuth()
  const [snap, setSnap] = React.useState<GuardianSnapshot | null>(null)
  const [error, setError] = React.useState(false)
  const uid = user?.id
  const uname = (user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || ''

  const load = React.useCallback(() => {
    if (!uid) { setSnap({ name: firstName(uname), visits: [] }); return }
    setError(false); setSnap(null)
    fetchGuardianVisits(uid).then((visits) => setSnap({ name: firstName(uname), visits })).catch(() => setError(true))
  }, [uid, uname])
  React.useEffect(() => { load() }, [load])

  if (error) return <ErrorState title="Couldn’t reach Cloza" message="Please try again in a moment." onRetry={load} retryLabel="Try again" />
  if (!snap) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>

  const ctx: ClozaContext = {
    role: 'guardian',
    scope: { role: 'guardian', userName: snap.name, page: '/guardian/assistant', dateRange: { label: 'today' } },
    guardian: snap,
  }
  const briefing = clozaBriefing(ctx)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2 text-ink">Cloza</h1>
        <p className="mt-1 text-body-sm text-muted">Your visit copilot — grounded in your schedule.</p>
      </div>
      {briefing && (
        <section className="flex flex-col gap-4">
          <p className="text-caption font-semibold uppercase tracking-widest text-muted">Your day</p>
          <ClozaAnswerCard answer={briefing} />
        </section>
      )}
      <section className="flex flex-col gap-4">
        <p className="text-caption font-semibold uppercase tracking-widest text-muted">Ask Cloza</p>
        <ClozaPanel ctx={ctx} />
      </section>
    </div>
  )
}
