#!/usr/bin/env sh
# BeeHive installer — macOS, Linux, AyeOS (browser host) and Android APK helper.
# Usage: curl -fsSL https://beehive.vaked.dev/install.sh | sh
# Optional: curl -fsSL https://beehive.vaked.dev/install.sh | sh -s -- --platform ayeos
set -eu

REPO="8b-is/beehive"
REF="${BEEHIVE_REF:-main}"
BASE="${BEEHIVE_CDN:-https://beehive.vaked.dev}"
PREFIX="${BEEHIVE_PREFIX:-${PREFIX:-$HOME/.local}}"
PLATFORM=""
DRY_RUN=0
UNINSTALL=0

usage() {
  cat <<'EOF'
BeeHive one-line installer (loopback browser host)

  curl -fsSL https://beehive.vaked.dev/install.sh | sh

Options:
  --platform <linux|macos|ayeos>  Override auto-detection
  --android                       Download the Android APK (adb install suggested)
  --ios                           Print iOS/Xcode build instructions
  --prefix <dir>                  Install prefix (default: ~/.local)
  --ref <branch|tag|commit>       Git ref to download (default: main)
  --uninstall                     Remove the installed host launcher
  --dry-run                       Print actions without changing files
  -h, --help                      Show this help

The host serves the web UI on 127.0.0.1 only. It does not enable radios,
Family Sharing, AirPlay routing, or native parity. Node.js 18+ is required.
EOF
}

say() { printf '%s\n' "$*"; }
die() { printf 'beehive: %s\n' "$*" >&2; exit 1; }
fetch() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then
    wget -q "$1" -O "$2"
  else
    die "curl or wget is required"
  fi
}

while [ $# -gt 0 ]; do
  case "$1" in
    --platform) [ $# -ge 2 ] || die "--platform needs a value"; PLATFORM=$2; shift 2 ;;
    --platform=*) PLATFORM=${1#*=}; shift ;;
    --android) PLATFORM=android; shift ;;
    --ios) PLATFORM=ios; shift ;;
    --prefix) [ $# -ge 2 ] || die "--prefix needs a value"; PREFIX=$2; shift 2 ;;
    --prefix=*) PREFIX=${1#*=}; shift ;;
    --ref) [ $# -ge 2 ] || die "--ref needs a value"; REF=$2; shift 2 ;;
    --ref=*) REF=${1#*=}; shift ;;
    --uninstall) UNINSTALL=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1 (try --help)" ;;
  esac
done

if [ -z "$PLATFORM" ]; then
  case "$(uname -s 2>/dev/null || echo unknown)" in
    Darwin) PLATFORM=macos ;;
    Linux)
      if [ -f /etc/ayeos-release ] || [ -d /ayeos ] || [ "${AYEOS:-0}" = "1" ]; then
        PLATFORM=ayeos
      else
        PLATFORM=linux
      fi
      ;;
    *) die "unsupported OS; use --android, --ios, or run the browser host with Node.js" ;;
  esac
fi

case "$PLATFORM" in
  android)
    APK="$BASE/BeeHive-v1.0.0-android-universal.apk"
    say "Android APK: $APK"
    if [ "$DRY_RUN" = "1" ]; then
      say "[dry-run] curl -fL -o BeeHive.apk $APK"
    else
      fetch "$APK" BeeHive.apk || die "APK download failed"
      say "Downloaded BeeHive.apk. Install with: adb install -r BeeHive.apk"
    fi
    exit 0
    ;;
  ios)
    say "iOS needs Xcode 15+ on macOS:"
    say "  git clone https://github.com/$REPO.git && cd beehive/apple"
    say "  xcodegen generate && open BeeHive.xcodeproj"
    say "The SwiftUI target is source-only until you build/sign it. No TestFlight build is published."
    exit 0
    ;;
  macos|linux|ayeos) ;;
  *) die "unsupported platform: $PLATFORM" ;;
esac

SHARE="$PREFIX/share/beehive"
BIN="$PREFIX/bin/beehive"
DESKTOP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
DESKTOP="$DESKTOP_DIR/beehive.desktop"

if [ "$UNINSTALL" = "1" ]; then
  if [ "$DRY_RUN" = "1" ]; then
    say "[dry-run] rm -rf $SHARE $BIN $DESKTOP"
  else
    rm -rf "$SHARE" "$BIN" "$DESKTOP"
    say "Removed BeeHive from $PREFIX."
  fi
  exit 0
fi

command -v node >/dev/null 2>&1 || die "Node.js 18+ is required (https://nodejs.org). On macOS: brew install node"
node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>18||(a===18&&b>=0)?0:1)' \
  || die "Node.js 18+ is required (found $(node -v 2>/dev/null || echo none))"

TMP=$(mktemp -d "${TMPDIR:-/tmp}/beehive.XXXXXX")
trap 'rm -rf "$TMP"' EXIT INT TERM
mkdir -p "$TMP/src"

ARCHIVE="${BEEHIVE_ARCHIVE_URL:-https://codeload.github.com/$REPO/tar.gz/refs/heads/$REF}"
case "$REF" in
  *[!a-zA-Z0-9._/-]*) die "invalid ref: $REF" ;;
esac
if [ -z "${BEEHIVE_ARCHIVE_URL:-}" ] && printf '%s' "$REF" | grep -Eq '^[0-9a-f]{7,40}$|^v?[0-9]+\.[0-9]+\.[0-9]+$'; then
  ARCHIVE="https://codeload.github.com/$REPO/tar.gz/$REF"
fi

say "BeeHive ${PLATFORM} host → $SHARE"
if [ "$DRY_RUN" = "1" ]; then
  say "[dry-run] download $ARCHIVE"
  say "[dry-run] install launcher $BIN"
  exit 0
fi

fetch "$ARCHIVE" "$TMP/beehive.tar.gz" || die "download failed: $ARCHIVE"
tar -xzf "$TMP/beehive.tar.gz" -C "$TMP/src" --strip-components=1 || die "archive extraction failed"

mkdir -p "$SHARE" "$PREFIX/bin"
rm -rf "$SHARE/host" "$SHARE/web" "$SHARE/data" "$SHARE/dist" "$SHARE/platforms"
mkdir -p "$SHARE/platforms"
cp -R "$TMP/src/platforms/host" "$SHARE/host"
cp -R "$TMP/src/platforms/ayeos" "$SHARE/platforms/ayeos"
cp -R "$TMP/src/web" "$SHARE/web"
cp -R "$TMP/src/data" "$SHARE/data"
if [ -d "$TMP/src/dist" ]; then cp -R "$TMP/src/dist" "$SHARE/dist"; else mkdir -p "$SHARE/dist"; fi
if [ -f "$TMP/src/install.sh" ]; then cp "$TMP/src/install.sh" "$SHARE/install.sh"; fi

cat > "$BIN" <<EOF
#!/usr/bin/env sh
set -eu
exec node "$SHARE/host/server.mjs" --platform $PLATFORM "\$@"
EOF
chmod +x "$BIN"

if [ "$PLATFORM" != "macos" ]; then
  mkdir -p "$DESKTOP_DIR"
  cat > "$DESKTOP" <<EOF
[Desktop Entry]
Type=Application
Name=BeeHive
Comment=Local BeeHive browser host (loopback only)
Exec=$BIN --port 8787
Terminal=true
Categories=Utility;
EOF
fi

say "Installed: $BIN"
say "Run:       $BIN"
say "Then open: http://127.0.0.1:8787/"
say "Boundary:  loopback UI only; radios, Apple accounts, and native parity remain unverified."
