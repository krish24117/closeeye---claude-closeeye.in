// Generates all Close Eye brand asset PNGs from the traced SVG paths.
// Usage: npm run brand
// Output: public/icon-only.png, public/icon-white.png,
//         public/wordmark-only.png, public/wordmark-white.png,
//         public/logo-full.png, public/logo-full-white.png

import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { VIEWBOX, RIBBON_D, PLUS_D, RING_D, GRADIENT_FROM, GRADIENT_TO, ACCENT }
  from './icons/traced-paths.mjs'

const ROOT = process.cwd()
const { x: VX, y: VY, size: VS } = VIEWBOX   // 6.20, 27.95, 229.60

// Brand colors
const GREEN_900 = '#0E2A1F'   // "close"  ← text-green-900
const GREEN_600 = '#2d6b48'   // "eye"    ← text-green-600
const WHITE     = '#ffffff'
const FONT      = "'DM Serif Display', Georgia, serif"

// ── Font ──────────────────────────────────────────────────────────────────────
// Load DM Serif Display from local @fontsource package (latin subset, 400
// normal, WOFF2). This is reliable and matches what the browser loads exactly.
function loadFont() {
  const fontPath = new URL(
    '../node_modules/@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2',
    import.meta.url
  )
  const buf = readFileSync(fontPath)
  console.log(`  Font: ${Math.round(buf.length / 1024)}KB (WOFF2 local)`)
  return buf.toString('base64')
}

function styleTag(b64) {
  return `<style>
    @font-face {
      font-family: 'DM Serif Display';
      src: url('data:font/woff2;base64,${b64}') format('woff2');
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

// Compute transform to place the icon's native viewBox into (x, y, w, w)
function iconTransform(x, y, w) {
  const s  = w / VS
  const tx = (x - VX * s).toFixed(4)
  const ty = (y - VY * s).toFixed(4)
  return `translate(${tx},${ty}) scale(${s.toFixed(6)})`
}

// ── SVG builders ──────────────────────────────────────────────────────────────

// 1. icon-only — gradient colours, transparent bg
function svgIconOnly() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VX} ${VY} ${VS} ${VS}">
  <defs>${gradDef()}</defs>
  <path d="${RIBBON_D}" fill="url(#g)" fill-rule="evenodd"/>
  <path d="${PLUS_D}"   fill="${ACCENT}"/>
  <path d="${RING_D}"   fill="${ACCENT}" fill-rule="evenodd"/>
</svg>`
}

// 2. icon-white — all white, transparent bg
function svgIconWhite() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VX} ${VY} ${VS} ${VS}">
  <path d="${RIBBON_D}" fill="${WHITE}" fill-rule="evenodd"/>
  <path d="${PLUS_D}"   fill="${WHITE}"/>
  <path d="${RING_D}"   fill="${WHITE}" fill-rule="evenodd"/>
</svg>`
}

// 3 & 4. wordmark-only / wordmark-white
// Render on a wide canvas, then auto-trim + re-pad so width = content.
// Navbar reference: font-serif text-xl tracking-tight = DM Serif Display 20px.
// For the export we use a large font, same typeface + two-tone color pattern.
function svgWordmark(style, c1, c2) {
  // Over-wide canvas; transparent right/top/bottom trimmed by sharp
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 240">
  ${style}
  <text x="24" y="185"
        text-anchor="start"
        font-family="${FONT}"
        font-size="160"
        letter-spacing="-4">
    <tspan fill="${c1}">close </tspan><tspan fill="${c2}">eye</tspan>
  </text>
</svg>`
}

// 5 & 6. logo-full / logo-full-white
// Navbar reference: <Logo w-8 h-8 /> + "close eye" text-xl tracking-tight.
//   • icon = 200px  → same 200px square in our export
//   • font-size so cap-height ≈ icon × 0.65 → 130px cap → 130/0.72 ≈ 180px font
//     (DM Serif Display cap-height-to-em ratio ≈ 0.72)
// Gap between icon right edge and text start: 44px (tight, ~one letter-width)
// Canvas is deliberately over-wide; sharp trims transparent edges + re-pads.
function svgLogoFull(style, c1, c2, iconSnippet) {
  const iX = 0, iY = 0, iW = 200
  const tf    = iconTransform(iX, iY, iW)
  const textX = iW + 44          // 244 — tight gap
  const textY = 154              // baseline: cap top ≈ 154 - 130 = 24 (flush with icon top)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 200">
  ${style}
  ${iconSnippet(tf)}
  <text x="${textX}" y="${textY}"
        text-anchor="start"
        font-family="${FONT}"
        font-size="180"
        letter-spacing="-4">
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

// ── Render pipeline ───────────────────────────────────────────────────────────
const PAD         = 28
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Loading DM Serif Display font...')
  const fontB64 = loadFont()
  const style   = styleTag(fontB64)

  const assets = [
    // Icons: render exactly at target size — viewBox already tight, no trim/pad
    { name: 'icon-only',      svg: svgIconOnly(),  w: 500,  h: 500,  trimPad: false },
    { name: 'icon-white',     svg: svgIconWhite(), w: 500,  h: 500,  trimPad: false },
    // Text assets: render on an over-wide canvas, trim transparent edges, re-add even padding
    { name: 'wordmark-only',  svg: svgWordmark(style, GREEN_900, GREEN_600), w: 1200, h: 240, trimPad: true },
    { name: 'wordmark-white', svg: svgWordmark(style, WHITE,     WHITE),     w: 1200, h: 240, trimPad: true },
    { name: 'logo-full',       svg: svgLogoFull(style, GREEN_900, GREEN_600, iconGreenSnippet), w: 1100, h: 200, trimPad: true },
    { name: 'logo-full-white', svg: svgLogoFull(style, WHITE,     WHITE,     iconWhiteSnippet), w: 1100, h: 200, trimPad: true },
  ]

  console.log('\nGenerating PNGs...')
  for (const { name, svg, w, h, trimPad } of assets) {
    const out = `${ROOT}/public/${name}.png`
    let pipe = sharp(Buffer.from(svg), { density: 288 }).resize(w, h, { fit: 'fill' })
    if (trimPad) {
      pipe = pipe
        .trim({ background: TRANSPARENT, threshold: 0 })
        .extend({ top: PAD, right: PAD, bottom: PAD, left: PAD, background: TRANSPARENT })
    }
    const info = await pipe.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(out)
    console.log(`  ✓ public/${name}.png  (${info.width}×${info.height})`)
  }

  console.log('\nDone. URLs after deploy:')
  assets.forEach(({ name }) =>
    console.log(`  https://closeeye.in/${name}.png`)
  )
}

main().catch(e => { console.error(e); process.exit(1) })
