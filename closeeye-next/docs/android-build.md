# Android Build

## Prerequisites (not present on the scaffolding machine)

- **JDK 17** (Temurin/Adoptium).
- **Android Studio** (Ladybug+) with SDK Platform **35** (Android 15) + Build-Tools.
- `ANDROID_HOME` set; `platform-tools` on PATH.

> The project was scaffolded on Windows without the JDK/SDK, so **no APK/AAB was built
> here**. The steps below produce them on a machine with the toolchain.

## Debug build (fastest path to a device)

```bash
npm run cap:sync
npm run android:run           # or: npm run android:open, then Run ▶ in Android Studio
```

Manual APK:
```bash
cd android
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

## Release signing

1. Create a keystore (once, keep it safe + backed up):
   ```bash
   keytool -genkey -v -keystore closeeye-release.jks -alias closeeye \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. `android/keystore.properties` (git-ignored):
   ```
   storeFile=../closeeye-release.jks
   storePassword=…
   keyAlias=closeeye
   keyPassword=…
   ```
3. Wire it in `android/app/build.gradle` (`signingConfigs.release` reading the props),
   set `buildTypes.release.signingConfig`.

## Release artifacts

```bash
cd android
./gradlew assembleRelease      # → app-release.apk  (sideload / direct)
./gradlew bundleRelease        # → app-release.aab  (Google Play upload)
```
Outputs under `android/app/build/outputs/`.

## Version bump

`android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 1          // increment every Play upload
    versionName "1.0.0"
}
```

## Android 15 / Material You / edge-to-edge

- `compileSdk` / `targetSdk` = 35 (`android/variables.gradle`).
- Edge-to-edge is on by default on SDK 35; `NativeInit` paints the status bar and the
  bottom bars pad by `env(safe-area-inset-bottom)`.
- Adaptive icon (foreground + `#F6F3EC` background) and monochrome layer are generated in
  `mipmap-anydpi-v26/`. Dynamic colours: the launcher tints the monochrome icon on
  Android 13+.
- Notification channels are created by the push plugin on first registration — define
  channel IDs (visits, reports, payments, emergencies) when wiring FCM.

## Permissions

Declared in `AndroidManifest.xml` (camera, mic, fine/coarse location, notifications,
biometric, media). They are **requested at runtime, one at a time, in context** by the
existing `/permissions` flow — never all at launch.

## Common issues

- `SDK location not found` → create `android/local.properties` with `sdk.dir=…`.
- Gradle/JDK mismatch → use JDK 17.
- First sync slow → it downloads Gradle + dependencies once.
