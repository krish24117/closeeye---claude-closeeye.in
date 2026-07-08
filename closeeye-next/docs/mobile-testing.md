# Mobile Testing Checklist

Run on real hardware where possible. `[web]` items are already verified on the PWA; the
rest need a device build (Android Studio / a Mac).

## Devices & layout
- [ ] iPhone SE (small), iPhone 15/16 (notch), 15/16 Pro Max (Dynamic Island)
- [ ] Android phone (Pixel), Android tablet
- [ ] iPad (portrait + landscape)
- [ ] Landscape & portrait — no overflow, no clipping `[web ✓ 320px+]`
- [ ] Safe areas: status bar, home indicator, gesture nav, Dynamic Island

## Core flows
- [ ] Splash (2 s, logo, fade) → onboarding on first launch → auth otherwise
- [ ] Sign in / OTP / biometric unlock
- [ ] Book a visit → success
- [ ] Family: visits, report view, documents, messages
- [ ] Guardian: check-in, photo capture, voice note, complete visit
- [ ] Payment (test mode)
- [ ] Logout / session expiry

## Native features
- [ ] Camera (Guardian capture) + gallery picker
- [ ] Microphone (voice notes)
- [ ] Location (arrival verification / permission)
- [ ] Push notification received + deep-links to the right screen
- [ ] Biometric sign-in (Face ID / fingerprint)
- [ ] Share sheet (Founder Story) `[web ✓]`
- [ ] Haptics on key moments `[web ✓ vibrate]`
- [ ] External launch: WhatsApp, dialer, mailto, maps
- [ ] Download a report/invoice → open in native viewer → share

## Permissions
- [ ] Requested one at a time, in context (never all at launch) `[web ✓ /permissions]`
- [ ] Each shows a clear purpose string
- [ ] Denial handled gracefully; re-request path works

## Resilience
- [ ] Offline: shell loads, offline banner shows `[web ✓ SW + banner]`
- [ ] Slow network: skeletons, no broken layout `[web ✓]`
- [ ] Airplane mode → reconnect → auto-recovers
- [ ] Background → resume keeps state / session
- [ ] Kill + relaunch → session persists (secure storage)

## Keyboard
- [ ] Opening the keyboard doesn't clip inputs or hide the submit button
- [ ] Scroll adjusts to the focused field; no viewport jump

## Performance
- [ ] Cold start < 2 s to interactive
- [ ] 60 fps scroll/transitions
- [ ] Memory stable over a 10-minute session
- [ ] No web artifacts (text selection on buttons, tap highlight, overscroll glow)

## Security
- [ ] Tokens in Keychain / EncryptedSharedPreferences (not localStorage on native)
- [ ] No secrets in the bundle `[✓ only NEXT_PUBLIC_*]`
- [ ] HTTPS only; mixed content blocked `[✓]`
- [ ] Session expiry enforced

## Accessibility
- [ ] VoiceOver / TalkBack read labels + order `[web ✓ ARIA]`
- [ ] Dynamic type / large text
- [ ] Contrast + reduced motion honoured `[web ✓]`
- [ ] Touch targets ≥ 44 px `[web ✓]`
