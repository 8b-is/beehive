# ⬡ BeeHive (`8b-is/beehive`)

BeeHive is a local family-graph, WebAudio and codec prototype with an Android
WebView wrapper, a Swift library/CLI, and a file-based digest demonstration.
Adding records beyond six changes only BeeHive's local graph. It does not
modify Apple Family Sharing, invite people to an account, or activate radios.

## Implemented behavior and limits

| Area | Current behavior | Verification boundary |
| --- | --- | --- |
| Family graph | Local graph records, rings, member addition and browser storage | Seed locations, distances and transports are demo data; no live presence or account integration |
| FindMy and LoRa previews | Generate local checksum-checked request/heartbeat frames | No requests sent, acknowledgements received or airtime measured |
| Web Serial | On user action, select, open at 115200 baud, then close a port | No bytes written; selection does not identify an ESP32 or LoRa radio |
| Browser Bluetooth | Request a device selection | Does not establish pairing, connection, proximity or audio routing |
| Android bridge | Bonded Bluetooth list, cached Wi-Fi scan results and A2DP system flag | Not FindMy, a fresh BLE scan or AirPlay; permissions may leave results empty |
| AirPlay | Availability explanation | No implemented route picker or multi-room sync |
| Music | Browser WebAudio oscillators and gain controls | No wupz/MLX engine loaded; no verified native audio parity |
| Apple package | BeeHiveKit, CLI and tests | SwiftUI source is present, but not configured as an app target |
| Digest | Five stages persisted to files using deterministic fixture text | No LLM invocation or quality evaluation; checksum success only checks the frame |

## Digest demonstration

[`pipeline/beehive-pipeline.mjs`](pipeline/beehive-pipeline.mjs) writes
`raw.json`, `prompt.md`, `response.md`, `parsed.json`, and the final
`data/beehive-state.json`. Running the CLI regenerates those files; preserve
wanted state before running it. It can read metadata from a sibling
`pocoo.vaked.dev/posts` directory. Tests use an isolated temporary root.

```bash
node pipeline/beehive-pipeline.mjs
```

Stage 3 copies a fixture into a structured response. `score` is `null` and
`scoreStatus` is `not-evaluated`. Cached numeric ratings remain only as
`reportedScore`; cached narratives and points remain unverified source claims.
The returned bundle labels fixture provenance and platform/radio boundaries
even when reusing historical stage files. Existing cached files are not silently
rewritten. Any `costEstimate` values are illustrative fixture assumptions,
not measured usage, current pricing or tested throughput.

The browser's digest cards are their own static fixtures; they do not read or
validate those files. A valid codec frame does not verify its narrative.

## Local entry points

Open `web/index.html` for the browser prototype. Optional Web Serial/Bluetooth
APIs depend on browser support and permissions. The page preserves local data.

```bash
cd apple
swift run beehive-cli --self-test
```

The Android build entry point is `android/build_apk.sh`; inspect the local SDK
and signing setup before use. A build or downloadable APK does not establish
hardware behavior or a production deployment. Native UI/bridge security and
hardware validation remain separate work.

## Codec v2: exact text and checked frames

Node, the standalone browser page (also bundled by Android), and BeeHiveKit now
emit the same version 2 frames. Literal `§` is escaped as `§§` before dictionary
substitution. Whitespace, Unicode scalar values, literal dictionary tokens and
frame delimiters are preserved without normalization. JavaScript rejects
unpaired surrogate code units instead of silently replacing them.

The envelope is `<~~0o0|v2|TAG:{<3,<3,<3}+1|b3:SIGNATURE(NET)|by:SENDER|BODY|crc32:CHECK|0o0~~>`.
Metadata uses percent-encoded UTF-8, retaining only RFC3986 unreserved bytes.
CRC32/ISO-HDLC covers UTF-8 bytes from `v2|` through the end of BODY; the b3
checksum is recomputed from the restored payload. Decoders reject a mismatch,
unknown dictionary escape, noncanonical metadata or malformed envelope.
These checks detect accidental corruption; they are **not encryption,
authentication or a signature proving who sent a message**.

Legacy frames are rejected as unverified. Earlier whitespace normalization and
literal-token substitution could already have lost information; re-encode the
original text using v2. Previously cached digest output remains historical and
must be regenerated explicitly; opening this version does not rewrite user data.
Older decoders are not compatible with v2, so upgrade communicating peers together.

`frameBytes` is the actual UTF-8 envelope size and `compressionRatio` is raw bytes
divided by frame bytes (it can be below 1). The former simulated
`loraPackedBytes` and airtime fields have been removed; no 6-bit binary packer,
radio delivery or measured airtime is implied by codec results. This protocol
update does not establish native radio or app feature parity.

Run `npm ci --ignore-scripts` then `npm test` for isolated Node/browser
regressions and `cd apple && swift test -j 2` for Swift parity against the same `test/codec-vectors.json`.
The pipeline integration test uses a temporary directory, not checked-in state
or a sibling blog checkout. No Android signing or hardware is used by these tests.

## Rendering untrusted text

Member names, handles, roles, symbols, transports, locations and digest content
are assigned through DOM text nodes. SVG elements use the SVG namespace and
fixed attribute names; stored colors accept only hexadecimal CSS colors.
Digest links accept only absolute HTTP(S) URLs and use `noopener noreferrer`.
Other URL schemes display a plain title. Existing storage keys and values are
preserved; the renderer does not rewrite saved records when loading them.

The `linkedom` development dependency runs isolated DOM regression tests for
markup-like input, stored-state reload, attribute/color boundaries and digest
links. It is not bundled into the browser page or the Android asset. These tests
do not establish radio functionality or Android bridge isolation.

## Android WebView isolation candidate

The Android wrapper serves the packaged `index.html` only for a main-frame GET
at its existing HTTPS origin. Other resource requests receive a local blocked
response. File/content access, remote network loading, mixed content and WebView
debugging are disabled. A response Content Security Policy forbids frames,
connections, objects and forms; inline script/style remain necessary for the
bundled page. Missing assets fail closed without a file or remote fallback.

Main-frame HTTPS links with a user gesture are handed to an external handler;
all in-WebView navigation is cancelled. Other schemes (including `findmy:`),
credential-bearing URLs and nonstandard ports are blocked. Native bridge data
and permission behavior are unchanged. The HTTPS origin is retained to preserve
existing browser storage; storage continuity still needs an Android runtime check.

Run the host navigation-policy checks using a JDK 11 or later:

```bash
bash android/test_policy.sh
# For a project-local JDK:
BEEHIVE_JAVA_HOME=/path/to/jdk bash android/test_policy.sh
```

These checks exercise the policy called by the Android callbacks. They do not
run WebView. Compilation against Android API classes is also separate from APK
packaging and runtime validation. Before publishing an Android artifact, verify
asset loading with network blocking, stored data, new-window links, subframes,
redirects and the missing-asset path in an actual WebView. Existing signing
material and permissions require their own review.
