import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Close Eye — Capacitor native shell.
 *
 * ONE codebase. The native apps load the deployed Next.js PWA, so Android and
 * iOS reuse the exact same web application — no rewrite, no forked screens.
 *
 * V1 strategy — remote (`server.url`): the shell loads the live Vercel
 * deployment. All server features (the /api routes, SSR) keep working, and the
 * service worker caches the shell for offline use after first launch.
 *
 * Fully-bundled offline alternative: delete the `server` block, set
 * `webDir: 'out'`, and run `npm run build:mobile` (static export). See
 * docs/capacitor-setup.md for the trade-offs (App Store 4.2, offline-from-install).
 */
const config: CapacitorConfig = {
  appId: 'in.closeeye.app',
  appName: 'Close Eye',
  webDir: 'mobile-shell',
  backgroundColor: '#F6F3EC', // Close Eye warm white (ivory)
  server: {
    url: process.env.CAP_SERVER_URL ?? 'https://www.closeeye.in',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
    // Deep links: in.closeeye.app://… and https App Links resolve to routes.
    allowNavigation: ['closeeye-next.vercel.app', 'closeeye.in', '*.closeeye.in'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,       // 2s, per spec
      launchAutoHide: false,          // JS hides it once the app is interactive
      backgroundColor: '#F6F3EC',
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // Light background → dark text/icons. Re-asserted at runtime in NativeInit.
      style: 'LIGHT',
      backgroundColor: '#F6F3EC',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  android: {
    allowMixedContent: false,
    // Edge-to-edge is enabled in the native theme; NativeInit paints the bars.
  },
  ios: {
    contentInset: 'always',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
}

export default config
