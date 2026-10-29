# Repository Guidelines

BeeHive is the 8b-is family-graph, codec and cross-platform app prototype.
Keep claims tied to what the code and tests actually verify.

## Project Structure

- `web/`: canonical single-page UI, including the QuantT fingerprint/navigation tab.
- `pipeline/`: five-stage digest pipeline and shared Node codec.
- `android/`: manifest, Java WebView bridge and APK build script.
- `apple/`: SwiftPM package (`BeeHiveKit`, CLI, `beehive-app`) plus
  `project.yml` for generated iOS/macOS app targets.
- `platforms/`: target manifest, loopback host server, Linux and AyeOS
  packaging.
- `test/`: Node/browser regressions, QuantT tests and platform E2E tests.
- `install.sh`: one-line installer copied into `dist/`.

## Build, Test, Development

- `npm ci --ignore-scripts && npm test` — browser, codec, pipeline, host and installer tests.
- `npm run host` — serve the UI on `127.0.0.1:8787`.
- `npm run build:dist` — copy the UI, state, installer and Android build script into `dist/`.
- `cd apple && swift test -j 2` — Swift codec parity.
- `cd apple && xcodegen generate` — create the iOS/macOS Xcode project.
- `bash android/build_apk.sh` — build and sign the APK; requires an Android SDK.
- `sh install.sh --dry-run --platform linux` — exercise the installer without writes.

CI (`.github/workflows/e2e.yml`) runs the host suite, Apple builds and the
Android APK build. Do not describe CI build success as hardware validation.

## Style

- JavaScript: two-space indent, single quotes, no semicolon-free style.
- Swift: four-space indent, public API on `BeeHiveKit`, platform guards for SwiftUI.
- Shell: POSIX `sh` for installers; quote paths and fail with `set -eu`.
- Prefer text nodes and fixed attributes for untrusted UI content.
- Do not add comments that restate code; document only non-obvious boundaries.

## Claim Boundaries

- Local records do not modify Apple Family Sharing.
- Codec checks verify frame integrity, not sender identity or research claims.
- Radio previews do not transmit; Android bridge results are cached/bonded state.
- QuantT is a relative Wi-Fi fingerprint grid, not GPS/FindMy/UWB or a measured coordinate.
- Browser host markers do not establish native parity.
- Digest scores remain unevaluated unless a real evaluator runs.

Update `platforms/manifest.json` and `README.md` when a target changes status.

## Commits

Use `type: short description` (`feat`, `fix`, `test`, `docs`, `chore`,
`refactor`). Keep changes focused and run the relevant commands above before
committing. Never commit generated Xcode projects, `.build`, or local state.
