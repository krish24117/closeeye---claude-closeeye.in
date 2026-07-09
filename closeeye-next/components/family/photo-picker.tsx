/* eslint-disable @next/next/no-img-element */
'use client'

import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

/**
 * Optional profile photo picker with a live preview. Emits a data URL (or null
 * when cleared). Persistence is device-local for now — see lib/local-photos.
 */
export function PhotoPicker({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function pick(file?: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      setPreview(url)
      onChange(url)
    }
    reader.readAsDataURL(file)
  }

  function clear() {
    setPreview(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-dashed border-line bg-ivory text-muted transition-colors hover:border-green hover:text-green"
        aria-label="Add a photo"
      >
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6" strokeWidth={1.5} />}
      </button>
      <div className="min-w-0">
        <p className="text-body-sm font-semibold text-ink">
          {preview ? 'Photo added' : 'Add photo'} <span className="font-normal text-muted">(optional)</span>
        </p>
        {preview ? (
          <button type="button" onClick={clear} className="mt-1 inline-flex items-center gap-1 text-caption font-semibold text-muted hover:text-error">
            <X className="h-3.5 w-3.5" strokeWidth={2} /> Remove
          </button>
        ) : (
          <p className="mt-0.5 text-caption text-muted">A friendly face makes it feel like home.</p>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  )
}
