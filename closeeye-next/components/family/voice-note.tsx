'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Voice-note playback. If `src` is given it plays the real recording; otherwise it
 * runs a functional simulated timeline (play / pause / progress / reset) so the
 * control works today and is ready for the real audio file. 12 soft bars form a
 * lightweight waveform.
 */
function useVoiceNote(duration: number, src?: string) {
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Real audio path
  useEffect(() => {
    if (!src) return
    const audio = new Audio(src)
    audioRef.current = audio
    const onTime = () => setElapsed(audio.currentTime)
    const onEnd = () => {
      setPlaying(false)
      setElapsed(0)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
      audioRef.current = null
    }
  }, [src])

  // Simulated path
  useEffect(() => {
    if (src) return
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 0.1
        if (next >= duration) {
          setPlaying(false)
          return 0
        }
        return next
      })
    }, 100)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [playing, src, duration])

  function toggle() {
    if (src && audioRef.current) {
      if (playing) audioRef.current.pause()
      else void audioRef.current.play().catch(() => setPlaying(false))
    }
    setPlaying((p) => !p)
  }

  return { playing, elapsed, duration, toggle, progress: Math.min(elapsed / duration, 1) }
}

const BARS = [8, 14, 20, 12, 24, 18, 10, 22, 16, 26, 12, 18]

function Waveform({ progress, tone }: { progress: number; tone: 'light' | 'dark' }) {
  return (
    <div className="flex flex-1 items-center gap-[3px]" aria-hidden>
      {BARS.map((h, i) => {
        const active = i / BARS.length <= progress
        return (
          <span
            key={i}
            className={cn(
              'w-[3px] rounded-full transition-colors',
              tone === 'dark' ? (active ? 'bg-ivory' : 'bg-ivory/30') : active ? 'bg-green' : 'bg-green/25',
            )}
            style={{ height: `${h}px` }}
          />
        )
      })}
    </div>
  )
}

/** Full-width voice-note card — used in updates and visit reports. */
export function VoiceNote({ label, duration = 24, src }: { label: string; duration?: number; src?: string }) {
  const v = useVoiceNote(duration, src)
  return (
    <div className="flex items-center gap-4 rounded-md border border-line bg-ivory px-4 py-3">
      <button
        type="button"
        onClick={v.toggle}
        aria-label={v.playing ? `Pause: ${label}` : `Play: ${label}`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-green text-ivory transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
      >
        {v.playing ? <Pause className="h-5 w-5" strokeWidth={2} fill="currentColor" /> : <Play className="h-5 w-5 translate-x-px" strokeWidth={2} fill="currentColor" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-semibold text-ink">{label}</p>
        <div className="mt-1.5 flex h-7 items-center">
          <Waveform progress={v.progress} tone="light" />
        </div>
      </div>
      <span className="shrink-0 text-caption tabular-nums text-muted">{fmt(v.playing || v.elapsed > 0 ? v.elapsed : v.duration)}</span>
    </div>
  )
}

/** Compact inline player — used inside message bubbles. */
export function VoiceNoteInline({ duration = 24, mine, src }: { duration?: number; mine?: boolean; src?: string }) {
  const v = useVoiceNote(duration, src)
  return (
    <span className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={v.toggle}
        aria-label={v.playing ? 'Pause voice note' : 'Play voice note'}
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full transition-transform hover:scale-105',
          mine ? 'bg-ivory/25 text-ivory' : 'bg-green text-ivory',
        )}
      >
        {v.playing ? <Pause className="h-3.5 w-3.5" strokeWidth={2} fill="currentColor" /> : <Play className="h-3.5 w-3.5 translate-x-px" strokeWidth={2} fill="currentColor" />}
      </button>
      <span className="flex h-5 w-24 items-center">
        <Waveform progress={v.progress} tone={mine ? 'dark' : 'light'} />
      </span>
      <span className={cn('text-[0.7rem] tabular-nums', mine ? 'text-ivory/80' : 'text-muted')}>
        {fmt(v.playing || v.elapsed > 0 ? v.elapsed : v.duration)}
      </span>
    </span>
  )
}
