#!/bin/sh
set -u

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
CONFIG_FILE="${DANIEL_COMMANDER_CONFIG_DIR:-$HOME/.config/daniel-commander}/config.json"
PROFILE="${DANIEL_COMMANDER_PROFILE:-daniel-prod}"
PROFILE_FILE="${TUNNEL_CLIENT_PROFILE_DIR:-$HOME/.config/tunnel-client}/$PROFILE.yaml"
FAIL=0

check_tool() {
  name=$1
  path=$(command -v "$name" 2>/dev/null || true)
  if [ -n "$path" ]; then
    echo "TOOL_$name=$path"
  else
    echo "TOOL_$name=missing"
    FAIL=1
  fi
}

echo "PLATFORM=$(uname -s)"
echo "ARCH=$(uname -m)"
check_tool node
check_tool npm

if command -v node >/dev/null 2>&1; then
  echo "NODE_VERSION=$(node --version)"
  major=$(node -p 'Number(process.versions.node.split(".")[0])')
  [ "$major" -ge 20 ] || FAIL=1
fi

if [ -f "$CONFIG_FILE" ]; then
  echo "CONFIG=present"
  /usr/bin/python3 - "$CONFIG_FILE" <<'PY'
import json, sys
cfg=json.load(open(sys.argv[1]))
print("ALLOWED_DIRECTORY_COUNT="+str(len(cfg.get("allowedDirectories", []))))
PY
else
  echo "CONFIG=missing"
  FAIL=1
fi

if [ -f "$PROFILE_FILE" ]; then
  echo "TUNNEL_PROFILE=present"
else
  echo "TUNNEL_PROFILE=missing_optional_for_local_core"
fi

if [ "$(uname -s)" = "Darwin" ]; then
  check_tool swiftc
  check_tool codesign
  if command -v tunnel-client >/dev/null 2>&1 || [ -n "${DANIEL_COMMANDER_TUNNEL_CLIENT:-}" ]; then
    echo "TUNNEL_CLIENT=available"
  else
    echo "TUNNEL_CLIENT=missing_optional_for_local_core"
  fi
  if [ -x "$SCRIPT_DIR/macos-service.sh" ]; then
    "$SCRIPT_DIR/macos-service.sh" status 2>/dev/null || true
  fi
fi

if [ -f "$REPO_ROOT/package-lock.json" ]; then
  echo "LOCKFILE=present"
else
  echo "LOCKFILE=missing"
  FAIL=1
fi

[ "$FAIL" -eq 0 ] && echo "DOCTOR_CORE_PASS" || {
  echo "DOCTOR_CORE_FAIL"
  exit 2
}
