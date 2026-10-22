#!/usr/bin/env sh
# Install a user-level Linux launcher after running install.sh.
set -eu
PREFIX="${BEEHIVE_PREFIX:-$HOME/.local}"
BIN="$PREFIX/bin/beehive"
DESKTOP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
mkdir -p "$DESKTOP_DIR"
cat > "$DESKTOP_DIR/beehive.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=BeeHive
Comment=Local BeeHive browser host (loopback only)
Exec=$BIN --port 8787
Terminal=true
Categories=Utility;
EOF
echo "Installed $DESKTOP_DIR/beehive.desktop"
