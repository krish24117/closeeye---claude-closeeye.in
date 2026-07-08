'use client'

import { Globe, HelpCircle, Mail, MessageSquare, Bell, Scale, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { CONTENT_ITEMS } from '@/lib/admin-data'

const ICON: Record<string, LucideIcon> = {
  Website: Globe, FAQs: HelpCircle, 'Email templates': Mail, 'SMS templates': MessageSquare, Notifications: Bell, 'Legal pages': Scale,
}

export default function ContentPage() {
  const toast = useToast()
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Content</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Everything the world reads — website, FAQs, templates and legal pages.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONTENT_ITEMS.map((c) => {
          const Icon = ICON[c.area] ?? Globe
          return (
            <div key={c.area} className="flex flex-col rounded-lg border border-line bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-5 w-5" strokeWidth={1.5} /></span>
                <div><p className="text-h4 text-ink">{c.area}</p><p className="text-caption text-muted">{c.items} items</p></div>
              </div>
              <p className="mt-3 flex-1 text-body-sm text-muted">{c.note}</p>
              <button type="button" onClick={() => toast(`Opening the ${c.area} editor.`)} className="mt-4 inline-flex items-center gap-1 self-start text-caption font-semibold text-green hover:underline">
                Manage <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
