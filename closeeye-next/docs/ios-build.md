# iOS Build

## This step requires a Mac

iOS apps **cannot be built on Windows or Linux**. The `ios/` Xcode project is scaffolded
and configured (icons, splash, Info.plist usage strings), but building, archiving and
uploading must happen on **macOS with Xcode 16 + CocoaPods**.

## Prerequisites (on the Mac)

- macOS 14+ with **Xcode 16** (for iOS 18 SDK).
- **CocoaPods**: `sudo gem install cocoapods` (or `brew install cocoapods`).
- An **Apple Developer Program** membership (for signing + distribution).
- Node + the repo checked out; `npm install`.

## First run

```bash
npm run cap:sync
cd ios/App && pod install && cd -   # pulls native pods (not run on Windows)
npm run ios:open                    # opens ios/App/App.xcworkspace in Xcode
```

In Xcode → target **App** → **Signing & Capabilities**:
- Team = your Apple team; Bundle Identifier = `in.closeeye.app`.
- Add capabilities: **Push Notifications**, **Background Modes** (Remote notifications),
  **Sign in with Apple** (when enabled), **Keychain Sharing** (for secure storage).

## Debug build

Select a Simulator or device → **Run ▶** (or `npm run ios:run` on the Mac).

## Release archive → App Store

1. Set **Any iOS Device (arm64)** as the destination.
2. **Product → Archive**.
3. **Distribute App → App Store Connect → Upload**.
4. Manage the build in App Store Connect (see `appstore-release.md`).

## Version / build

Xcode target → **General**: Version `1.0.0`, Build `1` (increment build each upload).
These map to `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`.

## iOS 18 specifics

- **Safe area / Dynamic Island**: handled by `viewport-fit=cover` + `env(safe-area-inset-*)`.
  Verify the top inset around the Dynamic Island on a 15/16 Pro.
- **Status bar**: dark content on ivory, set in `NativeInit`.
- **Face ID**: `NSFaceIDUsageDescription` is set; wire the biometric plugin before enabling
  the Settings toggle (see readiness report).
- **Background refresh / push**: enable the capabilities above; APNS key configured in
  App Store Connect + Firebase (if using FCM for both platforms).
- **Share extension / Sign in with Apple**: prepared (usage/config documented) — add when
  those features are turned on.

## Info.plist usage strings (already added)

Camera, Microphone, Photo Library (+ add), Location (when in use) and Face ID each have a
human, on-brand explanation. App Store review rejects builds that access these without a
purpose string — they're in place.
