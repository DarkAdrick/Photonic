# Photonic mobile — iOS follow-up (TODO)

Status: **Android works end-to-end** (grid + native thumbnails + scan on-device, zero JS
errors). This file tracks the work still required to ship iOS at the same level.

## Why iOS differs
Apple forbids JIT / Python runtimes and background service worker execution in the way the
Android WebView allows — but **our architecture already avoids Python on-device** (the API is
a local JS backend running inside the Service Worker + sql.js/WASM, with native ops delegated
to a Capacitor plugin). The main remaining iOS-specific work is native-layer adaptation, not
rework of the JS backend.

## Shared code already portable (nothing to change)
- `mobile/src-www/sw.js` — self-contained (backend modules + sql.js inlined at build time).
- `mobile/src-www/backend/*.js` — pure JS + sql.js; platform-agnostic.
- `mobile/src-www/page/bridge.js` — page↔SW bridge; the native call site is already
  abstracted through `window.Capacitor.Plugins.PhotonicBackend`, so iOS only needs an
  equivalent plugin with the same method names.
- `mobile/scripts/sync-www.js` — build/vendor/inline pipeline; platform-agnostic.

## iOS-specific work items

1. **Add the iOS platform (Capacitor).**
   - Install CocoaPods and Xcode.
   - `npx cap add ios` from the **`mobile/` project root** (see note below about working
     directory — `cap copy`/`cap add` must run from `mobile/`, not `mobile/ios/`).
   - Verify `capacitor.config.json` uses `iosScheme: "capacitor"` (already set).

2. **Implement the native `PhotonicBackend` plugin for iOS.**
   Mirror the Android Kotlin plugin's public API exactly so `bridge.js` works unchanged:
   - `checkPermission()` / `requestPermission()` → `PHPhotoLibrary.authorizationStatus`
     / `requestAuthorization`. Note: iOS returns `.authorized`, `.limited`, or `.denied`;
     decide how to surface `.limited` (photos partially available).
   - `scanMedia()` → enumerate the photo/video library (PHFetchResult over
     `PHAsset.fetchAssetsWithOptions`), return the same fields the Android plugin returns
     (`uri`, `filename`, `mime`, `size`, `width`, `height`, `date_taken`, `latitude`,
     `longitude`, `hash`, `orientation`, `camera_make`, `camera_model`, `kind`).
     - Use `PHImageManager`/`AVAsset` to read metadata.
     - MD5 hash: on iOS prefer built-in CryptoKit (or implement SHA-256; match the field
       Android produces if a hash is required for the duplicate/similar cleaners).
   - `readFile({uri,mime})` → return resized JPEG (q85) + EXIF orientation.
   - `thumbnail({uri,mime,maxDim})` → return JPEG bytes.
   - `rawBytes({uri,mime})` → return original bytes (for the video `stream` path and `raw`).
   - Register the plugin on the main AppDelegate / Capacitor bootstrap (like
     `registerPlugin` on Android's `MainActivity`).

3. **Photos permission semantics (Info.plist).**
   - Add `NSPhotoLibraryUsageDescription` (and `NSPhotoLibraryAddUsageDescription` if we
     ever write back). Without these the system kills the app on first access.

4. **Service Worker behavior on iOS.**
   - Confirm WKWebView supports Service Worker + `fetch` interception for the `capacitor://`
     scheme. If `importScripts` or SW interception is flaky on WKWebView (same class of issue
     as Android), the inlined `sw.js` approach already avoids `importScripts` — good. If even
     SW fetch interception is unreliable, the fallback is to move the local backend to the
     main-thread (override `window.fetch` for `/api/*` in `bridge.js` and use message-channel
     delegation for `<img>` thumbnail loads). Assess empirically first.

5. **Verify the one-time reload in `bridge.js`.**
   - The `location.reload()` on first launch (no controller) works on Android; re-verify on
     iOS because `navigator.serviceWorker.controller` timing can differ in WKWebView.

6. **Test the 4 seeded photos flow on the iOS Simulator.**
   - Seed sample photos into the Simulator photo library (drag/drop PNG/JPEG onto the
     simulator window), grant permission, confirm: scan runs, grid renders, native
     thumbnails load, detail/rotate/open work.

## Build tooling gotchas learned on Android (apply to iOS too)
- Always run `npx cap add ios` / `npx cap copy ios` / `npx cap sync ios` from the **`mobile/`
  project root**, never from `mobile/ios/`, or assets silently go stale.
- java/macOS version compatibility: Capacitor needs current Xcode; install on a Mac with
  Xcode 15+ and CocoaPods.

## Definition of done (iOS)
- [ ] `npx cap add ios` succeeds; project builds in Xcode.
- [ ] iOS `PhotonicBackend` plugin compiled and registered with the same method names as Android.
- [ ] Photos permission prompt works; Info.plist usage strings present.
- [ ] First-launch reload behaves; SW/backend serves `/api/*` JSON.
- [ ] Grid shows the seeded photos with native thumbnails.
- [ ] `electron`/desktop verification unaffected (desktop untouched — see root git status).
