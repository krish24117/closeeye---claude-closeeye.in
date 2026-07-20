/**
 * Native launcher icons (Capacitor iOS + Android) from the CloseEye master mark + sage identity.
 * Matches the PWA "Variant A" icon. Run: node scripts/generate-native-icons.mjs
 * Effective only on the next NATIVE rebuild (Mac/CI) — Capacitor bundles these into the app.
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
const markSvg = readFileSync('public/brand/close-eye-icon.svg')
const SAGE_TOP = '#D6E2C6', SAGE_BOT = '#C6D5B2'

function tile(size) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SAGE_TOP}"/><stop offset="1" stop-color="${SAGE_BOT}"/></linearGradient><radialGradient id="g" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="${size}" height="${size}" fill="url(#b)"/><rect width="${size}" height="${size}" fill="url(#g)"/></svg>`)
}
async function markBuf(size, scale) {
  const m = Math.round(size * scale)
  return { buf: await sharp(markSvg, { density: 512 }).resize(m, m, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png().toBuffer(), off: Math.round((size - m) / 2) }
}
async function fullIcon(size, scale = 0.63) {
  const { buf, off } = await markBuf(size, scale)
  return sharp(tile(size)).composite([{ input: buf, left: off, top: off }]).png().toBuffer()
}
function circleMask(size) { return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}"/></svg>`) }

// ── iOS: single 1024 App Store icon (opaque, no alpha) ──
await sharp(await fullIcon(1024)).flatten({ background: SAGE_BOT }).png()
  .toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
console.log('✓ iOS AppIcon 1024')

// ── Android ──
const LEGACY = { ldpi:36, mdpi:48, hdpi:72, xhdpi:96, xxhdpi:144, xxxhdpi:192 }
const ADAPT  = { ldpi:81, mdpi:108, hdpi:162, xhdpi:216, xxhdpi:324, xxxhdpi:432 }
for (const [d, s] of Object.entries(LEGACY)) {
  const dir = `android/app/src/main/res/mipmap-${d}`; mkdirSync(dir, { recursive: true })
  const icon = await fullIcon(s, 0.66)
  writeFileSync(`${dir}/ic_launcher.png`, icon)
  writeFileSync(`${dir}/ic_launcher_round.png`, await sharp(icon).composite([{ input: circleMask(s), blend: 'dest-in' }]).png().toBuffer())
}
for (const [d, s] of Object.entries(ADAPT)) {
  const dir = `android/app/src/main/res/mipmap-${d}`; mkdirSync(dir, { recursive: true })
  // adaptive background = sage tile; foreground = mark on transparent (xml adds 16.7% inset)
  writeFileSync(`${dir}/ic_launcher_background.png`, await sharp(tile(s)).png().toBuffer())
  const { buf, off } = await markBuf(s, 0.56)
  writeFileSync(`${dir}/ic_launcher_foreground.png`,
    await sharp({ create: { width: s, height: s, channels: 4, background: { r:0,g:0,b:0,alpha:0 } } }).composite([{ input: buf, left: off, top: off }]).png().toBuffer())
}
console.log('✓ Android mipmaps (legacy + round + adaptive fg/bg) across', Object.keys(LEGACY).length, 'densities')
console.log('done')
