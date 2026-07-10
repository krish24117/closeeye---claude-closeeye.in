'use client'

import { useRef, useState } from 'react'
import {
  ShieldCheck,
  Stethoscope,
  Pill,
  CreditCard,
  Phone,
  FileText,
  Lock,
  Download,
  UploadCloud,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { Button } from '@/components/ui/button'
import { DownloadButton } from '@/components/family/download-button'
import { useToast } from '@/components/ui/toast'
import { DOCUMENTS, type DocumentGroup } from '@/lib/family-data'
import { brandedDocument } from '@/lib/download'

const ICONS: Record<DocumentGroup['icon'], LucideIcon> = {
  shield: ShieldCheck,
  stethoscope: Stethoscope,
  pill: Pill,
  idcard: CreditCard,
  phone: Phone,
  file: FileText,
}

const placeholderDoc = (name: string) =>
  brandedDocument(name, `<h1>${name}</h1><p class="meta">Securely stored in your Family Space</p>
  <div class="card"><p>This is your stored copy of <strong>${name}</strong>. Your Presence Manager keeps the original safe and shares it only with the people caring for your family.</p></div>`)

export function DocumentsVault() {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<{ name: string; meta: string; file: File }[]>([])

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploads((u) => [
      ...files.map((f) => ({ name: f.name, meta: `${Math.max(1, Math.round(f.size / 1024))} KB · encrypted`, file: f })),
      ...u,
    ])
    toast(`${files.length} file${files.length > 1 ? 's' : ''} added to your vault.`)
    e.target.value = ''
  }

  function downloadUpload(file: File) {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="flex flex-col gap-8">
      <input ref={inputRef} type="file" multiple className="hidden" onChange={onFiles} aria-hidden />

      <PageHeader
        title="Documents"
        subtitle="One secure, private place for everything that matters."
        action={
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            <UploadCloud className="h-4 w-4" strokeWidth={1.5} /> Upload
          </Button>
        }
      />

      <p className="inline-flex items-center gap-2 self-start rounded-full bg-accent-soft px-3.5 py-1.5 text-caption font-medium text-green">
        <Lock className="h-3.5 w-3.5" strokeWidth={1.5} /> Encrypted &amp; visible only to your family
      </p>

      {uploads.length > 0 && (
        <section className="rounded-lg border border-line/70 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <FeatureIcon icon={UploadCloud} size="sm" />
            <h2 className="text-h4">Your uploads</h2>
          </div>
          <ul className="mt-4 flex flex-col divide-y divide-line">
            {uploads.map((item, i) => (
              <li key={item.name + i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-medium text-ink">{item.name}</p>
                  <p className="text-caption text-muted">{item.meta} · Just now</p>
                </div>
                <button aria-label={`Download ${item.name}`} onClick={() => downloadUpload(item.file)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-green hover:bg-accent-soft">
                  <Download className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {DOCUMENTS.map((group) => (
          <section key={group.category} className="rounded-lg border border-line/70 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <FeatureIcon icon={ICONS[group.icon]} size="sm" />
              <h2 className="text-h4">{group.category}</h2>
            </div>
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {group.items.map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-ink">{item.name}</p>
                    <p className="text-caption text-muted">
                      {item.meta}
                      {item.dateLabel && ` · ${item.dateLabel}`}
                    </p>
                  </div>
                  <DownloadButton iconOnly label={`Download ${item.name}`} filename={`${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`} content={placeholderDoc(item.name)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
