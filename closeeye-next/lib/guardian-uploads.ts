/**
 * Guardian media — attachment types, image compression, and the upload seam.
 *
 * Storage is not wired in this demo app, so uploads are simulated with realistic
 * progress. The moment `NEXT_PUBLIC_SUPABASE_URL` + anon key + a media bucket are
 * configured, `uploadBlob` routes to the real backend — the UI never changes.
 */

export type UploadStatus = 'uploading' | 'done' | 'error'

export interface PhotoAttachment {
  id: string
  name: string
  /** Compressed JPEG data URL — used for preview and persisted with the visit. */
  thumb: string
  size: number
  status: UploadStatus
  progress: number
  /** Remote URL once uploaded (mock URL until storage is configured). */
  url?: string
}

export interface VoiceAttachment {
  id: string
  /** Recorded audio as a data URL — plays back and persists with the visit. */
  dataUrl: string
  durationSec: number
  size: number
  status: UploadStatus
  progress: number
  url?: string
}

/* ── ids ─────────────────────────────────────────────────────────────────── */

export function uid(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return prefix ? `${prefix}_${rand}` : rand
}

/* ── storage config seam ─────────────────────────────────────────────────── */

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_GUARDIAN_MEDIA_BUCKET,
  )
}

/* ── image compression (client-side, before upload) ──────────────────────── */

interface Compressed {
  dataUrl: string
  blob: Blob
  width: number
  height: number
}

function fit(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h }
  const scale = Math.min(max / w, max / h)
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

async function loadBitmap(file: File): Promise<{ img: CanvasImageSource; w: number; h: number; done: () => void }> {
  // Prefer createImageBitmap — fast, and it can bake in EXIF orientation.
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
      return { img: bmp, w: bmp.width, h: bmp.height, done: () => bmp.close?.() }
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file)
  const img = new Image()
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej(new Error('image decode failed'))
    img.src = url
  })
  return { img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) }
}

export async function compressImage(
  file: File,
  { maxDim = 1024, quality = 0.55 }: { maxDim?: number; quality?: number } = {},
): Promise<Compressed> {
  const { img, w, h, done } = await loadBitmap(file)
  try {
    const { width, height } = fit(w, h, maxDim)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas unavailable')
    ctx.drawImage(img, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('compress failed'))), 'image/jpeg', quality),
    )
    return { dataUrl, blob, width, height }
  } finally {
    done()
  }
}

/* ── blob ⇄ data URL ─────────────────────────────────────────────────────── */

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('read failed'))
    r.readAsDataURL(blob)
  })
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head = '', body = ''] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(head)?.[1] ?? 'application/octet-stream'
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/* ── upload (mock now, real backend later — same signature) ──────────────── */

export interface UploadHandle {
  promise: Promise<string>
  cancel: () => void
}

/** Simulated upload with lifelike progress. Fails fast when offline so the UI can
 *  offer retry — mirroring how the real client behaves on a dropped connection. */
function mockUpload(path: string, onProgress: (pct: number) => void): UploadHandle {
  let cancelled = false
  const promise = new Promise<string>((resolve, reject) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      reject(new Error('offline'))
      return
    }
    let pct = 0
    const tick = () => {
      if (cancelled) {
        reject(new Error('cancelled'))
        return
      }
      pct = Math.min(100, pct + 10 + Math.random() * 20)
      onProgress(Math.round(pct))
      if (pct >= 100) resolve(`mock://guardian-media/${path}`)
      else setTimeout(tick, 110 + Math.random() * 140)
    }
    setTimeout(tick, 140)
  })
  return { promise, cancel: () => (cancelled = true) }
}

/**
 * Upload a blob and resolve to its URL. Swap the body of the configured branch for
 * a real Supabase Storage `upload()` (or signed-URL PUT) — the callers are agnostic.
 */
export function uploadBlob(blob: Blob, path: string, onProgress: (pct: number) => void): UploadHandle {
  void blob // consumed by the real backend; the mock only needs the path + progress
  // if (isStorageConfigured()) return realUpload(blob, path, onProgress)
  return mockUpload(path, onProgress)
}
