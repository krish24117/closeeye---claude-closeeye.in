import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/* ── Types ───────────────────────────────────────────────────────────── */

type Line = string | { text: string; em: true }
type SceneType = 'title' | 'scene' | 'closing'

interface Scene {
  type: SceneType
  kicker: string
  lines: Line[]
}

function lineText(l: Line): string { return typeof l === 'string' ? l : l.text }
function isEm(l: Line): boolean    { return typeof l !== 'string' && l.em }
function wordCount(l: Line): number { return lineText(l).trim().split(/\s+/).length }

/* ── Data (verbatim from Close_Eye_Founder_Story_Script_v1.md) ──────── */

const SCENES: Scene[] = [
  /* 0 — Title card */
  {
    type: 'title',
    kicker: "Founder's Story",
    lines: [
      "Hi.",
      "I'm Krishna.",
      "Not the Founder.",
      "Not the CEO.",
      "Just Krishna.",
    ],
  },
  /* 1 — Thank you */
  {
    type: 'scene', kicker: '',
    lines: [
      "Thank you for taking a few minutes to listen.",
      "Before I tell you about Close Eye,",
      "I want to tell you about one day that changed my life.",
    ],
  },
  /* 2 — The day */
  {
    type: 'scene', kicker: '',
    lines: [
      "A little while ago, on a June morning,",
      "my daughter was born.",
      "It was the happiest day of my life —",
      "and, unexpectedly, one of the loneliest.",
    ],
  },
  /* 3 — The quiet room */
  {
    type: 'scene', kicker: '',
    lines: [
      "In that room there were only a few of us.",
      "My wife. Our newborn daughter.",
      "My sister-in-law, who never left our side.",
      "And my parents.",
      "Everyone else I loved was far away.",
    ],
  },
  /* 4 — The silence */
  {
    type: 'scene', kicker: '',
    lines: [
      "There was no crowd outside the door.",
      "No phone buzzing every few minutes —",
      { text: "“Is it a boy or a girl?”  “How’s the baby?”", em: true },
      "For a few moments, everything went quiet.",
    ],
  },
  /* 5 — What loneliness feels like */
  {
    type: 'scene', kicker: '',
    lines: [
      "I held my daughter for the first time.",
      "I wanted to share that joy with the world.",
      "And I realised I had almost no one to call.",
      "For the first time, I understood",
      "what loneliness feels like",
      "in life’s most precious moment.",
    ],
  },
  /* 6 — The fear every parent carries */
  {
    type: 'scene', kicker: '',
    lines: [
      "Then a thought came —",
      "the one every parent quietly carries.",
      { text: "“What if something happens to me?”", em: true },
      "Her mother would always love her.",
      "Her grandparents would always protect her.",
      "But I wished there was something more.",
    ],
  },
  /* 7 — Not to replace. To strengthen. */
  {
    type: 'scene', kicker: '',
    lines: [
      "Not someone to replace family.",
      "Something to strengthen it.",
      "A trusted circle.",
      "A trusted presence.",
      "People who would stand beside her",
      "if life ever became hard.",
    ],
  },
  /* 8 — Millions already live with this */
  {
    type: 'scene', kicker: '',
    lines: [
      "And I realised millions of families",
      "already live with this feeling.",
      "Parents growing old.",
      "Children living oceans away.",
      "Grandparents missing birthdays.",
      "Families separated by cities, by countries, by life.",
      "Every night, someone wonders,",
      { text: "“Are they okay?”", em: true },
    ],
  },
  /* 9 — From idea to responsibility */
  {
    type: 'scene', kicker: '',
    lines: [
      "That was the moment Close Eye",
      "stopped being a startup idea.",
      "It became my responsibility.",
      "Close Eye exists so that no family",
      "faces life’s most important moments alone.",
    ],
  },
  /* 10 — What we are, and what we are not */
  {
    type: 'scene', kicker: '',
    lines: [
      "We don’t replace relationships. We strengthen them.",
      "We don’t replace sons or daughters —",
      "we help them stay present, even across distance.",
      "We don’t replace parents —",
      "we help families care for one another",
      "with dignity, trust, and compassion.",
    ],
  },
  /* 11 — What you're really joining */
  {
    type: 'scene', kicker: '',
    lines: [
      "Every visit. Every WhatsApp update.",
      "Every companion. Every conversation.",
      "Is a family trusting us.",
      "When you join Close Eye,",
      "you’re not joining a startup.",
      "You’re becoming someone’s trusted presence.",
    ],
  },
  /* 12 — Built by people, not software */
  {
    type: 'scene', kicker: '',
    lines: [
      "I made another promise that day.",
      "Close Eye should never exist only for its founders.",
      "It should grow with the people who build it.",
      "Think like an owner.",
      "Build with integrity.",
      "Protect trust.",
      "Because trust is never built by software.",
      "Trust is built by people.",
    ],
  },
  /* 13 — Family Day */
  {
    type: 'scene', kicker: '',
    lines: [
      "So every year, on the same June day,",
      "we won’t only mark a company anniversary.",
      "We’ll celebrate Family Day —",
      "a reminder of why Close Eye exists,",
      "that every request is a family,",
      "and that no technology replaces genuine human presence.",
    ],
  },
  /* 14 — Why this matters */
  {
    type: 'scene', kicker: '',
    lines: [
      "One day, I hope you’ll meet my daughter.",
      "Not because she’s our brand —",
      "but because she reminds us why this matters:",
      "every child deserves grandparents,",
      "every grandparent deserves a grandchild’s laughter,",
      "and every family deserves to stay close,",
      "no matter the distance.",
    ],
  },
  /* 15 — Welcome */
  {
    type: 'scene', kicker: '',
    lines: [
      "Thank you for believing in this mission.",
      "Thank you for becoming part of Close Eye.",
      "Together, let’s build",
      "the world’s most trusted presence network.",
    ],
  },
  /* 16 — Closing */
  {
    type: 'closing', kicker: '',
    lines: [
      "Before you enter the dashboard…",
      "I’d like you to remember one thing.",
      "Every notification you receive…",
      "Every phone call you answer…",
      "Every WhatsApp message you send…",
      "Every visit you coordinate…",
      "Every decision you make…",
      "Will represent someone’s family.",
      "Someone will sleep peacefully tonight because of your work.",
      "That is our responsibility.",
      "That is our privilege.",
      "And that is why Close Eye exists.",
      "Close Eye doesn’t replace relationships.",
      "It protects them.",
      "It strengthens them.",
      "It helps them grow, even across distance.",
      "Welcome to Close Eye.",
      "Thank you for becoming someone’s Trusted Presence.",
    ],
  },
]

const LANG_LINES: Record<'en' | 'te' | 'hi', null | string[][]> = {
  en: null, // uses SCENES above as source of truth
  te: null, // drop in translated arrays when ready
  hi: null,
}
// suppress unused warning until language tracks are added
void LANG_LINES

const STORAGE_KEY = 'ce_founder_pos'

/* ── Component ───────────────────────────────────────────────────────── */

export function FounderStoryPage() {
  const navigate = useNavigate()

  const [sceneIdx, setSceneIdx] = useState(0)
  const [lineIdx, setLineIdx]   = useState(-1) // -1 = waiting to start; 0+ = line index active
  const [playing, setPlaying]   = useState(true)
  const [fading, setFading]     = useState(false)
  const [showEnter, setShowEnter] = useState(false)
  const [showHint, setShowHint]   = useState(false)

  const reduceMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current

  // Use a ref to always read latest scene/line inside stable callbacks
  const latest = useRef({ sceneIdx, lineIdx })
  latest.current = { sceneIdx, lineIdx }

  const scene    = SCENES[sceneIdx]
  const maxLines = scene.lines.length
  const sceneDone = lineIdx >= maxLines

  /* ── Scene navigation ─────────────────────────────────────────────── */

  function goScene(idx: number) {
    if (idx < 0 || idx >= SCENES.length) return
    setFading(true)
    setShowHint(false)
    setTimeout(() => {
      setSceneIdx(idx)
      setLineIdx(-1)
      setShowEnter(false)
      setFading(false)
    }, 450)
  }

  function tapNext() {
    const { sceneIdx: si, lineIdx: li } = latest.current
    const max = SCENES[si].lines.length
    if (li >= max - 1) {
      // last line active (or scene done) → advance to next scene
      if (si < SCENES.length - 1) goScene(si + 1)
    } else {
      setLineIdx(l => l + 1)
      setShowHint(false)
    }
  }

  function tapPrev() {
    const { sceneIdx: si } = latest.current
    if (si > 0) goScene(si - 1)
  }

  /* ── Restore position on mount ────────────────────────────────────── */

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const si = parseInt(saved, 10)
      if (!isNaN(si) && si > 0 && si < SCENES.length) setSceneIdx(si)
    }
    const t = setTimeout(() => setShowHint(true), 2600)
    return () => clearTimeout(t)
  }, [])

  /* ── Save scene position ──────────────────────────────────────────── */

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(sceneIdx))
  }, [sceneIdx])

  /* ── Start line reveal after scene fades in ──────────────────────── */

  useEffect(() => {
    const id = setTimeout(() => setLineIdx(0), 500)
    return () => clearTimeout(id)
  }, [sceneIdx])

  /* ── Auto-advance lines when playing ─────────────────────────────── */

  useEffect(() => {
    if (!playing || lineIdx < 0 || lineIdx >= maxLines) return
    const wc    = wordCount(scene.lines[lineIdx])
    const dwell = reduceMotion ? 500 : Math.max(1500, 760 + wc * 250)
    const id = setTimeout(() => setLineIdx(l => l + 1), dwell)
    return () => clearTimeout(id)
  }, [lineIdx, playing, sceneIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Show "— Krishna" + "Enter dashboard" when closing completes ──── */

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
      if (e.code === 'Space')         { e.preventDefault(); setPlaying(p => !p) }
      else if (e.code === 'ArrowRight') tapNext()
      else if (e.code === 'ArrowLeft')  tapPrev()
      else if (e.key.toLowerCase() === 'r') {
        const { sceneIdx: si } = latest.current
        goScene(si)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Scene counter label ──────────────────────────────────────────── */

  const counterLabel =
    sceneIdx === 0 ? '' :
    sceneIdx === SCENES.length - 1 ? 'Closing' :
    `Scene ${sceneIdx} / ${SCENES.length - 2}`

  /* ── Render ───────────────────────────────────────────────────────── */

  return (
    <div className="ce-fs-shell">

      {/* Top bar */}
      <div className="ce-fs-topbar">
        <span className="ce-fs-counter">{counterLabel}</span>
        <button className="ce-fs-skip-btn" onClick={() => goScene(SCENES.length - 1)}>
          Skip intro →
        </button>
      </div>

      {/* Left dot rail */}
      <nav className="ce-fs-rail" aria-label="Scene navigation">
        {SCENES.map((_, i) => (
          <button
            key={i}
            className={`ce-fs-dot${i === sceneIdx ? ' cur' : i < sceneIdx ? ' done' : ''}`}
            onClick={() => goScene(i)}
            aria-label={`Go to scene ${i}`}
            aria-current={i === sceneIdx ? 'step' : undefined}
          />
        ))}
      </nav>

      {/* Left / right click zones */}
      <div className="ce-fs-navzone ce-fs-prevzone" onClick={tapPrev} aria-hidden="true" />
      <div className="ce-fs-navzone ce-fs-nextzone" onClick={tapNext} aria-hidden="true" />

      {/* Hint */}
      <div
        className={`ce-fs-hint${showHint && sceneIdx === 0 ? ' visible' : ''}`}
        aria-hidden="true"
      >
        tap right → to continue
      </div>

      {/* Main stage */}
      <main className="ce-fs-stage">
        <div
          className={[
            'ce-fs-scene',
            fading ? 'ce-fs-fading' : 'ce-fs-visible',
            scene.type === 'title'   ? 'ce-fs-title'   : '',
            scene.type === 'closing' ? 'ce-fs-closing'  : '',
          ].filter(Boolean).join(' ')}
        >
          {scene.kicker && (
            <div className={`ce-fs-kicker${lineIdx >= 0 ? ' on' : ''}`}>
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
                    isEm(line)  ? 'em'         : '',
                    titleLast   ? 'title-last'  : '',
                  ].filter(Boolean).join(' ')}
                  aria-hidden={!state ? 'true' : undefined}
                >
                  {lineText(line)}
                </p>
              )
            })}
          </div>

          {scene.type === 'closing' && (
            <p className={`ce-fs-krishna${showEnter ? ' on' : ''}`} aria-hidden={!showEnter ? 'true' : undefined}>
              — Krishna
            </p>
          )}

          {scene.type === 'closing' && (
            <button
              className={`ce-fs-enter-btn${showEnter ? ' on' : ''}`}
              onClick={() => navigate('/dashboard')}
              tabIndex={showEnter ? 0 : -1}
            >
              Enter the dashboard →
            </button>
          )}
        </div>
      </main>

      {/* Audio dock */}
      <div className="ce-fs-dock" role="region" aria-label="Narration player">
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

        <button
          className="ce-fs-dock-ic"
          onClick={() => { const { sceneIdx: si } = latest.current; goScene(si) }}
          aria-label="Replay this scene"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" fill="currentColor" />
          </svg>
        </button>

        <span className="ce-fs-dock-label">
          🎙 <strong>Founder's narration</strong> — coming soon
        </span>

        <button
          className="ce-fs-dock-ic"
          onClick={() => {
            const { sceneIdx: si } = latest.current
            if (si < SCENES.length - 1) goScene(si + 1)
          }}
          aria-label="Skip to next scene"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor" />
          </svg>
        </button>
      </div>

    </div>
  )
}
