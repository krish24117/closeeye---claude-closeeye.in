/**
 * One-time Whisper transcription script.
 * Outputs public/audio/founder-en-whisper.json with word-level timestamps.
 *
 * Run: node scripts/transcribe.mjs
 * Requires: @huggingface/transformers, node-web-audio-api
 *
 * Model: Xenova/whisper-small (~240 MB, cached after first run in ~/.cache/huggingface)
 * Expected runtime: 3-6 min on CPU.
 */

import { pipeline } from '@huggingface/transformers'
import { AudioContext } from 'node-web-audio-api'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir  = dirname(fileURLToPath(import.meta.url))
const root   = resolve(__dir, '..')
const AUDIO  = resolve(root, 'public/audio/founder-en.mp3')
const OUTPUT = resolve(root, 'public/audio/founder-en-whisper.json')

/** Decode an MP3/WAV file to a 16 kHz Float32Array using node-web-audio-api. */
async function decodeAudio(filePath, targetSampleRate = 16000) {
  const ctx    = new AudioContext({ sampleRate: targetSampleRate, latencyHint: 'playback' })
  const buffer = readFileSync(filePath)
  const decoded = await ctx.decodeAudioData(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
  // Mix down to mono if needed
  const mono = decoded.getChannelData(0)
  await ctx.close()
  return mono   // Float32Array at targetSampleRate
}

console.log('Loading Whisper model (first run downloads ~240 MB to ~/.cache/huggingface)…')

// whisper-tiny.en: ~40 MB quantized, English-only — sufficient for alignment
const asr = await pipeline(
  'automatic-speech-recognition',
  'Xenova/whisper-tiny.en',
)

console.log('Decoding audio…')
const audioData = await decodeAudio(AUDIO, 16000)

console.log(`Transcribing ${(audioData.length / 16000).toFixed(1)}s of audio…`)

const result = await asr(audioData, {
  return_timestamps: 'word',
  chunk_length_s:    30,
  stride_length_s:    5,
  language:          'english',
  task:              'transcribe',
})

writeFileSync(OUTPUT, JSON.stringify(result, null, 2), 'utf8')

const wordCount = (result.chunks ?? []).length
console.log(`Done. ${wordCount} word-level timestamps → ${OUTPUT}`)
