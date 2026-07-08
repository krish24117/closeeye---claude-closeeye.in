'use client'

import { cn } from '@/lib/utils'

/**
 * ObservationCard — a reusable free-text observation input with soft prompts.
 * Auto-saves as the Guardian types; nothing mandatory. Media (photos, voice) is
 * captured by the dedicated `PhotoCapture` / `VoiceRecorder` components placed
 * alongside it.
 */
export interface ObservationCardProps {
  value: string
  onChange: (v: string) => void
  prompts?: string[]
  placeholder?: string
  className?: string
}

export function ObservationCard({ value, onChange, prompts = [], placeholder = 'Write in your own words…', className }: ObservationCardProps) {
  return (
    <div className={cn('rounded-lg border border-line bg-card p-5 shadow-sm', className)}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder={placeholder}
        className="w-full resize-none rounded-sm border border-line bg-ivory px-4 py-3 text-body leading-relaxed text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
      />

      {prompts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(value ? `${value.replace(/\s*$/, '')}\n${p} ` : `${p} `)}
              className="rounded-full border border-line bg-card px-3 py-1.5 text-caption font-medium text-muted transition-colors hover:border-green/40 hover:text-green"
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
