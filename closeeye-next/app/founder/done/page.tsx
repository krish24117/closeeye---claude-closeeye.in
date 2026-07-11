'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2, ArrowRight, MessageCircle, RefreshCw } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import { registerFounder } from '@/lib/db/founder'
import { getFounderRef, clearFounderSessionHint } from '@/lib/founder-funnel'
import { FOUNDER_SERVICE_CITY } from '@/lib/founder-journey'
import { FOUNDER_LAUNCH_LABEL } from '@/lib/launch'
import { whatsappLink } from '@/lib/site'
import { FOUNDER } from '@/lib/content'

type State = 'saving' | 'done' | 'error'

export default function FounderDonePage() {
  const router = useRouter()
  const { user, loading, refreshOnboarding } = useAuth()
  const [state, setState] = React.useState<State>('saving')
  const ran = React.useRef(false)

  const run = React.useCallback(async () => {
    if (!user) return
    setState('saving')
    const { error } = await registerFounder(user.id, { ref: getFounderRef(), serviceArea: FOUNDER_SERVICE_CITY })
    if (error) { console.error('[founder/done] registerFounder failed:', error); setState('error'); return }
    // The durable founder marker is now the authority — the fragile session hint
    // has done its job, so clear it (a shared browser must not gate someone else).
    clearFounderSessionHint()
    await refreshOnboarding()
    setState('done')
  }, [user, refreshOnboarding])

  React.useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/auth?intent=founding'); return }
    if (ran.current) return
    ran.current = true
    void run()
  }, [loading, user, router, run])

  return (
    <div className="grid min-h-dvh place-items-center bg-ivory px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <LogoMark className="h-9 w-9" />
        </div>

        {state === 'saving' && (
          <div className="flex flex-col items-center rounded-lg border border-line bg-card p-8 text-center shadow-sm">
            <Loader2 className="h-7 w-7 animate-spin text-green" strokeWidth={2} />
            <p className="mt-4 text-body-sm font-medium text-ink">Reserving your family’s place…</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center rounded-lg border border-line bg-card p-8 text-center shadow-sm">
            <h1 className="text-h4 text-ink">Almost there</h1>
            <p className="mt-2 text-body-sm leading-relaxed text-muted">We couldn’t quite finish saving your place. Please try once more — or message {FOUNDER.name} and we’ll sort it out personally.</p>
            <Button size="lg" className="mt-6 w-full" onClick={() => void run()}><RefreshCw className="h-5 w-5" strokeWidth={2} /> Try again</Button>
            <Button asChild variant="text" size="md" className="mt-2">
              <a href={whatsappLink(`Hi ${FOUNDER.name}, I was registering with Close Eye and hit a snag at the last step.`)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" strokeWidth={1.75} /> Message {FOUNDER.name}
              </a>
            </Button>
          </div>
        )}

        {state === 'done' && (
          <div className="ce-fade-in flex flex-col items-center text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-success/12 text-success"><Check className="h-8 w-8" strokeWidth={2.5} /></span>
            <h1 className="mt-6 text-h2 text-ink">Your place is reserved</h1>
            <p className="mt-3 max-w-sm text-body leading-relaxed text-muted">
              You’re among the first families joining Close Eye in Hyderabad. Your membership becomes available from <strong className="font-semibold text-ink">{FOUNDER_LAUNCH_LABEL}</strong> — there’s nothing to pay until then, and we’ll be in touch before we open.
            </p>

            <div className="mt-8 w-full">
              <Button asChild size="lg" className="w-full">
                <Link href="/family">Explore your Close Eye space <ArrowRight className="h-5 w-5" strokeWidth={2} /></Link>
              </Button>
              <p className="mt-6 text-body-sm text-muted">Have a question in the meantime?</p>
              <Button asChild variant="text" size="md" className="mt-1">
                <a href={whatsappLink(`Hi ${FOUNDER.name}, I just reserved my family’s place with Close Eye.`)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" strokeWidth={1.75} /> Message {FOUNDER.name} on WhatsApp
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
