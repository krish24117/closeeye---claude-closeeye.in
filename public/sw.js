// Close Eye service worker.
//
// Design goal: NEVER serve a stale app shell that points at deleted hashed
// build assets — that is the classic cause of a blank screen after a deploy.
// So navigations are network-first (always fetch a fresh index.html when
// online) and only fall back to the cached shell when truly offline.
//
// Bump CACHE_NAME on any change here so the activate handler purges old caches.
const CACHE_NAME = 'closeeye-v5'

// Keep the precache list minimal + known-good. addAll() rejects the whole
// install if ANY entry 404s, which would leave users on a broken SW — so we
// only precache the shell. Icons/splash are cached on demand (cache-first).
const PRECACHE_ASSETS = ['/', '/index.html', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SW precache failed (non-fatal):', err))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

function cachePut(request, response) {
  // Only cache successful, basic (same-origin) responses
  if (response && response.ok && response.type === 'basic') {
    const clone = response.clone()
    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only same-origin GETs. Never touch Supabase/Razorpay/analytics/Twilio.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (
    url.hostname.endsWith('.supabase.co') ||
    url.hostname.endsWith('razorpay.com') ||
    url.hostname.endsWith('twilio.com')
  ) return

  // Navigations (the HTML document): network-first, fall back to cached shell.
  // This guarantees a fresh index.html (with current asset hashes) whenever
  // the device is online, so the app never boots from a stale shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      // cache:'no-store' guarantees the freshest index.html (current asset
      // hashes) on every navigation — never a stale shell from the HTTP cache.
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          // Keep the shell cache fresh for offline use
          if (response && response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone))
          }
          return response
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    )
    return
  }

  // Immutable build output + static assets: cache-first (fast, hashed URLs).
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/splash/') ||
    url.pathname.startsWith('/screenshots/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((r) => cachePut(request, r)))
    )
    return
  }

  // Everything else: network-first, fall back to cache when offline.
  event.respondWith(
    fetch(request).then((r) => cachePut(request, r)).catch(() => caches.match(request))
  )
})
