// Generates the PWA / Play Store icon set + store screenshots required by
// PWABuilder to build the Android APK. Rendered from the SAME vector mark as
// the existing favicons (scripts/icons/mark.mjs) so they stay crisp and on
// brand at every size — no upscaling of a small PNG.
//
// Usage: npm run pwa-icons
//
// Output:
//  - public/icons/icon-{72,96,128,144,152,192,384,512}.png  (purpose: any, opaque)
//  - public/icons/icon-512-maskable.png                      (purpose: maskable)
//  - public/screenshots/screen1.png, screen2.png             (1280x720, store listing)

import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { iconMarkSVG, appIconSVG, maskableIconSVG } from './icons/mark.mjs'

const ROOT = process.cwd()
const BRAND = { r: 14, g: 42, b: 31, alpha: 1 } // #0E2A1F (manifest background_color)
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function main() {
  mkdirSync(`${ROOT}/public/icons`, { recursive: true })
  mkdirSync(`${ROOT}/public/screenshots`, { recursive: true })

  // --- Standard "any" icons (opaque brand background) ------------------
  console.log('PWA icons')
  const appSvg = Buffer.from(appIconSVG())
  for (const size of SIZES) {
    await sharp(appSvg).resize(size, size).png().toFile(`${ROOT}/public/icons/icon-${size}.png`)
    console.log(`  public/icons/icon-${size}.png`)
  }

  // --- Maskable icon (safe-zone padded, for Android adaptive icons) ----
  await sharp(Buffer.from(maskableIconSVG())).resize(512, 512).png()
    .toFile(`${ROOT}/public/icons/icon-512-maskable.png`)
  console.log('  public/icons/icon-512-maskable.png')

  // --- Store screenshots (1280x720) ------------------------------------
  console.log('Screenshots')
  const mark = await sharp(Buffer.from(iconMarkSVG())).resize(150, 150).png().toBuffer()
  const shots = [
    { file: 'screen1.png', title: 'Close Eye', sub: 'When you cannot be there, Close Eye can.' },
    { file: 'screen2.png', title: 'Real visits. Real reports.', sub: 'Verified wellbeing visits for your loved ones in India.' },
  ]
  for (const s of shots) {
    const text = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
        <text x="640" y="438" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-weight="700" fill="#ffffff">${escapeXml(s.title)}</text>
        <text x="640" y="492" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#a7d7bf">${escapeXml(s.sub)}</text>
        <text x="640" y="676" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#4e6f5e">closeeye.in</text>
      </svg>`
    )
    await sharp({ create: { width: 1280, height: 720, channels: 4, background: BRAND } })
      .composite([
        { input: mark, top: 200, left: 565 },
        { input: text, top: 0, left: 0 },
      ])
      .png()
      .toFile(`${ROOT}/public/screenshots/${s.file}`)
    console.log(`  public/screenshots/${s.file}`)
  }

  console.log('Done.')
}

main()
