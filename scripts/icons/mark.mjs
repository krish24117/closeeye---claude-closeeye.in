// SVG builders for the CloseEye icon mark — the exact 4-lobed ribbon
// (with hollow star center), plus accent, and ring accent traced from
// public/CLOSEEYELOGO.PNG.jpeg (see traced-paths.mjs). No shapes are
// redrawn here; these only vary background/scale/canvas per output target.

import { VIEWBOX, MAX_RADIUS, RIBBON_D, PLUS_D, RING_D, GRADIENT_FROM, GRADIENT_TO, ACCENT } from './traced-paths.mjs'

const BG_FROM = '#0E2A1F'
const BG_MID = '#1a3a2a'
const BG_TO = '#1f4a32'

// W3C maskable-icon safe zone: central circle of 80% of the canvas diameter
// (radius = 40% of the canvas size). Shrink the mark so its farthest traced
// point sits inside that circle, with a small safety margin.
const MASKABLE_SCALE = (0.4 * VIEWBOX.size / MAX_RADIUS) * 0.95

function defs() {
  return `<defs>
    <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${GRADIENT_FROM}"/>
      <stop offset="100%" stop-color="${GRADIENT_TO}"/>
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${BG_FROM}"/>
      <stop offset="60%" stop-color="${BG_MID}"/>
      <stop offset="100%" stop-color="${BG_TO}"/>
    </linearGradient>
  </defs>`
}

function markPaths() {
  return `<path d="${RIBBON_D}" fill="url(#ribbonGrad)" fill-rule="evenodd"/>
    <path d="${PLUS_D}" fill="${ACCENT}"/>
    <path d="${RING_D}" fill="${ACCENT}" fill-rule="evenodd"/>`
}

// Transparent background, mark only — favicon.svg / favicon.ico sources,
// android-chrome-*.png.
export function iconMarkSVG() {
  const { x, y, size } = VIEWBOX
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${size} ${size}">
${defs()}
${markPaths()}
</svg>`
}

// Full-bleed brand background + mark, full size — apple-touch-icon.png.
export function appIconSVG() {
  const { x, y, size } = VIEWBOX
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${size} ${size}">
${defs()}
<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="url(#bgGrad)"/>
${markPaths()}
</svg>`
}

// Brand background + mark scaled into the maskable safe zone — maskable-icon-512x512.png.
export function maskableIconSVG() {
  const { x, y, size } = VIEWBOX
  const cx = x + size / 2
  const cy = y + size / 2
  const s = MASKABLE_SCALE.toFixed(4)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${size} ${size}">
${defs()}
<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="url(#bgGrad)"/>
<g transform="translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})">
${markPaths()}
</g>
</svg>`
}

// Brand background + centered mark at splash scale — apple-touch-startup-image sources.
export function splashSVG({ width, height }) {
  const { x, y, size } = VIEWBOX
  const cx = x + size / 2
  const cy = y + size / 2
  const markSize = Math.min(width, height) * 0.34
  const s = (markSize / size).toFixed(4)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${defs()}
<rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
<g transform="translate(${width / 2} ${height / 2}) scale(${s}) translate(${-cx} ${-cy})">
${markPaths()}
</g>
</svg>`
}

// Brand background + centered mark, 1200x630 — public/og-image.png (link previews).
export function ogImageSVG() {
  return splashSVG({ width: 1200, height: 630 })
}
