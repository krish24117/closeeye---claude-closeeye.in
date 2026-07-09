'use client'

import * as React from 'react'
import { Play, Pause, Gauge, Download, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const BARS = [10, 16, 22, 14, 26, 20, 12, 24, 18, 28, 14, 20, 12, 22, 16, 26, 12, 18]
const SPEEDS = [1, 1.5, 2]

/**
 * VoicePlayer — a beautiful player for the Guardian's voice note. Real playback of
 * the recorded audio, seekable waveform, playback speed, a transcript placeholder
 * (auto-transcription lands with the backend) and download. Reusable.
 */
export function VoicePlayer({ src, durationSec, label }: { src: string; durationSec: number; label: string }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = React.useState(false)
  const [elapsed, setElapsed] = React.useState(0)
  const [rate, setRate] = React.useState(0)
  const [showTranscript, setShowTranscript] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    setFailed(false)
    const audio = new Audio(src)
    audioRef.current = audio
    const onTime = () => setElapsed(audio.currentTime)
    const onEnd = () => {
      setPlaying(false)
      setElapsed(0)
    }
    const onErr = () => setFailed(true)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('error', onErr)
    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('error', onErr)
      audioRef.current = null
    }
  }, [src])

  const total = audioRef.current?.duration && isFinite(audioRef.current.duration) ? audioRef.current.duration : durationSec
  const progress = Math.min(elapsed / (total || durationSec), 1)

  function toggle() {
    const a = audioRef.current
    if (!a) return
    if (playing) a.pause()
    else void a.play().catch(() => { setPlaying(false); setFailed(true) })
    setPlaying((p) => !p)
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current
    if (!a) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    a.currentTime = ratio * (total || durationSec)
    setElapsed(a.currentTime)
  }

  function cycleSpeed() {
    const next = (rate + 1) % SPEEDS.length
    setRate(next)
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next]!
  }

  return (
    <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <p className="mb-3 text-body-sm font-semibold text-ink">{label}</p>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-green text-ivory transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          {playing ? <Pause className="h-5 w-5" strokeWidth={2} fill="currentColor" /> : <Play className="h-5 w-5 translate-x-px" strokeWidth={2} fill="currentColor" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex h-8 cursor-pointer items-center gap-[3px]" onClick={seek} role="slider" aria-label="Seek" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} tabIndex={0}>
            {BARS.map((h, i) => {
              const active = i / BARS.length <= progress
              return <span key={i} className={cn('w-[3px] rounded-full transition-colors', active ? 'bg-green' : 'bg-green/25')} style={{ height: `${h}px` }} />
            })}
          </div>
          <div className="mt-1 flex items-center justify-between text-caption tabular-nums text-muted">
            <span>{fmt(elapsed)}</span>
            <span>{fmt(total || durationSec)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={cycleSpeed}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-caption font-semibold text-ink transition-colors hover:border-green/40 hover:text-green"
        >
          <Gauge className="h-3.5 w-3.5" strokeWidth={1.75} /> {SPEEDS[rate]}×
        </button>
        <button
          type="button"
          onClick={() => setShowTranscript((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-caption font-semibold text-ink transition-colors hover:border-green/40 hover:text-green"
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={1.75} /> Transcript
        </button>
        <a
          href={src}
          download={`${label.replace(/\s+/g, '-').toLowerCase()}.webm`}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-caption font-semibold text-ink transition-colors hover:border-green/40 hover:text-green"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.75} /> Download
        </a>
      </div>

      {failed && (
        <div className="mt-3 rounded-md bg-warning/[0.08] p-3.5">
          <p className="text-caption text-ink">If the player above didn&apos;t start, use this one — or tap <strong>Download</strong>:</p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls preload="metadata" src={src} className="mt-2 w-full" />
        </div>
      )}

      {showTranscript && (
        <p className="mt-3 rounded-md bg-ivory p-3.5 text-body-sm italic text-muted">
          Auto-transcription arrives with the next update — for now, give it a listen. 💚
        </p>
      )}
    </div>
  )
}
