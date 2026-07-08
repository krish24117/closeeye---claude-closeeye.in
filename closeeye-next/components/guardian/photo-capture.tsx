'use client'

import * as React from 'react'
import { Camera, X, RefreshCw, Check, AlertCircle, ImagePlus } from 'lucide-react'
import { Overlay } from '@/components/family/overlay'
import {
  compressImage,
  dataUrlToBlob,
  uid,
  uploadBlob,
  type PhotoAttachment,
} from '@/lib/guardian-uploads'

/**
 * PhotoCapture — real, mobile-first photo attachment.
 * Opens the camera or library, compresses each image client-side, shows live
 * upload progress, and lets the Guardian remove, retry, or preview. Fully
 * functional today with mock uploads; swaps to real storage with no UI change.
 */
export interface PhotoCaptureProps {
  photos: PhotoAttachment[]
  onAdd: (photo: PhotoAttachment) => void
  onPatch: (id: string, patch: Partial<PhotoAttachment>) => void
  onRemove: (id: string) => void
}

export function PhotoCapture({ photos, onAdd, onPatch, onRemove }: PhotoCaptureProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = React.useState<PhotoAttachment | null>(null)

  const startUpload = React.useCallback(
    (id: string, blob: Blob) => {
      onPatch(id, { status: 'uploading', progress: 0 })
      const { promise } = uploadBlob(blob, `${id}.jpg`, (pct) => onPatch(id, { progress: pct }))
      promise
        .then((url) => onPatch(id, { status: 'done', url, progress: 100 }))
        .catch(() => onPatch(id, { status: 'error' }))
    },
    [onPatch],
  )

  const handleFiles = React.useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
      for (const file of files) {
        const id = uid('ph')
        onAdd({ id, name: file.name, thumb: '', size: file.size, status: 'uploading', progress: 0 })
        try {
          const { dataUrl, blob } = await compressImage(file)
          onPatch(id, { thumb: dataUrl, size: blob.size })
          startUpload(id, blob)
        } catch {
          onPatch(id, { status: 'error' })
        }
      }
    },
    [onAdd, onPatch, startUpload],
  )

  const retry = React.useCallback(
    (p: PhotoAttachment) => {
      if (!p.thumb) return
      startUpload(p.id, dataUrlToBlob(p.thumb))
    },
    [startUpload],
  )

  const uploading = photos.some((p) => p.status === 'uploading')

  return (
    <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green">
          <Camera className="h-4 w-4" strokeWidth={1.75} /> Photos
        </h3>
        {photos.length > 0 && (
          <span className="text-caption font-semibold text-ink" aria-live="polite">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'} attached
          </span>
        )}
      </div>
      <p className="mt-1 text-caption text-muted">A photo says more than words. Optional, and only shared with the family.</p>

      {photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-2.5">
          {photos.map((p) => (
            <li key={p.id} className="group relative aspect-square overflow-hidden rounded-md border border-line bg-ivory">
              {p.thumb ? (
                <button
                  type="button"
                  onClick={() => p.status === 'done' && setPreview(p)}
                  className="h-full w-full"
                  aria-label={p.status === 'done' ? 'Preview photo' : 'Photo'}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumb} alt="" className="h-full w-full object-cover" />
                </button>
              ) : (
                <span className="grid h-full w-full place-items-center text-muted">
                  <ImagePlus className="h-5 w-5 animate-pulse" strokeWidth={1.5} />
                </span>
              )}

              {/* upload / error overlays */}
              {p.status === 'uploading' && (
                <span className="absolute inset-0 grid place-items-center bg-ink/45 text-ivory">
                  <span className="flex flex-col items-center gap-1">
                    <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={2} />
                    <span className="text-[0.65rem] font-bold tabular-nums">{p.progress}%</span>
                  </span>
                </span>
              )}
              {p.status === 'error' && (
                <button
                  type="button"
                  onClick={() => retry(p)}
                  className="absolute inset-0 grid place-items-center bg-error/55 text-ivory"
                  aria-label="Retry upload"
                >
                  <span className="flex flex-col items-center gap-0.5">
                    <RefreshCw className="h-4 w-4" strokeWidth={2} />
                    <span className="text-[0.6rem] font-bold uppercase">Retry</span>
                  </span>
                </button>
              )}
              {p.status === 'done' && (
                <span className="absolute bottom-1 left-1 grid h-4 w-4 place-items-center rounded-full bg-success text-ivory">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              )}

              <button
                type="button"
                onClick={() => onRemove(p.id)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/60 text-ivory backdrop-blur transition-colors hover:bg-ink"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-sm border border-ink/15 px-4 text-body-sm font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"
      >
        <Camera className="h-4 w-4 text-green" strokeWidth={1.75} /> {photos.length ? 'Add another photo' : 'Add a photo'}
      </button>

      {uploading && (
        <p className="mt-2 flex items-center gap-1.5 text-caption text-muted" aria-live="polite">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-green" strokeWidth={2} /> Saving your photos…
        </p>
      )}
      {!uploading && photos.some((p) => p.status === 'error') && (
        <p className="mt-2 flex items-center gap-1.5 text-caption text-error">
          <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} /> Some photos are saved on your device — tap a photo to retry.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        onChange={(e) => {
          void handleFiles(e.target.files)
          e.target.value = '' // allow re-selecting the same file
        }}
      />

      {/* Lightbox preview */}
      <Overlay open={Boolean(preview)} onClose={() => setPreview(null)}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-h4">Photo</h2>
          <button onClick={() => setPreview(null)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
        {preview && (
          <div className="p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.thumb} alt="Visit photo" className="max-h-[70vh] w-full rounded-md object-contain" />
          </div>
        )}
      </Overlay>
    </div>
  )
}
