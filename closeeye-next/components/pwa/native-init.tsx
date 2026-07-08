'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'

/**
 * One-time native shell setup. No-op on the web (guarded by isNativePlatform),
 * so the same component ships in the single codebase. Handles: status bar paint,
 * splash dismissal once the app is interactive, Android hardware back button,
 * and deep-link routing.
 */
export function NativeInit() {
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const cleanups: Array<() => void> = []

    ;(async () => {
      // Status bar — dark content on the ivory ground (Style.Light = dark text).
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: Style.Light })
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#F6F3EC' })
          await StatusBar.setOverlaysWebView({ overlay: false })
        }
      } catch {
        /* status bar plugin unavailable */
      }

      // Dismiss the native splash now that the web app is mounted.
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide({ fadeOutDuration: 250 })
      } catch {
        /* splash plugin unavailable */
      }

      // Android hardware back: go back in history, or exit at the root.
      try {
        const { App } = await import('@capacitor/app')
        const back = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack && window.history.length > 1) window.history.back()
          else App.exitApp()
        })
        cleanups.push(() => void back.remove())

        // Deep links: in.closeeye.app://<path> or an https App Link → route.
        const opened = await App.addListener('appUrlOpen', ({ url }) => {
          try {
            const u = new URL(url)
            const path = `${u.pathname}${u.search}${u.hash}`
            if (path && path !== '/') router.push(path)
          } catch {
            /* non-URL payload */
          }
        })
        cleanups.push(() => void opened.remove())
      } catch {
        /* app plugin unavailable */
      }
    })()

    return () => cleanups.forEach((fn) => fn())
  }, [router])

  return null
}
