// Generates all CloseEye web/PWA icons + splash screens from the traced
// icon mark (scripts/icons/traced-paths.mjs + scripts/icons/mark.mjs) —
// the exact 4-lobed ribbon, plus accent, and ring accent from the original
// CloseEye logo, re-framed for different canvas sizes (no redesign).
//
// Usage: npm run icons
//
// Output:
//  - public/favicon.svg, public/favicon.ico
//  - public/apple-touch-icon.png
//  - public/icons/android-chrome-192x192.png
//  - public/icons/android-chrome-512x512.png
//  - public/icons/maskable-icon-512x512.png
//  - public/splash/splash-*.png (apple-touch-startup-image sources)
//  - public/og-image.png (Open Graph / Twitter card link preview)

import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { iconMarkSVG, appIconSVG, maskableIconSVG, splashSVG, ogImageSVG } from './icons/mark.mjs'

const ROOT = process.cwd()

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

// Minimal ICO writer — packs PNG-compressed images per ICONDIRENTRY
// (supported by Windows/browsers since Vista).
function buildIco(images) {
  const count = images.length
  let offset = 6 + 16 * count
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(count, 4)

  const entries = []
  const datas = []
  for (const { size, buffer } of images) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // height
    entry.writeUInt8(0, 2) // color count
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // planes
    entry.writeUInt16LE(32, 6) // bit count
    entry.writeUInt32LE(buffer.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += buffer.length
    entries.push(entry)
    datas.push(buffer)
  }
  return Buffer.concat([header, ...entries, ...datas])
}

async function main() {
  ensureDir(`${ROOT}/public/icons`)
  ensureDir(`${ROOT}/public/splash`)

  // --- Favicons -------------------------------------------------------
  console.log('Favicons')
  const faviconSvg = iconMarkSVG()
  writeFileSync(`${ROOT}/public/favicon.svg`, faviconSvg)
  console.log('  public/favicon.svg')

  const icoBuffers = []
  for (const size of [16, 32, 48]) {
    const buf = await sharp(Buffer.from(faviconSvg)).resize(size, size).png().toBuffer()
    icoBuffers.push({ size, buffer: buf })
  }
  writeFileSync(`${ROOT}/public/favicon.ico`, buildIco(icoBuffers))
  console.log('  public/favicon.ico')

  // --- Apple touch icon (opaque, brand background) ---------------------
  console.log('Apple touch icon')
  await sharp(Buffer.from(appIconSVG())).resize(180, 180).png().toFile(`${ROOT}/public/apple-touch-icon.png`)
  console.log('  public/apple-touch-icon.png')

  // --- Android / PWA manifest icons ------------------------------------
  console.log('Android / PWA icons')
  for (const size of [192, 512]) {
    await sharp(Buffer.from(faviconSvg)).resize(size, size).png().toFile(`${ROOT}/public/icons/android-chrome-${size}x${size}.png`)
    console.log(`  public/icons/android-chrome-${size}x${size}.png`)
  }
  await sharp(Buffer.from(maskableIconSVG())).resize(512, 512).png().toFile(`${ROOT}/public/icons/maskable-icon-512x512.png`)
  console.log('  public/icons/maskable-icon-512x512.png')

  // --- Splash screens (apple-touch-startup-image sources) ---------------
  console.log('Splash screens')
  const splashSizes = [
    [2048, 2732],
    [1668, 2388],
    [1170, 2532],
    [1125, 2436],
    [750, 1334],
  ]
  for (const [w, h] of splashSizes) {
    await sharp(Buffer.from(splashSVG({ width: w, height: h }))).resize(w, h).png().toFile(`${ROOT}/public/splash/splash-${w}x${h}.png`)
    console.log(`  public/splash/splash-${w}x${h}.png`)
  }

  // --- Open Graph image (link previews) ---------------------------------
  console.log('OG image')
  await sharp(Buffer.from(ogImageSVG())).resize(1200, 630).png().toFile(`${ROOT}/public/og-image.png`)
  console.log('  public/og-image.png')

  console.log('Done.')
}

main()
