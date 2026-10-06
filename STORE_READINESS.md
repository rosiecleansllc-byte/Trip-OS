# Trip OS — App Store / Google Play Readiness

Last audited: 2026-10-06

## Current status

The production web app passes a live smoke test across Today, Trip, Bookings,
Transport, Pack, Wallet, Share mode, and Trip Alerts. Netlify production
builds successfully.

Trip OS is currently a Progressive Web App (PWA). It is **not yet a native
App Store / Google Play package**, so there is no IPA/App Store archive or
Android App Bundle (AAB) to upload yet.

## Recommended packaging path

Use **Capacitor 8** as the native shell for the existing Vite/React app.

Why Capacitor 8:
- It preserves the existing web-first Trip OS codebase and local/offline
  behavior while producing normal native iOS and Android projects.
- Capacitor 8 supports Android target/compile SDK 36, which matches Google
  Play's current requirement for new mobile apps after August 31, 2026.
- Capacitor 8 supports iOS 15+ and requires Xcode 26+, suitable for current
  App Store submission tooling.

Do not point the native shell at the live Netlify URL for production. Build
the app with npm run build and package the generated dist assets into the
native app so core navigation still works when the network is unavailable.

## Store-policy readiness already addressed

- PWA manifest with 192, 512, maskable, and Apple touch icons.
- Standalone mobile layout and safe-area handling.
- Offline-capable service worker.
- Device-local private documents and traveler images (IndexedDB).
- Share mode prevents private document controls from rendering.
- Backup/restore for device-local state.
- Trip Alerts and a graceful fallback when browser notifications are not
  available.
- Public in-app Privacy Policy at /privacy, linked from Trip OS home.
- CI workflow on main/PRs runs lint plus the production build.

## Required before native packaging

Decisions still needed:
1. Final public app name (currently “Trip OS”).
2. Apple bundle ID / Android application ID, for example a domain-style ID
   owned by the publisher. Do not lock this until the publisher confirms it.
3. App Store / Play Store publisher legal entity.
4. Public support email and support URL.
5. Final app icon / store artwork ownership confirmation.

## iOS work

After the identifiers above are confirmed:

1. Add Capacitor 8 core/CLI and iOS packages.
2. Add capacitor.config.* with the confirmed app ID, app name, and webDir
   set to dist.
3. Build the web app and add the iOS platform using Swift Package Manager.
4. Configure signing/team in Xcode.
5. Verify iOS deployment target 15+.
6. Audit Info.plist permissions. Trip OS should not request protected
   permissions it does not actually use.
7. Test on at least one physical iPhone and one simulator on the current iOS
   version.
8. Archive and validate in Xcode.
9. Complete App Store Connect privacy details, accessibility declarations,
   age rating, screenshots, description, support URL, and review notes.

Important App Review point: Apple guideline 4.2 rejects apps that are merely
repackaged websites. Trip OS should be presented and reviewed as an app-like
travel utility: offline itinerary, device-local document wallet, alerts,
share/privacy mode, packing/wardrobe tools, backup/restore, and trip
operations—not as a website inside a WebView.

## Android work

1. Add Capacitor 8 core/CLI and Android packages.
2. Add the Android platform and build an Android App Bundle (AAB).
3. Confirm compileSdkVersion / targetSdkVersion 36.
4. Configure app signing and Play App Signing.
5. Test on current Android plus at least one older supported Android version.
6. Complete Data safety, content rating, store listing, screenshots, support
   contact, privacy-policy URL, and release notes.
7. Upload to an internal test track before production.

## Native-device regression matrix

Run these on both iOS and Android builds:

- Cold launch while online.
- Cold launch while offline.
- Deep link / reload into Today, Trip, Bookings, Transport, Pack, Wallet.
- Add/view/replace/delete a private image confirmation.
- Add/view/replace/delete a PDF confirmation.
- Backup export and restore.
- Add/edit/delete manual itinerary item.
- Add/edit/delete checklist item.
- Wardrobe image upload and outfit view.
- Share mode: verify private confirmations/documents are absent.
- Alert Center: dismiss and snooze.
- External Directions / Website / Ticket actions.
- Background → foreground resume during an active trip day.
- App upgrade preserving localStorage and IndexedDB.
- Uninstall/reinstall behavior (local data is expected to be removed unless
  restored from a user-created backup).

## Submission blockers

Trip OS should **not** be submitted yet until:
- native iOS/Android projects exist,
- bundle/application IDs are confirmed,
- signing is configured,
- physical-device testing is complete,
- support contact/URL is public,
- store screenshots/metadata are prepared,
- App Store privacy and Google Play Data safety forms are completed.

The web product is healthy; the remaining work is native packaging,
platform-specific testing, signing, and store metadata rather than a
redesign of the core application.
