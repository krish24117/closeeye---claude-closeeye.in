/**
 * Generates public/audio/founder-en.vtt from Whisper JSON output.
 *
 * Run AFTER transcribe.mjs:   node scripts/align-vtt.mjs
 * Or in approximate mode:     node scripts/align-vtt.mjs --approx
 *
 * Supports two Whisper JSON formats:
 *   - nodejs-whisper / whisper.cpp:  { transcription: [{ tokens: [{ text, offsets }] }] }
 *   - @huggingface/transformers:     { chunks: [{ text, timestamp: [start, end] }] }
 *
 * Approximate mode:  distributes the 189.1s audio proportionally by word count
 * across all script lines. Useful when Whisper JSON is unavailable; replace
 * with a Whisper run later for better sync.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir    = dirname(fileURLToPath(import.meta.url))
const root     = resolve(__dir, '..')
const WHISPER  = resolve(root, 'public/audio/founder-en-whisper.json')
const OUT_VTT  = resolve(root, 'public/audio/founder-en.vtt')

const APPROX_MODE = process.argv.includes('--approx') || !existsSync(WHISPER)
const AUDIO_DURATION = 189.1  // seconds — update if you replace the mp3

/* ── Script data — exact mirror of SCENES in FounderStory.tsx ─────────────── */

const SCENES = [
  /* 0 — Title */
  { lines: ["Hi. I'm Krishna.", "Not the Founder.", "Not the CEO.", "Just Krishna."] },
  /* 1 */
  { lines: ["Thank you for taking a few minutes to listen.", "Before I tell you about Close Eye,", "I want to tell you about one day that changed my life."] },
  /* 2 */
  { lines: ["A little while ago, on the 16th of June,", "my daughter was born.", "It was the happiest day of my life.", "But somehow, it was also one of the loneliest."] },
  /* 3 */
  { lines: ["In that room, there were only a few of us.", "My wife. Our new baby.", "My sister-in-law, who stayed with us the whole time.", "And my parents.", "Everyone else I loved was far away."] },
  /* 4 */
  { lines: ["There was no crowd outside the door.", "No phone ringing again and again.", "For a few minutes, everything was quiet.", "I held my daughter for the first time.", "I wanted to tell the whole world.", "But I realised — I had almost no one to call."] },
  /* 5 */
  { lines: ["Then one thought came to my mind.", "The same thought every parent has:", "“What will happen to her if something happens to me?”", "I didn't want someone to replace her family.", "I wanted something that could make her family stronger.", "Someone she can trust — when we can't be there."] },
  /* 6 */
  { lines: ["Then I understood something.", "Millions of families feel this same way.", "Parents getting older.", "Children living far away, in other countries.", "Grandparents missing birthdays.", "Every night, someone is thinking: “Are they okay?”"] },
  /* 7 */
  { lines: ["That was the moment Close Eye became real for me.", "It was no longer just an idea.", "It became my responsibility.", "So that no family has to face life's big moments alone."] },
  /* 8 */
  { lines: ["We don't replace families. We make them stronger.", "We don't replace sons and daughters.", "We help them stay close, even from far away.", "We help families care for each other —", "with love, respect, and trust."] },
  /* 9 */
  { lines: ["Every visit. Every message.", "Every companion. Every call.", "Is a family trusting us.", "When you join Close Eye,", "you are not just joining a company.", "You are becoming someone's trusted presence."] },
  /* 10 */
  { lines: ["That day, I made one more promise.", "Close Eye should not grow only for its founders.", "It should grow with the people who build it.", "Work like an owner. Be honest. Protect trust.", "Because trust is not built by software.", "Trust is built by people."] },
  /* 11 */
  { lines: ["Every year, on the 16th of June,", "we will celebrate Family Day.", "To remember why Close Eye exists —", "that every request is a real family,", "and that no app can replace a real person being there."] },
  /* 12 */
  { lines: ["One day, I hope you will meet my daughter.", "Not because she is our brand.", "But because she reminds us why this work matters.", "Every child deserves grandparents.", "Every grandparent deserves a child's laughter.", "And every family deserves to stay close,", "however far apart they live."] },
  /* 13 — Closing (— Krishna is a visual-only element, not spoken) */
  { lines: ["Please remember one thing.", "Every notification. Every call.", "Every visit. Every decision.", "Is about someone's family.", "Because of your work, someone will sleep peacefully tonight.", "This is our responsibility.", "This is our honour.", "Welcome to Close Eye.", "Thank you for believing in this mission.", "Thank you for becoming part of Close Eye.", "Together, let's build the world's most trusted presence network."] },
]

function words(text) {
  return text.replace(/["""''…—\-]/g, ' ').trim().split(/\s+/).filter(Boolean)
}

function fmtVTT(sec) {
  const h  = Math.floor(sec / 3600)
  const m  = Math.floor((sec % 3600) / 60)
  const s  = Math.floor(sec % 60)
  const ms = Math.round((sec % 1) * 1000)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`
}

/* ── Mode 1: Approximate timing ───────────────────────────────────────────── */

function buildApproxCues() {
  const INTER_SCENE = 2.0  // seconds of silence between scenes
  const INTER_LINE  = 0.40 // seconds of silence between lines within a scene

  const totalScenes = SCENES.length
  const totalLines  = SCENES.reduce((s, sc) => s + sc.lines.length, 0)
  const totalPause  = (totalScenes - 1) * INTER_SCENE + (totalLines - totalScenes) * INTER_LINE
  const speechTime  = AUDIO_DURATION - totalPause

  // Count total words for proportional distribution
  const totalWords = SCENES.reduce((s, sc) => sc.lines.reduce((s2, l) => s2 + words(l).length, s), 0)
  const secPerWord = speechTime / totalWords

  const cues = []
  let t = 0

  for (let si = 0; si < SCENES.length; si++) {
    const sc = SCENES[si]
    for (let li = 0; li < sc.lines.length; li++) {
      const wc       = words(sc.lines[li]).length
      const duration = Math.max(0.5, wc * secPerWord)
      cues.push({ scene: si, line: li, start: t, end: t + duration })
      t += duration
      if (li < sc.lines.length - 1) t += INTER_LINE
    }
    if (si < SCENES.length - 1) t += INTER_SCENE
  }

  return cues
}

/* ── Mode 2: Whisper-based alignment ─────────────────────────────────────── */

/** Normalise raw whisper JSON into a flat array of { word, start, end }. */
function loadWhisperWords() {
  const json = JSON.parse(readFileSync(WHISPER, 'utf8'))

  // @huggingface/transformers format
  if (Array.isArray(json.chunks)) {
    return json.chunks.map(c => ({
      word:  c.text.trim(),
      start: c.timestamp[0],
      end:   c.timestamp[1] ?? c.timestamp[0] + 0.3,
    }))
  }

  // whisper.cpp / nodejs-whisper format
  if (Array.isArray(json.transcription)) {
    const out = []
    for (const seg of json.transcription) {
      if (Array.isArray(seg.tokens)) {
        for (const tok of seg.tokens) {
          if (!tok.text.trim()) continue
          out.push({
            word:  tok.text.trim(),
            start: tok.offsets.from / 1000,
            end:   tok.offsets.to   / 1000,
          })
        }
      } else {
        // Segment-level fallback (no word timestamps)
        out.push({
          word:  seg.text.trim(),
          start: seg.offsets.from / 1000,
          end:   seg.offsets.to   / 1000,
        })
      }
    }
    return out
  }

  throw new Error('Unrecognised Whisper JSON format.')
}

/** Normalise a word for fuzzy matching: lowercase, strip non-alpha. */
function norm(w) { return w.toLowerCase().replace(/[^a-z0-9']/g, '') }

function buildWhisperCues() {
  const whisperWords = loadWhisperWords()
  const cues = []
  let wi = 0  // current position in whisper word stream

  for (let si = 0; si < SCENES.length; si++) {
    const sc = SCENES[si]
    for (let li = 0; li < sc.lines.length; li++) {
      const scriptWords = words(sc.lines[li]).map(norm).filter(Boolean)
      if (!scriptWords.length) continue

      // Slide forward to find the best match window for this line
      let bestStart = wi
      let bestScore = -1

      // Search up to 60 words ahead for the match start
      for (let probe = wi; probe < Math.min(wi + 60, whisperWords.length - scriptWords.length + 1); probe++) {
        let score = 0
        for (let k = 0; k < Math.min(scriptWords.length, 3); k++) {
          if (norm(whisperWords[probe + k]?.word ?? '') === scriptWords[k]) score++
        }
        if (score > bestScore) { bestScore = score; bestStart = probe }
        if (score === 3) break
      }

      const matchStart = bestStart
      const matchEnd   = Math.min(matchStart + scriptWords.length, whisperWords.length) - 1

      const cueStart = whisperWords[matchStart]?.start ?? (cues.at(-1)?.end ?? 0) + 0.1
      const cueEnd   = whisperWords[matchEnd]?.end   ?? cueStart + 0.5

      cues.push({ scene: si, line: li, start: cueStart, end: cueEnd })
      wi = matchStart + scriptWords.length  // advance past matched words
    }
  }

  return cues
}

/* ── Generate VTT ─────────────────────────────────────────────────────────── */

function buildVTT(cues) {
  const lines = ['WEBVTT - Close Eye Founder Story\n']
  for (const c of cues) {
    lines.push(`scene-${c.scene}-line-${c.line}`)
    lines.push(`${fmtVTT(c.start)} --> ${fmtVTT(c.end)}`)
    lines.push(SCENES[c.scene].lines[c.line])
    lines.push('')
  }
  return lines.join('\n')
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

if (APPROX_MODE) {
  console.log('Using approximate word-rate timing (no Whisper JSON found). Run transcribe.mjs first for accurate sync.')
}

const cues = APPROX_MODE ? buildApproxCues() : buildWhisperCues()
const vtt  = buildVTT(cues)
writeFileSync(OUT_VTT, vtt, 'utf8')

const firstCue = cues[0]
const lastCue  = cues.at(-1)
console.log(`${APPROX_MODE ? 'Approximate' : 'Whisper-aligned'} VTT written: ${cues.length} cues, ${fmtVTT(firstCue.start)} → ${fmtVTT(lastCue.end)} → ${OUT_VTT}`)
