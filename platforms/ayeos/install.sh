#!/usr/bin/env sh
# Install BeeHive as a per-user AyeOS/Linux service after running install.sh.
set -eu
SHARE="${BEEHIVE_PREFIX:-$HOME/.local}/share/beehive"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
NODE=$(command -v node || true)
[ -n "$NODE" ] || { echo "node not found" >&2; exit 1; }
[ -f "$SHARE/host/server.mjs" ] || { echo "run install.sh first ($SHARE/host/server.mjs missing)" >&2; exit 1; }
mkdir -p "$UNIT_DIR"
sed -e "s|@NODE@|$NODE|g" -e "s|@SHARE@|$SHARE|g" "$HERE/beehive-ayeosd.service.in" > "$UNIT_DIR/beehive-ayeosd.service"
systemctl --user daemon-reload
systemctl --user enable --now beehive-ayeosd.service
echo "BeeHive AyeOS host: http://127.0.0.1:8787/"
