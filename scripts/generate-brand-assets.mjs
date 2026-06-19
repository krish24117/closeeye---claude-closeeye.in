// Generates all Close Eye brand asset PNGs from the traced SVG paths.
// Usage: npm run brand
// Output: public/icon-only.png, public/icon-white.png,
//         public/wordmark-only.png, public/wordmark-white.png,
//         public/logo-full.png, public/logo-full-white.png

import sharp from 'sharp'
import { VIEWBOX, RIBBON_D, PLUS_D, RING_D, GRADIENT_FROM, GRADIENT_TO, ACCENT }
  from './icons/traced-paths.mjs'

const ROOT = process.cwd()
const { x: VX, y: VY, size: VS } = VIEWBOX   // 6.20, 27.95, 229.60

// Brand colors
const GREEN_900 = '#0E2A1F'   // "close"
const GREEN_600 = '#2d6b48'   // "eye"
const WHITE     = '#ffffff'
const FONT      = "'DM Serif Display', Georgia, 'Times New Roman', serif"

// ── Font ─────────────────────────────────────────────────────────────────────
// Fetch DM Serif Display from Google Fonts as TTF, embed as base64 in SVG so
// librsvg (sharp's renderer) uses the exact brand font.
async function fetchFont() {
  try {
    // Old UA makes Google Fonts return TTF instead of WOFF2 — better librsvg compat
    const res = await fetch(
      'https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/60.0' } }
    )
    const css = await res.text()
    const m   = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/)
    if (!m) throw new Error('No font URL in CSS response')
    const fontRes = await fetch(m[1])
    const buf     = Buffer.from(await fontRes.arrayBuffer())
    console.log(`  Font: ${Math.round(buf.length / 1024)}KB`)
    return buf.toString('base64')
  } catch (e) {
    console.warn(`  Font fetch failed (${e.message}) — will use Georgia fallback`)
    return null
  }
}

function styleTag(b64) {
  if (!b64) return ''
  return `<style>
    @font-face {
      font-family: 'DM Serif Display';
      src: url('data:font/truetype;charset=utf-8;base64,${b64}') format('truetype');
      font-weight: 400;
      font-style: normal;
    }
  </style>`
}

// ── Icon helpers ──────────────────────────────────────────────────────────────
function gradDef(id = 'g') {
  return `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="${GRADIENT_FROM}"/>
      <stop offset="100%" stop-color="${GRADIENT_TO}"/>
    </linearGradient>`
}

// Compute transform to place the icon's native viewBox rect into (x, y, w, h)
function iconTransform(x, y, w) {
  const s  = w / VS
  const tx = (x - VX * s).toFixed(4)
  const ty = (y - VY * s).toFixed(4)
  return `translate(${tx},${ty}) scale(${s.toFixed(6)})`
}

// ── SVG builders ──────────────────────────────────────────────────────────────

// 1. icon-only — transparent bg, gradient colours
function svgIconOnly() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VX} ${VY} ${VS} ${VS}">
  <defs>${gradDef()}</defs>
  <path d="${RIBBON_D}" fill="url(#g)" fill-rule="evenodd"/>
  <path d="${PLUS_D}"   fill="${ACCENT}"/>
  <path d="${RING_D}"   fill="${ACCENT}" fill-rule="evenodd"/>
</svg>`
}

// 2. icon-white — transparent bg, all white
function svgIconWhite() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VX} ${VY} ${VS} ${VS}">
  <path d="${RIBBON_D}" fill="${WHITE}" fill-rule="evenodd"/>
  <path d="${PLUS_D}"   fill="${WHITE}"/>
  <path d="${RING_D}"   fill="${WHITE}" fill-rule="evenodd"/>
</svg>`
}

// 3 & 4. wordmark — "close " dark, "eye" light (or both white)
// Canvas 1000×220, font 150px, baseline y=162 (top padding ~50, bottom ~30)
function svgWordmark(style, c1, c2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 220">
  ${style}
  <text text-anchor="middle" x="500" y="162"
        font-family="${FONT}"
        font-size="150" letter-spacing="-3">
    <tspan fill="${c1}">close </tspan><tspan fill="${c2}">eye</tspan>
  </text>
</svg>`
}

// 5 & 6. full logo — icon left, wordmark right, tight gap
// Icon: 200×200 at (0, 20). Gap: 52px (≈ one letter-width at this font size).
// Text: text-anchor="start" at x=252. Canvas is over-wide (1000px); sharp
// will .trim() the transparent right/top/bottom edge, then re-add even padding.
function svgLogoFull(style, c1, c2, iconSnippet) {
  const iX = 0, iY = 20, iW = 200
  const tf    = iconTransform(iX, iY, iW)
  // Icon optical centre: iY + iW/2 = 120. Text optical centre ≈ baseline − 50.
  const textX = iX + iW + 52   // 252 — tight gap
  const textY = 170             // baseline, optical centre ≈ 120

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 240">
  ${style}
  ${iconSnippet(tf)}
  <text text-anchor="start" x="${textX}" y="${textY}"
        font-family="${FONT}"
        font-size="140" letter-spacing="-3">
    <tspan fill="${c1}">close </tspan><tspan fill="${c2}">eye</tspan>
  </text>
</svg>`
}

function iconGreenSnippet(tf) {
  return `<defs>${gradDef()}</defs>
  <g transform="${tf}">
    <path d="${RIBBON_D}" fill="url(#g)" fill-rule="evenodd"/>
    <path d="${PLUS_D}"   fill="${ACCENT}"/>
    <path d="${RING_D}"   fill="${ACCENT}" fill-rule="evenodd"/>
  </g>`
}

function iconWhiteSnippet(tf) {
  return `<g transform="${tf}">
    <path d="${RIBBON_D}" fill="${WHITE}" fill-rule="evenodd"/>
    <path d="${PLUS_D}"   fill="${WHITE}"/>
    <path d="${RING_D}"   fill="${WHITE}" fill-rule="evenodd"/>
  </g>`
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching DM Serif Display font...')
  const fontB64 = await fetchFont()
  const style   = styleTag(fontB64)

  // Logo-full assets: rendered on a generous canvas then auto-trimmed + re-padded
  // so there's no extra whitespace — the output width/height is content-driven.
  const PAD = 28  // even padding on all four sides after trim
  const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

  const assets = [
    { name: 'icon-only',       svg: svgIconOnly(),                                              w: 500,  h: 500,  trim: false },
    { name: 'icon-white',      svg: svgIconWhite(),                                             w: 500,  h: 500,  trim: false },
    { name: 'wordmark-only',   svg: svgWordmark(style, GREEN_900, GREEN_600),                   w: 1000, h: 220,  trim: false },
    { name: 'wordmark-white',  svg: svgWordmark(style, WHITE,     WHITE),                       w: 1000, h: 220,  trim: false },
    { name: 'logo-full',       svg: svgLogoFull(style, GREEN_900, GREEN_600, iconGreenSnippet), w: 1000, h: 240,  trim: true  },
    { name: 'logo-full-white', svg: svgLogoFull(style, WHITE,     WHITE,     iconWhiteSnippet), w: 1000, h: 240,  trim: true  },
  ]

  console.log('\nGenerating PNGs...')
  for (const { name, svg, w, h, trim } of assets) {
    const out = `${ROOT}/public/${name}.png`
    let pipeline = sharp(Buffer.from(svg), { density: 300 }).resize(w, h, { fit: 'fill' })

    if (trim) {
      // Remove transparent edges, then restore even padding
      pipeline = pipeline
        .trim({ background: TRANSPARENT, threshold: 0 })
        .extend({ top: PAD, right: PAD, bottom: PAD, left: PAD, background: TRANSPARENT })
    }

    const info = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(out)
    console.log(`  ✓ public/${name}.png  (${info.width}×${info.height})`)
  }

  console.log('\nDone! URLs after deploy:')
  assets.forEach(({ name }) =>
    console.log(`  https://closeeye.in/${name}.png`)
  )
}

main().catch(e => { console.error(e); process.exit(1) })
