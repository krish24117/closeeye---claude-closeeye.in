'use client'

import * as React from 'react'
import { Mic, Square, Pause, Play, Trash2, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { VoiceNote } from '@/components/family/voice-note'
import { blobToDataUrl, dataUrlToBlob, uid, uploadBlob, type VoiceAttachment } from '@/lib/guardian-uploads'
import { cn } from '@/lib/utils'

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? ''
}

/**
 * VoiceRecorder — a real, on-brand voice note.
 * Requests the mic, records with a live timer, supports pause / resume / stop,
 * plays back before keeping, and allows delete / re-record. Uploads with progress
 * and retries gracefully offline. Auto-saves with the visit (never a "Save" button).
 */
export interface VoiceRecorderProps {
  voice: VoiceAttachment | null
  onSet: (voice: VoiceAttachment | null) => void
  onPatch: (patch: Partial<VoiceAttachment>) => void
  /** Booking id → the voice note uploads to visit-audio/<bookingId>/… for real. */
  bookingId: string
}

type Mode = 'idle' | 'recording' | 'paused'

function audioExt(mime: string): string {
  if (mime.includes('mp4')) return 'm4a'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('mpeg')) return 'mp3'
  return 'webm'
}

export function VoiceRecorder({ voice, onSet, onPatch, bookingId }: VoiceRecorderProps) {
  const [mode, setMode] = React.useState<Mode>('idle')
  const [seconds, setSeconds] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const [supported, setSupported] = React.useState(true)
  const [canPause, setCanPause] = React.useState(false)

  const recRef = React.useRef<MediaRecorder | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const secondsRef = React.useRef(0)

  React.useEffect(() => {
    const ok = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window !== 'undefined' && 'MediaRecorder' in window
    setSupported(ok)
    setCanPause(ok && 'pause' in MediaRecorder.prototype)
  }, [])

  const stopStream = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // Tick the timer while actively recording.
  React.useEffect(() => {
    if (mode !== 'recording') return
    const id = setInterval(() => {
      secondsRef.current += 1
      setSeconds(secondsRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, [mode])

  // Release the mic on unmount.
  React.useEffect(
    () => () => {
      try {
        if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
      } catch {
        /* ignore */
      }
      stopStream()
    },
    [stopStream],
  )

  const beginUpload = React.useCallback(
    (blob: Blob, id: string) => {
      const { promise } = uploadBlob(blob, `${id}.${audioExt(blob.type)}`, (pct) => onPatch({ progress: pct }), { bucket: 'visit-audio', bookingId })
      promise.then((url) => onPatch({ status: 'done', url, progress: 100 })).catch(() => onPatch({ status: 'error' }))
    },
    [onPatch, bookingId],
  )

  const start = React.useCallback(async () => {
    setError(null)
    onSet(null)
    if (!supported) {
      setError('unsupported')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = pickMime()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        const dur = secondsRef.current
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        stopStream()
        if (!blob.size) return
        const id = uid('vn')
        void blobToDataUrl(blob).then((dataUrl) => {
          onSet({ id, dataUrl, durationSec: Math.max(1, dur), size: blob.size, status: 'uploading', progress: 0 })
          beginUpload(blob, id)
        })
      }
      recRef.current = rec
      secondsRef.current = 0
      setSeconds(0)
      rec.start()
      setMode('recording')
    } catch {
      setError('mic')
      stopStream()
    }
  }, [supported, onSet, stopStream, beginUpload])

  const pause = React.useCallback(() => {
    try {
      recRef.current?.pause()
      setMode('paused')
    } catch {
      /* ignore */
    }
  }, [])

  const resume = React.useCallback(() => {
    try {
      recRef.current?.resume()
      setMode('recording')
    } catch {
      /* ignore */
    }
  }, [])

  const stop = React.useCallback(() => {
    try {
      recRef.current?.stop()
    } catch {
      /* ignore */
    }
    setMode('idle')
  }, [])

  const retry = React.useCallback(() => {
    if (!voice) return
    onPatch({ status: 'uploading', progress: 0 })
    beginUpload(dataUrlToBlob(voice.dataUrl), voice.id)
  }, [voice, onPatch, beginUpload])

  /* ── recorded result ─────────────────────────────────────────────── */
  if (voice) {
    return (
      <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green">
          <Mic className="h-4 w-4" strokeWidth={1.75} /> Voice note
        </h3>
        <div className="mt-3">
          <VoiceNote label="Your voice note" duration={voice.durationSec} src={voice.dataUrl} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <UploadChip status={voice.status} progress={voice.progress} onRetry={retry} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSet(null)}
              className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-sm border border-ink/15 px-3 text-caption font-semibold text-ink transition-colors hover:border-error/40 hover:text-error"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} /> Delete
            </button>
            <button
              type="button"
              onClick={() => void start()}
              className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-sm border border-ink/15 px-3 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"
            >
              <RefreshCw className="h-4 w-4 text-green" strokeWidth={1.75} /> Re-record
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── active recording ────────────────────────────────────────────── */
  if (mode === 'recording' || mode === 'paused') {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/5 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-body-sm font-semibold text-warning" aria-live="polite">
            <span className={cn('h-2.5 w-2.5 rounded-full bg-warning', mode === 'recording' && 'animate-pulse')} />
            {mode === 'paused' ? 'Paused' : 'Recording'}
          </span>
          <span className="text-h4 tabular-nums text-ink">{fmt(seconds)}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {canPause &&
            (mode === 'recording' ? (
              <button
                type="button"
                onClick={pause}
                className="flex min-h-[3rem] items-center justify-center gap-2 rounded-sm border border-ink/15 text-body-sm font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"
              >
                <Pause className="h-4 w-4" strokeWidth={2} /> Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={resume}
                className="flex min-h-[3rem] items-center justify-center gap-2 rounded-sm border border-ink/15 text-body-sm font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"
              >
                <Play className="h-4 w-4" strokeWidth={2} fill="currentColor" /> Resume
              </button>
            ))}
          <button
            type="button"
            onClick={stop}
            className={cn(
              'flex min-h-[3rem] items-center justify-center gap-2 rounded-sm bg-ink text-ivory text-body-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
              !canPause && 'col-span-2',
            )}
          >
            <Square className="h-4 w-4" strokeWidth={2} fill="currentColor" /> Stop &amp; keep
          </button>
        </div>
      </div>
    )
  }

  /* ── idle ─────────────────────────────────────────────────────────── */
  return (
    <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green">
        <Mic className="h-4 w-4" strokeWidth={1.75} /> Voice note
      </h3>
      <p className="mt-1 text-caption text-muted">Sometimes a warm voice carries what words can&apos;t. Optional.</p>

      {error === 'unsupported' || !supported ? (
        <p className="mt-3 flex items-center gap-1.5 text-caption text-muted">
          <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} /> Voice recording isn&apos;t supported on this browser.
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void start()}
            className="mt-3 flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-sm border border-ink/15 px-4 text-body-sm font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"
          >
            <Mic className="h-4 w-4 text-green" strokeWidth={1.75} /> Record a voice note
          </button>
          {error === 'mic' && (
            <p className="mt-2 flex items-center gap-1.5 text-caption text-error">
              <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} /> We couldn&apos;t reach your microphone. Allow mic access, then try again.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function UploadChip({ status, progress, onRetry }: { status: VoiceAttachment['status']; progress: number; onRetry: () => void }) {
  if (status === 'uploading')
    return (
      <span className="inline-flex items-center gap-1.5 text-caption font-medium text-muted" aria-live="polite">
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-green" strokeWidth={2} /> Saving… {progress}%
      </span>
    )
  if (status === 'error')
    return (
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 text-caption font-semibold text-error hover:underline">
        <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} /> Saved on device · Retry
      </button>
    )
  return (
    <span className="inline-flex items-center gap-1.5 text-caption font-medium text-success">
      <Check className="h-3.5 w-3.5" strokeWidth={3} /> Saved
    </span>
  )
}
