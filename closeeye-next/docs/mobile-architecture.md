# Mobile Architecture — Close Eye on Android & iOS

## One codebase

Close Eye ships web, Android and iOS from a **single Next.js codebase**. There is no
React Native, no Flutter, no second UI. Capacitor wraps the existing PWA in a native
shell and injects a JS bridge; the same React components render on every platform.

```
Next.js PWA  ──build──▶  Vercel (web)
     │
     └── Capacitor shell ──▶  Android (android/)   ──▶  Google Play
                          └▶  iOS     (ios/)        ──▶  App Store
```

## How the shell loads the app — V1 uses `server.url`

`capacitor.config.ts` sets `server.url` to the deployed PWA. The native app loads the
live Vercel deployment, so **every server feature keeps working** (the `/api/bookings`
route, SSR, ISR) and the app is always current without an app-store release for content
changes. The service worker (`public/sw.js`) caches the shell for offline use after the
first launch, and `mobile-shell/index.html` is a branded fallback shown only if the
device is offline on a cold start before the SW is warm.

**Why not a bundled static export for V1?** The booking flow POSTs to a server route, so
`output: 'export'` would break it. Keeping `server.url` avoids changing any business
logic. See `capacitor-setup.md` for the fully-bundled offline alternative when the
backend is wired and the app is made static-exportable.

## The native bridge — progressive enhancement, never a fork

All native code lives behind capability checks so the **same source runs on web**:

| Concern | File | Native | Web fallback |
|---|---|---|---|
| Platform check | `lib/native.ts` | `Capacitor.isNativePlatform()` | returns `false` |
| Splash / status bar / back / deep links | `components/pwa/native-init.tsx` | Capacitor plugins | no-op |
| Haptics | `lib/haptics.ts` | `@capacitor/haptics` | `navigator.vibrate` |
| Share | `components/marketing/share-buttons.tsx` | `@capacitor/share` | `navigator.share` + links |
| External links (WhatsApp/tel/maps) | `lib/native.ts › openExternal` | `@capacitor/browser` / OS scheme | `window.open` |
| Secure storage | `lib/native.ts › secureStore` | `@capacitor/preferences` | `localStorage` |
| Camera / mic / location | existing web APIs in the webview | native prompts via manifest/plist | `getUserMedia` / `geolocation` |

Plugins are **dynamically imported** (`await import('@capacitor/…')`) inside native
branches, so the web bundle never pulls native code — the shared JS stays at 102 kB.

## Splash & first-launch routing

- Native splash: 2 s, warm-white (`#F6F3EC`), centred logo (`plugins.SplashScreen`).
- `NativeInit` hides it once React mounts (250 ms fade).
- First-launch → onboarding (`/welcome`) → auth (`/auth`) is the existing web flow; the
  splash simply hands off to it. `/welcome` already stores a "seen" flag, so returning
  users land on auth/home.

## Safe areas, status bar, keyboard

- `viewport-fit=cover` (root layout) + `env(safe-area-inset-*)` utilities in
  `styles/globals.css`. The Family and Guardian bottom bars pad by the bottom inset.
- Status bar: dark content on the ivory ground, painted in `NativeInit` and config.
- Keyboard: `resize: 'native'` so inputs are never clipped and buttons stay reachable.

## Security model

- Tokens/session via `secureStore` (Keychain / EncryptedSharedPreferences on native).
- No secrets in the bundle — only `NEXT_PUBLIC_*` (Supabase anon key is public by design).
- App-transport security: HTTPS only (`cleartext: false`), HSTS from the web layer.
- Certificate pinning / root & jailbreak detection are **prepared** (documented hooks),
  to be enabled with the security plugin before a hardened release — see
  `Mobile-Readiness-Report.md`.

## What still needs a Mac / accounts / devices

Scaffolding, config, bridge and assets are done here. **iOS builds require macOS + Xcode
+ CocoaPods**; signed Android release + `.aab` require Android Studio/SDK + a keystore;
push needs Firebase (FCM) + Apple (APNS); store listings need the respective accounts.
Every one of these is itemised with commands in the build/release docs and the readiness
report.
