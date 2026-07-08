# Close Eye — Mobile Readiness Report

**Goal:** ship Android + iOS from the one Next.js codebase via Capacitor, no rewrite.
**Environment note:** scaffolded on **Windows, no JDK/Android SDK, no macOS**. So code,
config, native projects, icons/splash and docs are done; compiling binaries and submitting
require a build machine + developer accounts. Nothing below is faked.

---

## Overall readiness

| Track | State | %|
|---|---|--:|
| Capacitor integration (config, bridge, one codebase) | ✅ Complete | 100 |
| Android project scaffold + icons + permissions | ✅ Complete | 100 |
| iOS project scaffold + icons + Info.plist strings | ✅ Complete (needs `pod install` on Mac) | 95 |
| Native bridge (splash, status bar, safe area, back, deep links, haptics, share, secure store) | ✅ Complete | 100 |
| Push notifications (FCM/APNS) | 🟡 Prepared — needs accounts + wiring | 40 |
| Biometrics / cert-pinning / root-jailbreak | 🟡 Prepared — needs plugin + enable | 45 |
| Signed release builds (.aab / .ipa) | ⛔ Needs Android Studio+keystore / macOS+Xcode | 0 |
| Store listings + screenshots + submission | 🟡 Metadata written; assets need devices | 35 |
| **Android → internal testing** | 🟢 Ready to build on a toolchain machine | ~85 |
| **iOS → TestFlight** | 🟢 Ready to build on a Mac | ~80 |

---

## ✅ Done in this environment

- **Capacitor installed** (core + 11 plugins; CLI, android, ios, assets).
- **`capacitor.config.ts`** — appId/name `in.closeeye.app` / CloseEye, 2 s warm-white
  splash, status bar, keyboard `resize:native`, push presentation, `server.url` → the PWA.
- **`android/` and `ios/` scaffolded** — `applicationId`/bundle `in.closeeye.app`,
  display name CloseEye.
- **Icons + splash generated** — Android 92 (adaptive + monochrome + all densities),
  iOS 7 (AppIcon + light/dark splash), PWA 7 — from the Close Eye logo.
- **Native bridge** (`lib/native.ts`, `components/pwa/native-init.tsx`, upgraded
  `lib/haptics.ts` + `share-buttons.tsx`) — splash dismiss, status-bar paint, Android back
  button, deep-link routing, native haptics, native share, external-link/OS-scheme
  handling, secure key-value store. **All no-op on web → single codebase intact.**
- **Safe areas** — `viewport-fit=cover` + `env(safe-area-inset-*)`; Family/Guardian bottom
  bars pad by the bottom inset.
- **Permissions** — Android manifest (camera, mic, location, notifications, biometric,
  media) and iOS Info.plist **usage strings** (camera, mic, photos ×2, location, Face ID),
  all requested in-context via the existing `/permissions` flow.
- **Web unaffected** — typecheck ✅, lint ✅ (0), build ✅ (shared JS still 102 kB), all
  routes 200 after integration and redeploy.
- **Docs** — architecture, capacitor-setup, android-build, ios-build, playstore-release,
  appstore-release, mobile-testing (this report is the eighth).

## 🟡 Prepared — needs credentials / a plugin / enabling

- **Push (FCM + APNS)**: `@capacitor/push-notifications` installed + configured. To finish:
  create a Firebase project, add `google-services.json` (Android) and configure APNS auth
  key in Firebase + App Store Connect; register the device token on login and route these
  event types → screens: family/guardian/PM/ops notifications, emergency alerts, membership
  & booking & payment reminders, visit-completed, visit-report-ready, companion/guardian
  assigned. Notification channels (visits / reports / payments / emergencies) to be created
  on first registration.
- **Biometrics** (Face ID / fingerprint): Info.plist + manifest permission are set. Add a
  biometric plugin (e.g. `@aparajita/capacitor-biometric-auth`) and wire the existing
  Settings toggle + secure-store token unlock.
- **Certificate pinning / root & jailbreak detection / secure clipboard**: hooks + policy
  documented in `mobile-architecture.md`; enable with a security plugin before a hardened
  release. Session expiry is enforced by the auth flow already.
- **Offline-from-install**: today offline works after first launch (SW + localStorage). For
  full bundled offline, switch to the static-export build (`capacitor-setup.md`).

## ⛔ Cannot be produced here (hard requirements)

| Deliverable | Needs |
|---|---|
| iOS build / archive / `.ipa` | **macOS + Xcode 16 + CocoaPods** |
| Signed Android `.apk` / `.aab` | **JDK 17 + Android Studio/SDK + a keystore** |
| FCM / APNS live push | Firebase + Apple Developer accounts + certificates |
| Store screenshots / feature graphic | App running on device/emulator |
| Play Console / App Store Connect submission | Developer accounts + the artifacts above |

---

## Native feature matrix

| Feature | Status |
|---|---|
| Splash (2 s, fade, logo, warm-white) | ✅ configured |
| Status bar (light/dark ready) | ✅ |
| Safe area / Dynamic Island | ✅ CSS; verify on device |
| Camera / Photo library | ✅ perms + web capture; native plugin available |
| GPS / Location | ✅ perms + web geolocation |
| Microphone / Voice notes | ✅ perms + MediaRecorder |
| Haptics | ✅ native + web fallback |
| Share sheet | ✅ native + web fallback |
| Clipboard | ✅ web API (works in webview); native plugin optional |
| Phone dialer / Email / Maps / WhatsApp launch | ✅ via `openExternal` / OS schemes |
| File picker / uploads (camera, gallery, docs, PDF, voice) | ✅ web inputs; compression/progress/retry present |
| Downloads (report PDF, invoices, photos) + native viewer | 🟡 web download; native Filesystem/viewer to wire |
| Push notifications | 🟡 prepared (FCM/APNS) |
| Biometric auth | 🟡 prepared |
| Back gesture / hardware back | ✅ handled |
| Deep links / App Links / Universal Links | ✅ routing wired; domain verification pending |

---

## CI/CD (template — add when the repo is on GitHub with secrets)

- **Android** (`ubuntu-latest`): checkout → setup-java 17 → `npm ci` → `npx cap sync android`
  → `./gradlew bundleRelease` (keystore from secrets) → upload artifact / Play via Fastlane.
- **iOS** (`macos-latest`): checkout → `npm ci` → `pod install` → `xcodebuild archive` +
  `exportArchive` (signing from App Store Connect API key) → TestFlight via Fastlane.
- **Versioning**: bump `versionCode`/build number from the run number; tag `vX.Y.Z`.
- **Rollback**: Play staged rollout halt + previous `.aab`; App Store phased release pause.

Secrets required: `ANDROID_KEYSTORE(_B64)`, `KEYSTORE_PASSWORD`, `KEY_ALIAS/PASSWORD`,
`APPSTORE_API_KEY`, `FIREBASE_*`. Vercel already provides the web preview/prod deploys.

---

## Play Store readiness checklist

- [x] Package `in.closeeye.app`, name CloseEye, v1.0.0 (code 1)
- [x] Adaptive/monochrome icon + splash generated
- [x] Permissions declared + justified (in-context)
- [x] Privacy policy live (`/privacy`), Data-safety mapping drafted
- [ ] Signed `.aab` (needs SDK + keystore)
- [ ] Screenshots + feature graphic (needs device)
- [ ] FCM push configured
- [ ] Internal testing track upload

## App Store readiness checklist

- [x] Bundle `in.closeeye.app`, name CloseEye, v1.0.0 (build 1)
- [x] AppIcon + light/dark splash generated
- [x] Info.plist usage strings (camera/mic/photos/location/Face ID)
- [x] App Privacy mapping + review notes drafted (incl. 4.2 guidance)
- [ ] `pod install` + archive on macOS/Xcode
- [ ] Screenshots (6.7"/6.5") — needs Simulator/device
- [ ] APNS configured; Push/Background capabilities enabled
- [ ] TestFlight upload

---

## Remaining issues before submission — prioritised

1. **Build machines** — a Mac (Xcode) and an Android toolchain (or CI runners) to compile.
2. **Firebase + Apple/Google developer accounts** — for push and store submission.
3. **Wire push + biometrics** (plugins installed/prepared; ~1 day once accounts exist).
4. **Replace asset sources** with 1024 icon + 2732 splash art, rerun `mobile:assets`.
5. **Capture screenshots** on device/emulator for both stores.
6. **On-device QA** per `mobile-testing.md` (safe areas, keyboard, offline, push, biometrics).
7. **App Store 4.2**: if review objects to `server.url`, ship the bundled offline build.

**Bottom line:** the app is a **genuine single-codebase hybrid** and is **build-ready** for
Android internal testing and iOS TestFlight the moment it's opened on the right toolchain.
No screens were rewritten; the Close Eye design system is identical across web, Android and
iOS.
