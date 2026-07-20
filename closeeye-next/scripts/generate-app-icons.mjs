/**
 * Generates the CloseEye app-icon family from the master mark (public/brand/close-eye-icon.svg).
 * Founder-approved identity (2026-07-20): DEFAULT = "Variant A" — soft sage tile, green mark,
 * no shadow, larger mark (Apple-Health calm). Secondary = forest/reversed premium variant.
 *
 * Run: node scripts/generate-app-icons.mjs   (requires sharp, already a dependency)
 * Deterministic — safe to re-run; overwrites the generated files in public/.
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const ICON = 'public/brand/close-eye-icon.svg'
const markSvg = readFileSync(ICON)
mkdirSync('public/icons', { recursive: true })

// ── palette ──
const SAGE_TOP = '#D6E2C6', SAGE_BOT = '#C6D5B2'
const FOREST_TOP = '#123725', FOREST_BOT = '#0C2419'
const IVORY = { r: 245, g: 244, b: 236 }

function tileSvg(size, top, bot) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs>
        <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/>
        </linearGradient>
        <radialGradient id="g" cx="50%" cy="38%" r="65%">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#b)"/>
      <rect width="${size}" height="${size}" fill="url(#g)"/>
    </svg>`,
  )
}

async function mark(size, scale, colour /* undefined = brand gradient */) {
  const m = Math.round(size * scale)
  let buf = await sharp(markSvg, { density: 512 })
    .resize(m, m, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  if (colour) {
    buf = await sharp(buf)
      .composite([{ input: { create: { width: m, height: m, channels: 4, background: { ...colour, alpha: 1 } } }, blend: 'in' } ])
      .png()
      .toBuffer()
  }
  return { buf, m, off: Math.round((size - m) / 2) }
}

// bg: 'sage' | 'forest' ; markScale is fraction of tile
async function icon(size, { bg = 'sage', markScale = 0.63 } = {}) {
  const tile = bg === 'forest' ? tileSvg(size, FOREST_TOP, FOREST_BOT) : tileSvg(size, SAGE_TOP, SAGE_BOT)
  const { buf, off } = await mark(size, markScale, bg === 'forest' ? IVORY : undefined)
  return sharp(tile).composite([{ input: buf, left: off, top: off }]).png().toBuffer()
}

async function write(path, buffer) { writeFileSync(path, buffer); console.log('✓', path) }

// ── DEFAULT sage icons (any-purpose) ──
for (const s of [96, 192, 256, 384, 512]) {
  await write(`public/icons/icon-${s}x${s}.png`, await icon(s))
}
// keep the historical android-chrome names the manifest referenced (overwrite w/ new art)
await write('public/icons/android-chrome-192x192.png', await icon(192))
await write('public/icons/android-chrome-512x512.png', await icon(512))
// apple-touch (opaque, no alpha)
await write('public/apple-touch-icon.png', await sharp(await icon(180)).flatten({ background: SAGE_BOT }).png().toBuffer())

// ── MASKABLE: mark held well inside the inner 80% safe circle (full-bleed sage) ──
await write('public/icons/maskable-icon-512x512.png', await icon(512, { markScale: 0.46 }))

// ── MONOCHROME (Android 13 themed icons): single-colour mark silhouette on transparent, padded ──
{
  const size = 512
  const { buf, off } = await mark(size, 0.60, { r: 26, g: 45, b: 34 })
  await write('public/icons/icon-monochrome-512x512.png',
    await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: buf, left: off, top: off }]).png().toBuffer())
}

// ── SECONDARY forest/premium variant ──
await write('public/icons/icon-forest-512x512.png', await icon(512, { bg: 'forest' }))

// ── favicons (mark on sage tile, small) ──
for (const s of [16, 32, 48]) await write(`public/favicon-${s}.png`, await icon(s, { markScale: 0.66 }))

// ── Safari pinned-tab: monochrome vector mark ──
{
  const svg = readFileSync(ICON, 'utf8').replace(/fill="url\(#a\)"/g, 'fill="#0E2A1F"')
  writeFileSync('public/mask-icon.svg', svg); console.log('✓ public/mask-icon.svg')
}

console.log('\nApp-icon family generated.')
