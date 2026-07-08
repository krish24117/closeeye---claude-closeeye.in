'use client'

import * as React from 'react'
import { X, ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-react'
import { Overlay } from '@/components/family/overlay'
import { useToast } from '@/components/ui/toast'
import type { ReportPhoto } from '@/lib/visit-reports'

function dataUrlToFile(dataUrl: string, name: string): File | null {
  try {
    const [head, body] = dataUrl.split(',')
    const mime = /:(.*?);/.exec(head ?? '')?.[1] ?? 'image/jpeg'
    const bin = atob(body ?? '')
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new File([bytes], name, { type: mime })
  } catch {
    return null
  }
}

/** PhotoGallery — the visit's photos: grid, tap to expand, swipe, download, share. */
export function PhotoGallery({ photos }: { photos: ReportPhoto[] }) {
  const toast = useToast()
  const [index, setIndex] = React.useState<number | null>(null)
  const touchX = React.useRef<number | null>(null)

  const open = index !== null
  const current = open ? photos[index!] : null

  const go = React.useCallback(
    (dir: number) => setIndex((i) => (i === null ? i : (i + dir + photos.length) % photos.length)),
    [photos.length],
  )

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, go])

  async function share() {
    if (!current) return
    const file = dataUrlToFile(current.thumb, 'close-eye-photo.jpg')
    try {
      const nav = typeof navigator !== 'undefined' ? navigator : undefined
      if (file && nav && typeof nav.canShare === 'function' && nav.canShare({ files: [file] }) && typeof nav.share === 'function') {
        await nav.share({ files: [file], title: 'A photo from the visit' })
      } else {
        toast('Download the photo to share it.')
      }
    } catch {
      /* dismissed */
    }
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="block aspect-square w-full overflow-hidden rounded-md border border-line bg-ivory transition-transform hover:scale-[1.02]"
              aria-label={`View photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt="" className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <Overlay open={open} onClose={() => setIndex(null)}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-h4">{index !== null ? `Photo ${index + 1} of ${photos.length}` : 'Photo'}</h2>
          <button onClick={() => setIndex(null)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {current && (
          <div className="p-4">
            <div
              className="relative"
              onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
              onTouchEnd={(e) => {
                if (touchX.current === null) return
                const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current
                if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
                touchX.current = null
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.thumb} alt="Visit photo" className="max-h-[62vh] w-full rounded-md object-contain" />
              {photos.length > 1 && (
                <>
                  <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-ink/55 text-ivory backdrop-blur hover:bg-ink">
                    <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button onClick={() => go(1)} aria-label="Next" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-ink/55 text-ivory backdrop-blur hover:bg-ink">
                    <ChevronRight className="h-5 w-5" strokeWidth={2} />
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-center gap-2.5">
              <a
                href={current.thumb}
                download={`close-eye-photo-${index! + 1}.jpg`}
                className="inline-flex items-center gap-1.5 rounded-sm border border-ink/15 px-4 py-2 text-body-sm font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"
              >
                <Download className="h-4 w-4 text-green" strokeWidth={1.75} /> Download
              </a>
              <button
                type="button"
                onClick={share}
                className="inline-flex items-center gap-1.5 rounded-sm border border-ink/15 px-4 py-2 text-body-sm font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"
              >
                <Share2 className="h-4 w-4 text-green" strokeWidth={1.75} /> Share
              </button>
            </div>
          </div>
        )}
      </Overlay>
    </>
  )
}
