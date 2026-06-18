const CACHE_NAME = 'closeeye-v3'

// Pre-cached on install — app shell + all PWA icons/splash
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icons/android-chrome-192x192.png',
  '/icons/android-chrome-512x512.png',
  '/icons/maskable-icon-512x512.png',
  '/splash/splash-2048x2732.png',
  '/splash/splash-1668x2388.png',
  '/splash/splash-1320x2868.png',
  '/splash/splash-1290x2796.png',
  '/splash/splash-1206x2622.png',
  '/splash/splash-1284x2778.png',
  '/splash/splash-1170x2532.png',
  '/splash/splash-1179x2556.png',
  '/splash/splash-1125x2436.png',
  '/splash/splash-750x1334.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Never intercept Supabase API, Razorpay, or analytics
  if (
    url.hostname.endsWith('.supabase.co') ||
    url.hostname.endsWith('razorpay.com') ||
    url.hostname.endsWith('twilio.com')
  ) return

  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return

  // Splash + icons: cache-first (immutable between deploys)
  if (url.pathname.startsWith('/splash/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? fetch(event.request))
    )
    return
  }

  // App shell + everything else: network-first, fall back to cache for offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
