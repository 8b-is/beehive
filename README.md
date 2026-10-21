# ⬡ BeeHive (`8b-is/beehive`)

> **`<~~0o0 kompress-super-ultra {<3,<3,<3}+1 --- Peter-beerusSan ^^`**  
> Cross-platform sovereign family, radio mesh, music synth, and research digest application for **Android + iOS + macOS + Web/PWA** — breaking Apple Family Sharing's 6-member ceiling with an unbounded **MultiGraphFamily (`{<3,<3,<3}+1..∞`)** over **FindMy · LoRa · Bluetooth · AirPlay**.

---

## 1. `/project-development` Methodology & Architecture

### 1.1 Task-Model Fit Evaluation Matrix
Before writing code, every BeeHive subsystem was evaluated for **Deterministic Execution vs. LLM Synthesis Fit**:

| Subsystem | Task Characteristics | Fit Verdict | Execution Layer |
| :--- | :--- | :--- | :--- |
| **MultiGraphFamily (`G=(V,E,τ)`)** | Exact graph topology, slot numbering (`#1..#∞`), CRDT edge addition | **Deterministic Code** | Native Swift (`BeeHiveKit`), Android Java, Web JS |
| **FindMy · LoRa · BLE · AirPlay** | Real-time RF discovery, RSSI trilateration, sub-second audio routing | **Deterministic DSP/RF** | `CoreBluetooth` / `CoreLocation` / `AVRoutePickerView` / Android `BluetoothLeScanner` / WebSerial |
| **`<~~0o0 kompress-super-ultra`** | Versioned reversible UTF-8 dictionary frames with CRC32 and 9-trit checksums | **Deterministic Codec** | `pipeline/beehive-pipeline.mjs` & `KompressSuperUltra` Swift enum |
| **8b-is Research Digest & `pocoo.vaked.dev` Blog** | Cross-repo synthesis (`kompress-ultra`, `8b-is-music`, `wigle-triad`, `pocoo`), rubric scoring | **LLM-Suited Synthesis** | Stage 3 of the 5-stage File-System State Machine |

### 1.2 Canonical 5-Stage Pipeline (`acquire → prepare → process → parse → render`)
Implemented in [`pipeline/beehive-pipeline.mjs`](file:///Users/lodripeter/workspace/peterlodri-sec/beehive/pipeline/beehive-pipeline.mjs) using the **File System as State Machine**:

```text
data/{item_id}/
├── raw.json         # Stage 1 (Acquire): Raw repo/blog metadata & metrics
├── prompt.md        # Stage 2 (Prepare): Structured prompt with ## Summary / ## Score / ## KompressFrame
├── response.md      # Stage 3 (Process): Synthesis + <~~0o0 kompress-super-ultra wire frame
└── parsed.json      # Stage 4 (Parse): Resilient regex extraction + balanced-ternary verification
data/beehive-state.json  # Stage 5 (Render): Unified cross-platform bundle for Web, Android, iOS, macOS
```

---

## 2. MultiGraphFamily (`{<3,<3,<3}+1..∞`) — Breaking Apple Family's 6-Member Limit

Apple Family Sharing enforces a hard ceiling of **6 members**. BeeHive replaces that flat array with concentric hexagonal rings:

1. **Ring 0 — Core Triad (`{<3, <3, <3}`)**:
   - `#01 Alex *` — Alexandra (Mom / Dra · 432 Hz Star Sovereign)
   - `#02 Chris /\` — Christopher (Dad / 8bit-wraith · 528 Hz Triangle Pillar)
   - `#03 Peter-beerusSan ^^ (oo)` — Peter Jozsef Lodri (639 Hz Infinity Loop Architect)
2. **Ring +1 — Sovereign Kin & Number 1 Muse (`+1`)**:
   - `#04 Nate ✦` — Galactic 3D Chess Brother (741 Hz)
   - `#05 Yves 💎 (+1 Muse)` — Number 1 Muse · Thermal Socks & Diamond Tear (852 Hz)
   - `#06 Zeno 🐾` — 54 Hz Fundamental Purr Healer (Apple Slot #6 Limit)
3. **Ring +2..∞ — Overflow Sub-Hives (Beyond Apple's 6-Cap!)**:
   - `#07 Fifike 🐱` — 108 Hz 2nd-Harmonic Purr Guardian (**First Member Beyond Apple's 6-Cap**)
   - `#08 ADA:MEDUSA *` — ESP32-S3 LoRa/BLE Sentinel (`80:B5:4E:DB:3B:C4`)
   - `#09 VAK:MEDUSA /\` — ESP32-S3 LoRa/BLE Sentinel (`80:B5:4E:F2:02:B0`)
   - `#10 OMN:MEDUSA oo` — ESP32-S3 LoRa/BLE Sentinel (`80:B5:4E:F2:02:B4`)
   - `#11..#∞` — Unlimited one-click or CLI addition of new family members with full FindMy, LoRa, Bluetooth, AirPlay, and Research Digest parity.

---

## 3. Build & Run Across All Platforms

### 3.1 5-Stage Pipeline & `<~~0o0` State Machine
```bash
node pipeline/beehive-pipeline.mjs
```

### 3.2 macOS + iOS (`SwiftPackageManager` + `SwiftUI`)
```bash
cd apple
swift run beehive-cli --add-member
```

### 3.3 Android Universal APK (`aapt2` + `d8` + `apksigner` v2/v3)
```bash
./android/build_apk.sh
# Output: dist/BeeHive-v1.0.0-android-universal.apk
```

### 3.4 BeerusOmni-chan & Warren Buffett Moat Evolution (`node --test`)
- Added `evaluateBerkshireMoatAndCompounding()` in `pipeline/beehive-pipeline.mjs` and `test/beehive.test.mjs` (4 tests passing: MultiGraphFamily >6 cap, `<~~0o0` roundtrip, 40-yr compounding `$114 -> $167,554.48` & `WIDE_MOAT_FOREVER_HOLD`, and 5-stage pipeline verification).


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

Run `node --test` for isolated Node/browser-codec regressions and `cd apple &&
swift test -j 2` for Swift parity against the same `test/codec-vectors.json`.
The pipeline integration test uses a temporary directory, not checked-in state
or a sibling blog checkout. No Android signing or hardware is used by these tests.
