'use client'

import { Zap } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

/** One-click intelligence actions — wired to confirmation toasts (endpoint-ready). */
export function IntelActions({ actions }: { actions: string[] }) {
  const toast = useToast()
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {actions.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => toast(`${a} — started.`)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-ink/15 px-3 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40 hover:bg-accent-soft/30 hover:text-green"
        >
          <Zap className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> {a}
        </button>
      ))}
    </div>
  )
}
