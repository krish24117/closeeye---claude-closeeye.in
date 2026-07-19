/* CloseEye Next — minimal, safe PWA service worker.
   Strategy: precache the app shell; network-first for navigations with an
   offline fallback; stale-while-revalidate for static assets. Never caches
   API or cross-origin requests. */

const VERSION = 'closeeye-v74'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`
const OFFLINE_URL = '/offline'
const PRECACHE = ['/', OFFLINE_URL, '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api')) return

  // Navigations: network-first, fall back to cached shell / offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL).then((cache) => cache.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((c) => c || caches.match(OFFLINE_URL))),
    )
    return
  }

  // Static assets: stale-while-revalidate.
  if (/\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|avif|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            const copy = res.clone()
            caches.open(ASSETS).then((cache) => cache.put(request, copy))
            return res
          })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
})
