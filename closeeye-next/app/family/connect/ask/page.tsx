'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AskCloseEyeConversation } from '@/components/family/ask-closeeye-conversation'

function AskInner() {
  const params = useSearchParams()
  const q = params.get('q') ?? undefined
  return <AskCloseEyeConversation initialQuestion={q} />
}

export default function AskCloseEyePage() {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/family/connect"
        className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Connect
      </Link>
      <div>
        <h1 className="text-h3 text-ink">Ask CloseEye</h1>
        <p className="mt-1 text-body-sm text-muted">The place that knows your family — ask anything about the people you love.</p>
      </div>
      <React.Suspense fallback={null}>
        <AskInner />
      </React.Suspense>
    </div>
  )
}
