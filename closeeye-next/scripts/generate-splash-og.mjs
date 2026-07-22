/**
 * Generates iOS splash screens, the OG/social card, and PWA manifest screenshots.
 * Splash + OG carry the "CloseEye" wordmark + tagline in premium serif, so they are rendered
 * with headless Chromium (real type) rather than sharp. Run: node scripts/generate-splash-og.mjs
 */
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
mkdirSync('public/splash', { recursive: true })
mkdirSync('public/screenshots', { recursive: true })
const markData = 'data:image/svg+xml;base64,' + readFileSync('public/brand/close-eye-icon.svg').toString('base64')

const SAGE = 'linear-gradient(170deg,#E4ECD8 0%,#D6E2C6 55%,#C7D6B2 100%)'
const FOREST = 'radial-gradient(120% 120% at 50% 30%,#173a27 0%,#0E2A1F 60%,#0a2016 100%)'
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600&display=swap');`

function page(wCss, hCss, { ground, mark, wordFill, tagFill, markPct, showTag = true, wordSize, tagSize }) {
  return `<!doctype html><html><head><meta charset="utf8"><style>${FONT}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${wCss}px;height:${hCss}px;overflow:hidden}
    .s{width:${wCss}px;height:${hCss}px;background:${ground};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(hCss*0.03)}px}
    .mark{width:${markPct}px;height:${markPct}px}
    .word{font-family:'Newsreader',Georgia,serif;font-weight:500;color:${wordFill};font-size:${wordSize}px;letter-spacing:-0.01em;line-height:1}
    .tag{font-family:'Newsreader',Georgia,serif;font-style:italic;color:${tagFill};font-size:${tagSize}px;max-width:${Math.round(wCss*0.7)}px;text-align:center;line-height:1.35}
  </style></head><body><div class="s">
    <img class="mark" src="${mark}"/>
    <div class="word">Close&nbsp;Eye</div>
    ${showTag ? `<div class="tag">The intelligence that knows the people you love.</div>` : ''}
  </div></body></html>`
}

const br = await chromium.launch()

// ── iOS splash set (portrait). cssW×cssH @dpr → device px. ──
const devices = [
  [320,568,2],[375,667,2],[414,896,2],[375,812,3],[414,896,3],[390,844,3],
  [393,852,3],[428,926,3],[430,932,3],
  [768,1024,2],[834,1112,2],[834,1194,2],[1024,1366,2],
]
const links = []
for (const [w,h,dpr] of devices) {
  const p = await br.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:dpr })
  await p.setContent(page(w,h,{ ground:SAGE, mark:markData, wordFill:'#12281d', tagFill:'#3a5142',
    markPct:Math.round(Math.min(w,h)*0.26), wordSize:Math.round(Math.min(w,h)*0.10), tagSize:Math.round(Math.min(w,h)*0.036) }), { waitUntil:'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  const file = `public/splash/apple-splash-${w*dpr}x${h*dpr}.png`
  await p.screenshot({ path: file })
  links.push({ href:`/splash/apple-splash-${w*dpr}x${h*dpr}.png`,
    media:`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)` })
  await p.close()
}
writeFileSync('public/splash/startup-links.json', JSON.stringify(links, null, 2))
console.log('✓ splash:', links.length)

// ── OG / social card 1200×630 (forest, premium) ──
{
  const p = await br.newPage({ viewport:{width:1200,height:630}, deviceScaleFactor:2 })
  await p.setContent(page(1200,630,{ ground:FOREST, mark:markData, wordFill:'#F5F4EC', tagFill:'rgba(245,244,236,0.82)',
    markPct:150, wordSize:104, tagSize:40 }), { waitUntil:'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path:'public/og-connect.png' })
  await p.close()
  console.log('✓ public/og-connect.png')
}

// ── manifest screenshots from the live Connect homepage ──
for (const [name, w, h, ff] of [['mobile',390,844,'narrow'],['desktop',1280,800,'wide']]) {
  const p = await br.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:2 })
  await p.goto('https://connect.closeeye.in/connect', { waitUntil:'networkidle' })
  await p.screenshot({ path:`public/screenshots/${name}.png` })
  await p.close()
  console.log('✓ screenshot', name, ff)
}
await br.close()
console.log('done')
