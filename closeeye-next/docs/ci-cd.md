# Mobile CI/CD

Two GitHub Actions workflows build the native apps from the shared codebase. The web app
already ships via Vercel (preview per PR, production on merge) — these add the mobile side.

| Workflow | Runner | On PR / push | On tag `v*` |
|---|---|---|---|
| `.github/workflows/android.yml` | ubuntu-latest | **debug APK** (artifact) | **signed `.aab`** (artifact → optional Play internal) |
| `.github/workflows/ios.yml` | macos-15 | **Simulator compile** (validates build) | **signed archive → TestFlight** |

> These assume this repo's root is the Close Eye Next app. If it's a subfolder of a
> monorepo, set `defaults.run.working-directory: closeeye-next` in each workflow (a
> commented line marks the spot) and adjust the `android/` / `ios/` paths.

## Required secrets (GitHub → Settings → Secrets → Actions)

**Android (production tag builds only):**
- `ANDROID_KEYSTORE_B64` — `base64 -w0 closeeye-release.jks`
- `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
- *(optional Play upload)* `PLAY_SERVICE_ACCOUNT_JSON`

**iOS (production tag builds only):**
- `IOS_DIST_CERT_P12_B64` — base64 of the Apple **distribution** certificate `.p12`
- `IOS_DIST_CERT_PASSWORD`
- `IOS_PROVISION_PROFILE_B64` — base64 of the App Store `.mobileprovision`
- `IOS_PROVISION_PROFILE_NAME` — the profile's exact name
- `IOS_TEAM_ID`
- `APPSTORE_API_KEY_ID`, `APPSTORE_API_ISSUER_ID`, `APPSTORE_API_KEY_B64` — App Store
  Connect API key (`.p8`, base64) for the TestFlight upload

Preview builds (debug APK, Simulator compile) need **no secrets** — they run on every PR.

## Generate the upload keystore (do this once, keep it forever)

Play uses **Play App Signing**: the key below is your **upload key** (Google holds the real
app-signing key). Lose the upload key and you can reset it; lose the app-signing key and you
can't — so let Google manage it.

**Never commit the keystore or its password.** The file stays on your machine + backup; the
password lives only in GitHub Actions secrets. This doc stores the *config*, not the secret.

**No local JDK?** Run the **Generate Upload Keystore** workflow instead
(`.github/workflows/generate-keystore.yml`): Actions → Run workflow ▶. It mints the key on
the runner, generates a strong password, and returns everything as the
`closeeye-upload-keystore` artifact (with copy-paste secret instructions). The artifact
self-deletes after 1 day.

Or, with a JDK 17 on PATH (`keytool` ships with it) — it prompts for the password twice:

```bash
keytool -genkeypair -v \
  -keystore closeeye-upload.jks \
  -alias closeeye-upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype JKS \
  -dname "CN=Close Eye, OU=Mobile, O=Stexa Products & Services Pvt. Ltd., L=Hyderabad, ST=Telangana, C=IN"
```

| Keystore detail | Value |
|---|---|
| File | `closeeye-upload.jks` (store outside the repo; it's git-ignored if inside `android/`) |
| Alias | `closeeye-upload` |
| Key algorithm / size / validity | RSA / 2048 / 10000 days |
| Store password → secret | `ANDROID_KEYSTORE_PASSWORD` |
| Key password → secret | `ANDROID_KEY_PASSWORD` (may equal the store password) |
| Alias → secret | `ANDROID_KEY_ALIAS` = `closeeye-upload` |
| Keystore file → secret (for CI) | `ANDROID_KEYSTORE_B64` = `base64 -w0 closeeye-upload.jks` |

## Build locally — exact commands & output paths

Prereqs: **JDK 17** + **Android SDK** (platform 35, build-tools). `npm run cap:sync` first.

**Debug APK (sideload to your own phone):**
```bash
npm run cap:sync
cd android && ./gradlew assembleDebug
```
→ **`android/app/build/outputs/apk/debug/app-debug.apk`**
Install: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`

**Signed release AAB (Play upload) — no build.gradle edits, signs via injected props:**
```bash
cd android && ./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file=/absolute/path/closeeye-upload.jks \
  -Pandroid.injected.signing.store.password=YOUR_STORE_PW \
  -Pandroid.injected.signing.key.alias=closeeye-upload \
  -Pandroid.injected.signing.key.password=YOUR_KEY_PW
```
→ **`android/app/build/outputs/bundle/release/app-release.aab`**

**(Optional) signed release APK for direct sideloading:**
```bash
cd android && ./gradlew assembleRelease -Pandroid.injected.signing.store.file=... (same props)
```
→ **`android/app/build/outputs/apk/release/app-release.apk`**

## Versioning

- **Marketing version**: `1.0.0` — bump in `android/app/build.gradle` (`versionName`) and
  the Xcode target (`MARKETING_VERSION`).
- **Build number**: increment every store upload — Android `versionCode`, iOS
  `CURRENT_PROJECT_VERSION`. In CI you can derive it from `github.run_number`
  (e.g. add `-Pandroid.injected.version.code=${{ github.run_number }}`).

## Release tags

Cut a release by tagging:
```bash
git tag v1.0.0 && git push origin v1.0.0
```
The tag triggers the **production** paths in both workflows (signed AAB + TestFlight IPA).
Branch/PR pushes only produce preview artifacts.

## Rollback strategy

- **Web** — Vercel: instant "Promote previous deployment" (already available).
- **Android** — Google Play: **halt the staged rollout**, then promote the previous
  `.aab`. Keep the last known-good artifact from the workflow run.
- **iOS** — App Store: **pause a phased release**; for a live regression, expedite a patch
  build (App Review can't instantly revert, so gate risky releases behind phased rollout +
  a remote kill-switch flag if needed).
- **Native artifacts** are retained as workflow artifacts for direct re-upload.

## Local equivalents

Everything CI does can be run by hand — see `android-build.md` and `ios-build.md`.
