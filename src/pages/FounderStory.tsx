import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogoLockup } from '@/components/ui/Logo'

/* ── Types ───────────────────────────────────────────────────────────── */

type Line = string | { text: string; em: true }
type SceneType = 'title' | 'scene' | 'closing'

interface Scene {
  type: SceneType
  kicker: string
  lines: Line[]
}

interface Cue { start: number; end: number; scene: number; line: number }

function lineText(l: Line): string { return typeof l === 'string' ? l : l.text }
function isEm(l: Line): boolean    { return typeof l !== 'string' && l.em }
function wordCount(l: Line): number { return lineText(l).trim().split(/\s+/).length }

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/* ── Parse WebVTT ────────────────────────────────────────────────────── */

function parseVTT(text: string): Cue[] {
  const cues: Cue[] = []
  const blocks = text.split(/\n\n+/)
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    const idLine = lines.find(l => /^scene-\d+-line-\d+$/.test(l.trim()))
    const tsLine = lines.find(l => /\d+:\d+:\d+\.\d+ --> \d+:\d+:\d+\.\d+/.test(l))
    if (!idLine || !tsLine) continue
    const m = idLine.trim().match(/scene-(\d+)-line-(\d+)/)
    if (!m) continue
    const [rawStart, rawEnd] = tsLine.split(' --> ')
    const toSec = (t: string) => {
      const parts = t.trim().split(':')
      return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])
    }
    cues.push({ scene: Number(m[1]), line: Number(m[2]), start: toSec(rawStart), end: toSec(rawEnd) })
  }
  return cues
}

/* ── Scene data — exact transcript of founder-en.mp3 ────────────────── */

const SCENES: Scene[] = [
  /* 0 — Title */
  {
    type: 'title',
    kicker: "Founder's Story",
    lines: [
      "Hi. I'm Krishna.",
      "Not the Founder.",
      "Not the CEO.",
      "Just Krishna.",
    ],
  },
  /* 1 */
  {
    type: 'scene', kicker: '',
    lines: [
      "Thank you for taking a few minutes to listen.",
      "Before I tell you about Close Eye,",
      "I want to tell you about one day that changed my life.",
    ],
  },
  /* 2 */
  {
    type: 'scene', kicker: '',
    lines: [
      "A little while ago, on the 16th of June,",
      "my daughter was born.",
      "It was the happiest day of my life.",
      "But somehow, it was also one of the loneliest.",
    ],
  },
  /* 3 */
  {
    type: 'scene', kicker: '',
    lines: [
      "In that room, there were only a few of us.",
      "My wife. Our new baby.",
      "My sister-in-law, who stayed with us the whole time.",
      "And my parents.",
      "Everyone else I loved was far away.",
    ],
  },
  /* 4 */
  {
    type: 'scene', kicker: '',
    lines: [
      "There was no crowd outside the door.",
      "No phone ringing again and again.",
      "For a few minutes, everything was quiet.",
      "I held my daughter for the first time.",
      "I wanted to tell the whole world.",
      { text: "But I realised — I had almost no one to call.", em: true },
    ],
  },
  /* 5 */
  {
    type: 'scene', kicker: '',
    lines: [
      "Then one thought came to my mind.",
      "The same thought every parent has:",
      { text: "“What will happen to her if something happens to me?”", em: true },
      "I didn’t want someone to replace her family.",
      "I wanted something that could make her family stronger.",
      "Someone she can trust — when we can’t be there.",
    ],
  },
  /* 6 */
  {
    type: 'scene', kicker: '',
    lines: [
      "Then I understood something.",
      "Millions of families feel this same way.",
      "Parents getting older.",
      "Children living far away, in other countries.",
      "Grandparents missing birthdays.",
      { text: "Every night, someone is thinking: “Are they okay?”", em: true },
    ],
  },
  /* 7 */
  {
    type: 'scene', kicker: '',
    lines: [
      "That was the moment Close Eye became real for me.",
      "It was no longer just an idea.",
      "It became my responsibility.",
      "So that no family has to face life’s big moments alone.",
    ],
  },
  /* 8 */
  {
    type: 'scene', kicker: '',
    lines: [
      "We don’t replace families. We make them stronger.",
      "We don’t replace sons and daughters.",
      "We help them stay close, even from far away.",
      "We help families care for each other —",
      "with love, respect, and trust.",
    ],
  },
  /* 9 */
  {
    type: 'scene', kicker: '',
    lines: [
      "Every visit. Every message.",
      "Every companion. Every call.",
      "Is a family trusting us.",
      "When you join Close Eye,",
      "you are not just joining a company.",
      "You are becoming someone’s trusted presence.",
    ],
  },
  /* 10 */
  {
    type: 'scene', kicker: '',
    lines: [
      "That day, I made one more promise.",
      "Close Eye should not grow only for its founders.",
      "It should grow with the people who build it.",
      "Work like an owner. Be honest. Protect trust.",
      "Because trust is not built by software.",
      "Trust is built by people.",
    ],
  },
  /* 11 */
  {
    type: 'scene', kicker: '',
    lines: [
      "Every year, on the 16th of June,",
      "we will celebrate Family Day.",
      "To remember why Close Eye exists —",
      "that every request is a real family,",
      "and that no app can replace a real person being there.",
    ],
  },
  /* 12 */
  {
    type: 'scene', kicker: '',
    lines: [
      "One day, I hope you will meet my daughter.",
      "Not because she is our brand.",
      "But because she reminds us why this work matters.",
      "Every child deserves grandparents.",
      "Every grandparent deserves a child’s laughter.",
      "And every family deserves to stay close,",
      "however far apart they live.",
    ],
  },
  /* 13 — Closing */
  {
    type: 'closing', kicker: '',
    lines: [
      "Please remember one thing.",
      "Every notification. Every call.",
      "Every visit. Every decision.",
      "Is about someone’s family.",
      "Because of your work, someone will sleep peacefully tonight.",
      "This is our responsibility.",
      "This is our honour.",
      "Welcome to Close Eye.",
      "Thank you for believing in this mission.",
      "Thank you for becoming part of Close Eye.",
      "Together, let’s build the world’s most trusted presence network.",
    ],
  },
]

const STORAGE_KEY = 'ce_founder_pos'

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function lsSet(key: string, val: string): void {
  try { localStorage.setItem(key, val) } catch { /* quota / private browsing */ }
}

/* ── Component ───────────────────────────────────────────────────────── */

export function FounderStoryPage() {
  const navigate = useNavigate()

  /* ── Scene / line state ────────────────────────────────────────────── */
  const [sceneIdx,  setSceneIdx]  = useState(0)
  const [lineIdx,   setLineIdx]   = useState(-1)
  const [playing,   setPlaying]   = useState(true)
  const [fading,    setFading]    = useState(false)
  const [showEnter, setShowEnter] = useState(false)
  const [showHint,  setShowHint]  = useState(false)

  /* ── Audio state ───────────────────────────────────────────────────── */
  // audioFailed: true only on a real load error (404 / decode fail).
  // Defaults false so the full player shows immediately and audio.play()
  // is always called directly inside the tap handler (mobile policy).
  const [audioFailed,   setAudioFailed]   = useState(false)
  const [audioPlaying,  setAudioPlaying]  = useState(false)
  const [audioTime,     setAudioTime]     = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)

  /* ── Refs ──────────────────────────────────────────────────────────── */
  const reduceMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current

  const latest = useRef({ sceneIdx, lineIdx, audioFailed, audioPlaying })
  latest.current = { sceneIdx, lineIdx, audioFailed, audioPlaying }

  const audioRef        = useRef<HTMLAudioElement | null>(null)
  const cuesRef         = useRef<Cue[]>([])
  const activeCueRef    = useRef<Cue | null>(null)
  const sceneTransitRef = useRef(false)

  const onTimeUpdate = useRef(() => {})

  const scene    = SCENES[sceneIdx] ?? SCENES[0]
  const maxLines = scene.lines.length
  const sceneDone = lineIdx >= maxLines

  /* ── Scene navigation ─────────────────────────────────────────────── */

  function goScene(idx: number) {
    if (idx < 0 || idx >= SCENES.length) return
    sceneTransitRef.current = true
    setFading(true)
    setShowHint(false)
    setTimeout(() => {
      setSceneIdx(idx)
      setLineIdx(-1)
      setShowEnter(false)
      setFading(false)
      sceneTransitRef.current = false
    }, 450)
  }

  /* ── Seek helpers — seek only, never force-play ───────────────────── */

  function seekToSceneStart(si: number) {
    const audio = audioRef.current
    const cues  = cuesRef.current
    if (audio && cues.length) {
      const c = cues.find(f => f.scene === si && f.line === 0)
      if (c) { audio.currentTime = c.start; return }
    }
    goScene(si)
  }

  function tapNext() {
    const { sceneIdx: si, lineIdx: li, audioFailed: af } = latest.current
    const audio = audioRef.current
    const cues  = cuesRef.current

    if (!af && audio && cues.length) {
      const next =
        cues.find(c => c.scene === si && c.line === li + 1) ??
        cues.find(c => c.scene === si + 1 && c.line === 0)
      if (next) { audio.currentTime = next.start; return }
    }
    const max = SCENES[si]?.lines.length ?? 0
    if (li >= max - 1) { if (si < SCENES.length - 1) goScene(si + 1) }
    else { setLineIdx(l => l + 1); setShowHint(false) }
  }

  function tapPrev() {
    const { sceneIdx: si, audioFailed: af } = latest.current
    if (!af) { seekToSceneStart(si > 0 ? si - 1 : si); return }
    if (si > 0) goScene(si - 1)
  }

  /* ── Transport controls ───────────────────────────────────────────── */

  function toggleAudio() {
    const audio = audioRef.current
    if (!audio) return
    if (latest.current.audioPlaying) {
      audio.pause()
    } else {
      audio.play().catch((err: Error) => {
        console.error('[CloseEye Audio] play() rejected:', err.name, err.message)
      })
    }
  }

  function rewind10() {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, audio.currentTime - 10)
  }

  function restart() {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    activeCueRef.current = null
    setAudioTime(0)
    goScene(0)
  }

  function replayScene() {
    const { sceneIdx: si, audioFailed: af } = latest.current
    if (!af) { seekToSceneStart(si); return }
    goScene(si)
  }

  function skipScene() {
    const { sceneIdx: si, audioFailed: af } = latest.current
    if (!af) { seekToSceneStart(si + 1); return }
    if (si < SCENES.length - 1) goScene(si + 1)
  }

  function handleScrubChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value)
    setAudioTime(v)
    const audio = audioRef.current
    if (audio) audio.currentTime = v
  }

  /* ── Mount: create Audio element + fetch VTT ─────────────────────── */

  useEffect(() => {
    const audio = new Audio('/audio/founder-en.mp3')
    audioRef.current = audio

    audio.addEventListener('error',          () => setAudioFailed(true))
    audio.addEventListener('durationchange', () => setAudioDuration(audio.duration))
    audio.addEventListener('play',           () => setAudioPlaying(true))
    audio.addEventListener('pause',          () => setAudioPlaying(false))
    audio.addEventListener('ended',          () => setAudioPlaying(false))
    audio.addEventListener('timeupdate',     () => onTimeUpdate.current())

    fetch('/audio/founder-en.vtt')
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(text => { cuesRef.current = parseVTT(text) })
      .catch(() => { /* no cues — audio plays without caption sync */ })

    return () => { audio.pause(); audio.src = '' }
  }, [])

  /* ── onTimeUpdate — audio is the single source of truth for captions ─ */

  onTimeUpdate.current = () => {
    const audio = audioRef.current
    if (!audio) return
    const t = audio.currentTime
    setAudioTime(t)

    const cues = cuesRef.current
    if (!cues.length) return

    const cue = cues.find(c => t >= c.start && t < c.end)
    if (!cue) return

    const prev = activeCueRef.current
    if (prev?.scene === cue.scene && prev?.line === cue.line) return
    activeCueRef.current = cue

    if (reduceMotion) return

    const { sceneIdx: si } = latest.current
    if (cue.scene !== si) {
      if (!sceneTransitRef.current) goScene(cue.scene)
    } else {
      setLineIdx(cue.line)
    }
  }

  /* ── Restore saved position ───────────────────────────────────────── */

  useEffect(() => {
    const saved = lsGet(STORAGE_KEY)
    if (saved) {
      const si = parseInt(saved, 10)
      if (!isNaN(si) && si > 0 && si < SCENES.length - 1) setSceneIdx(si)
    }
    const t = setTimeout(() => setShowHint(true), 2600)
    return () => clearTimeout(t)
  }, [])

  /* ── Save scene position ──────────────────────────────────────────── */

  useEffect(() => {
    lsSet(STORAGE_KEY, scene.type === 'closing' ? '0' : String(sceneIdx))
  }, [sceneIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Text-fallback: initial line reveal after scene fade-in ──────── */

  useEffect(() => {
    if (!latest.current.audioFailed) return
    const id = setTimeout(() => setLineIdx(0), 500)
    return () => clearTimeout(id)
  }, [sceneIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Text-fallback: auto-advance lines ───────────────────────────── */

  useEffect(() => {
    if (!latest.current.audioFailed) return
    if (!playing || lineIdx < 0 || lineIdx >= maxLines) return
    const cur = scene.lines[lineIdx]
    if (!cur) return
    const wc    = wordCount(cur)
    const dwell = reduceMotion ? 500 : Math.max(1500, 760 + wc * 250)
    const id = setTimeout(() => setLineIdx(l => l + 1), dwell)
    return () => clearTimeout(id)
  }, [lineIdx, playing, sceneIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Text-fallback: auto-advance scenes ──────────────────────────── */

  useEffect(() => {
    if (!latest.current.audioFailed) return
    if (!playing || !sceneDone) return
    if (scene.type === 'closing' || sceneIdx >= SCENES.length - 1) return
    const pause = reduceMotion ? 600 : 1800
    const id = setTimeout(() => goScene(sceneIdx + 1), pause)
    return () => clearTimeout(id)
  }, [sceneDone, playing, sceneIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Show dashboard button when closing completes ────────────────── */

  useEffect(() => {
    if (scene.type === 'closing' && sceneDone) {
      const id = setTimeout(() => setShowEnter(true), 800)
      return () => clearTimeout(id)
    }
    setShowEnter(false)
  }, [sceneDone, sceneIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Keyboard shortcuts ───────────────────────────────────────────── */

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Space') {
        e.preventDefault()
        if (!latest.current.audioFailed) toggleAudio()
        else setPlaying(p => !p)
      } else if (e.code === 'ArrowRight') {
        tapNext()
      } else if (e.code === 'ArrowLeft') {
        tapPrev()
      } else if (e.key.toLowerCase() === 'r') {
        replayScene()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const counterLabel =
    sceneIdx === 0 ? '' :
    sceneIdx === SCENES.length - 1 ? 'Closing' :
    `Scene ${sceneIdx} / ${SCENES.length - 2}`

  const showAudioPlayer = !audioFailed

  /* ── Render ───────────────────────────────────────────────────────── */

  return (
    <div className="ce-fs-shell">

      <div className="ce-fs-topbar">
        <span className="ce-fs-counter">{counterLabel}</span>
        <button className="ce-fs-skip-btn" onClick={() => goScene(SCENES.length - 1)}>
          Skip intro &rarr;
        </button>
      </div>

      <nav className="ce-fs-rail" aria-label="Scene navigation">
        {SCENES.map((_, i) => (
          <button
            key={i}
            className={'ce-fs-dot' + (i === sceneIdx ? ' cur' : i < sceneIdx ? ' done' : '')}
            onClick={() => {
              if (!latest.current.audioFailed) { seekToSceneStart(i); return }
              goScene(i)
            }}
            aria-label={'Go to scene ' + i}
            aria-current={i === sceneIdx ? 'step' : undefined}
          />
        ))}
      </nav>

      <div className="ce-fs-navzone ce-fs-prevzone" onClick={tapPrev} aria-hidden="true" />
      <div className="ce-fs-navzone ce-fs-nextzone" onClick={tapNext} aria-hidden="true" />

      <div className={'ce-fs-hint' + (showHint && sceneIdx === 0 ? ' visible' : '')} aria-hidden="true">
        tap right &rarr; to continue
      </div>

      <main className="ce-fs-stage">
        <div
          className={[
            'ce-fs-scene',
            fading ? 'ce-fs-fading' : 'ce-fs-visible',
            scene.type === 'title'   ? 'ce-fs-title'  : '',
            scene.type === 'closing' ? 'ce-fs-closing' : '',
          ].filter(Boolean).join(' ')}
        >
          {scene.type === 'title' && (
            <div className={'ce-fs-title-logo' + (lineIdx >= 0 ? ' on' : '')}>
              <LogoLockup fontSize={18} color="light" />
            </div>
          )}

          {scene.kicker && (
            <div className={'ce-fs-kicker' + (lineIdx >= 0 ? ' on' : '')}>
              {scene.kicker}
            </div>
          )}

          <div className="ce-fs-lines" role="region" aria-label="Narration text" aria-live="polite">
            {scene.lines.map((line, i) => {
              const state    = i < lineIdx ? 'past' : i === lineIdx ? 'active' : ''
              const titleLast = scene.type === 'title' && i === scene.lines.length - 1
              return (
                <p
                  key={i}
                  className={[
                    'ce-fs-line',
                    state,
                    isEm(line)  ? 'em'        : '',
                    titleLast   ? 'title-last' : '',
                  ].filter(Boolean).join(' ')}
                  aria-hidden={!state ? 'true' : undefined}
                >
                  {lineText(line)}
                </p>
              )
            })}
          </div>

          {scene.type === 'closing' && (
            <p className={'ce-fs-krishna' + (showEnter ? ' on' : '')} aria-hidden={!showEnter ? 'true' : undefined}>
              &mdash; Krishna
            </p>
          )}

          {scene.type === 'closing' && (
            <button
              className={'ce-fs-enter-btn' + (showEnter ? ' on' : '')}
              onClick={() => navigate('/dashboard')}
              tabIndex={showEnter ? 0 : -1}
            >
              Enter the dashboard &rarr;
            </button>
          )}

          {scene.type === 'closing' && (
            <button
              className={'ce-fs-restart-btn' + (showEnter ? ' on' : '')}
              onClick={() => { lsSet(STORAGE_KEY, '0'); goScene(0) }}
              tabIndex={showEnter ? 0 : -1}
            >
              &larr; Watch again
            </button>
          )}
        </div>
      </main>

      {/* ── Audio dock ─────────────────────────────────────────────── */}
      <div className="ce-fs-dock" role="region" aria-label="Narration player">

        {showAudioPlayer ? (
          <>
            <button className="ce-fs-dock-ic" onClick={restart} aria-label="Restart from beginning">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" fill="currentColor" />
              </svg>
            </button>

            <button className="ce-fs-dock-ic" onClick={rewind10} aria-label="Rewind 10 seconds">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" fill="currentColor" />
                <text x="12" y="15.5" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="currentColor" fontFamily="sans-serif">10</text>
              </svg>
            </button>

            <button
              className="ce-fs-dock-ic main"
              onClick={toggleAudio}
              aria-label={audioPlaying ? 'Pause narration' : 'Play narration'}
            >
              {audioPlaying ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              )}
            </button>

            <input
              type="range"
              className="ce-fs-dock-scrub"
              min={0}
              max={audioDuration > 0 ? Math.floor(audioDuration) : 189}
              step={1}
              value={Math.floor(audioTime)}
              onChange={handleScrubChange}
              aria-label="Narration progress"
            />

            <span className="ce-fs-dock-time">
              {formatTime(audioTime)}&thinsp;/&thinsp;{formatTime(audioDuration)}
            </span>

            <button className="ce-fs-dock-ic" onClick={skipScene} aria-label="Skip to next scene">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button
              className="ce-fs-dock-ic main"
              onClick={() => setPlaying(p => !p)}
              aria-label={playing ? 'Pause auto-advance' : 'Resume auto-advance'}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              )}
            </button>

            <button className="ce-fs-dock-ic" onClick={replayScene} aria-label="Replay this scene">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" fill="currentColor" />
              </svg>
            </button>

            <span className="ce-fs-dock-label">
              &#127897; <strong>Founder&apos;s narration</strong> &mdash; coming soon
            </span>

            <button className="ce-fs-dock-ic" onClick={skipScene} aria-label="Skip to next scene">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor" />
              </svg>
            </button>
          </>
        )}
      </div>

    </div>
  )
}
