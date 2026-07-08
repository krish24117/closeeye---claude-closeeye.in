'use client'

import { RotateCw, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { whatsappLink } from '@/lib/site'

/** Warm, human error boundary — never technical. */
export default function FamilyError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-5 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-green">
        <RotateCw className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <div>
        <h1 className="text-h3">We couldn&apos;t load today&apos;s update</h1>
        <p className="mt-3 text-body text-muted">
          Please try again — or reach your Presence Manager and we&apos;ll help right away.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <a href={whatsappLink('Hi Close Eye — I had trouble opening my Family Space.')}>
            <MessageCircle className="h-4 w-4" strokeWidth={1.5} /> Message us
          </a>
        </Button>
      </div>
    </div>
  )
}
