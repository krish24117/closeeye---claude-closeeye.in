# Apple App Store Release

## App Store Connect listing

- **App name**: CloseEye
- **Subtitle** (≤30): A trusted human presence
- **Promotional text**: Care beyond presence — trusted visits for the people you love.
- **Description**: *(as Play; expand from `/about` and `/services`.)*
- **Keywords** (≤100 chars): elder care,parents,wellbeing,companion,visit,hospital,family,India,caregiver,senior
- **Category**: Medical (primary) / Lifestyle (secondary).
- **Support URL**: https://closeeye-next.vercel.app/help · **Marketing URL**: https://closeeye.in
- **Privacy policy**: https://closeeye-next.vercel.app/privacy

## App Privacy ("nutrition label")

Linked to the user, used for App Functionality (and Account):
Contact Info (name, email, phone) · Location (coarse + precise) · User Content (photos,
health/visit notes) · Identifiers (account) · Purchases (via processor). Not used for
tracking. Data deletion available in-app (Settings → Delete account).

## Usage descriptions (in Info.plist — done)

Camera, Microphone, Photo Library (+ add), Location When In Use, Face ID — each with a
human, purpose-specific string.

## Capabilities to enable in Xcode

Push Notifications · Background Modes (Remote notifications) · Keychain Sharing ·
(later) Sign in with Apple, Associated Domains for universal links.

## Assets required

- App icon **1024×1024** (generated; replace source with 1024 art before submission).
- iPhone 6.7" **and** 6.5" screenshots (≥3 each). iPad 12.9" if "iPad" is supported.
- App previews (optional video).

> Screenshots require the app running on a Simulator/device on macOS — not producible from
> this Windows scaffold.

## Submission steps (macOS)

1. Archive + upload from Xcode (`ios-build.md`).
2. App Store Connect → the build appears under TestFlight.
3. Test via **TestFlight** (internal, then external).
4. Fill listing, App Privacy, Age rating, pricing (free).
5. Submit for review. Provide a **demo account** and reviewer notes explaining the care
   service and why permissions are used.

## App Review notes (important)

- Guideline **4.2 (minimum functionality)**: the app is a hybrid Capacitor app using
  native camera, notifications, biometrics, haptics and share — not merely a web page.
  If review pushes back on `server.url`, switch to the bundled offline build
  (`capacitor-setup.md`) which packages the UI natively.
- Guideline **5.1.1**: all permission prompts are contextual with clear purpose strings.
- Provide test credentials + a short script (book a visit → view a report).

## Version history

- **1.0.0 (1)** — Initial release. Booking, Family Space, Guardian visits, reports,
  membership, notifications. Care beyond presence.
