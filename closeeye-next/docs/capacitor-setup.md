# Capacitor Setup

## What's already installed & configured

- Runtime: `@capacitor/core` + plugins `app, status-bar, splash-screen, haptics, share,
  keyboard, browser, preferences, geolocation, camera, push-notifications`.
- Dev: `@capacitor/cli, @capacitor/android, @capacitor/ios, @capacitor/assets`.
- `capacitor.config.ts` — appId `in.closeeye.app`, appName **CloseEye**, splash, status
  bar, keyboard, push config, and `server.url` → the deployed PWA.
- Native projects scaffolded: `android/` and `ios/` (added via `cap add`).
- Icons + splash generated into both platforms and PWA (`npm run mobile:assets`).

## Identity

| | Value |
|---|---|
| Android package | `in.closeeye.app` (`android/app/build.gradle` › applicationId) |
| iOS bundle id | `in.closeeye.app` (set in Xcode › Signing) |
| App name | CloseEye (`strings.xml`, `Info.plist › CFBundleDisplayName`) |
| Version name | 1.0.0 |
| Version / build code | 1 |

## npm scripts

```bash
npm run cap:sync        # copy web config + update native deps
npm run cap:copy        # copy web assets only
npm run android:open    # open android/ in Android Studio
npm run ios:open        # open ios/ in Xcode (macOS only)
npm run android:run     # build + run on a connected Android device/emulator
npm run ios:run         # build + run on a Simulator (macOS only)
npm run mobile:assets   # regenerate icons + splash from assets/logo.png
```

## Everyday workflow

1. Change the web app as normal (`npm run dev`).
2. `npm run cap:sync` after config or plugin changes.
3. `npm run android:open` / `ios:open` → run from the IDE.

Because V1 uses `server.url`, day-to-day UI changes go live via the normal Vercel deploy —
no rebuild of the native app is needed unless you change native config/plugins/icons.

## Point the shell at a different environment

`capacitor.config.ts` reads `CAP_SERVER_URL` (defaults to the production URL). For a
preview build: `CAP_SERVER_URL=https://<preview>.vercel.app npm run cap:sync`.

## Fully-bundled offline build (alternative to `server.url`)

For an app that runs entirely offline from install (and reads more like a native app for
App Store Guideline 4.2):

1. Make the app static-exportable — remove the one server dependency (`/api/bookings`) or
   point it at an absolute API base; then add `output: 'export'` (guarded by a
   `BUILD_TARGET=mobile` env so the Vercel web build is unaffected) and `images.unoptimized`.
2. `next build` → static output in `out/`.
3. In `capacitor.config.ts`: delete the `server` block and set `webDir: 'out'`.
4. `npm run cap:sync`.

Trade-off: full offline + stronger store posture, but content changes then require an
app-store release. Keep V1 on `server.url` until the Supabase backend is wired.

## Assets

Source art in `assets/` (`logo.png`, `icon.png`, `icon-foreground.png`). Replace with
**1024×1024** icon art and a **2732×2732** splash for store-grade crispness, then rerun
`npm run mobile:assets`. Current sources are the 512px brand icon (upscaled) — fine for
testing, replace before submission.
