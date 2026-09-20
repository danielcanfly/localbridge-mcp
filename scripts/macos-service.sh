#!/bin/sh
set -eu

LABEL="${LOCALBRIDGE_MCP_LAUNCHD_LABEL:-io.localbridge.mcp}"
BUNDLE_ID="${LOCALBRIDGE_MCP_BUNDLE_ID:-io.localbridge.mcp.runtime}"
PROFILE="${LOCALBRIDGE_MCP_PROFILE:-localbridge-prod}"
HEALTH_LISTEN_ADDR="${LOCALBRIDGE_MCP_HEALTH_LISTEN_ADDR:-127.0.0.1:43127}"
DOMAIN="gui/$(id -u)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
STATUS="$SCRIPT_DIR/macos-runtime-status.sh"
PROFILE_DIR="${TUNNEL_CLIENT_PROFILE_DIR:-$HOME/.config/tunnel-client}"
PROFILE_FILE="$PROFILE_DIR/$PROFILE.yaml"
STATE_DIR="${LOCALBRIDGE_MCP_STATE_DIR:-$HOME/.local/state/localbridge-mcp}"
LOG_DIR="${LOCALBRIDGE_MCP_LOG_DIR:-$HOME/Library/Logs/LocalBridgeMCP}"
RUNTIME_ROOT="${LOCALBRIDGE_MCP_RUNTIME_ROOT:-$HOME/.local/share/localbridge-mcp/runtime}"
APP="${LOCALBRIDGE_MCP_RUNTIME_APP:-$HOME/Applications/LocalBridge MCP Runtime.app}"
APP_EXE="$APP/Contents/MacOS/LocalBridgeMCPRuntime"
APP_SOURCE="$REPO_ROOT/runtime-app/LocalBridgeMCPRuntime.swift"
TUNNEL_WRAPPER_SOURCE="$REPO_ROOT/scripts/macos-tunnel-wrapper.sh"
TUNNEL_WRAPPER="$RUNTIME_ROOT/bin/tunnel-client-supervised"

# shellcheck source=macos-common.sh
. "$SCRIPT_DIR/macos-common.sh"

discover_tools() {
  NODE_BIN=$(lb_find_tool "${LOCALBRIDGE_MCP_NODE:-}" node) || { echo "node not found"; exit 2; }

  if [ -n "${LOCALBRIDGE_MCP_NPM:-}" ]; then
    NPM_BIN=$(lb_find_tool "$LOCALBRIDGE_MCP_NPM" npm) || { echo "npm not found"; exit 2; }
  elif [ -x "$(dirname "$NODE_BIN")/npm" ]; then
    NPM_BIN="$(dirname "$NODE_BIN")/npm"
  else
    NPM_BIN=$(lb_find_tool "" npm) || { echo "npm not found"; exit 2; }
  fi

  TUNNEL_CLIENT_BIN=$(lb_find_tool "${LOCALBRIDGE_MCP_TUNNEL_CLIENT:-}" tunnel-client) || {
    echo "tunnel-client not found; set LOCALBRIDGE_MCP_TUNNEL_CLIENT to its absolute path" >&2
    exit 2
  }

  SWIFTC_BIN=$(lb_find_tool "${LOCALBRIDGE_MCP_SWIFTC:-}" swiftc) || {
    echo "swiftc not found; install Xcode Command Line Tools" >&2
    exit 2
  }

  NODE_MAJOR=$(lb_node_major "$NODE_BIN")
  [ "$NODE_MAJOR" -ge 20 ] || { echo "Node.js >=20 required; found $NODE_MAJOR"; exit 2; }

  RUNTIME_PATH=$(lb_runtime_path "$NODE_BIN" "$TUNNEL_CLIENT_BIN")
}

deploy_runtime() {
  next="$RUNTIME_ROOT.next.$$"
  previous="$RUNTIME_ROOT.previous"
  rm -rf "$next"
  mkdir -p "$next"

  cp "$REPO_ROOT/package.json" "$REPO_ROOT/package-lock.json" "$next/"
  /usr/bin/ditto "$REPO_ROOT/dist" "$next/dist"
  /usr/bin/ditto "$REPO_ROOT/node_modules" "$next/node_modules"
  mkdir -p "$next/bin"
  cp "$TUNNEL_WRAPPER_SOURCE" "$next/bin/tunnel-client-supervised"
  chmod 755 "$next/bin/tunnel-client-supervised"
  (
    cd "$next"
    "$NPM_BIN" prune --omit=dev --ignore-scripts --no-audit --no-fund >/dev/null
  )

  source_commit=$(git -C "$REPO_ROOT" rev-parse HEAD)
  if [ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]; then
    source_commit="$source_commit-dirty"
  fi
  printf '%s\n' "$source_commit" > "$next/.source-commit"
  rm -rf "$previous"
  [ -d "$RUNTIME_ROOT" ] && mv "$RUNTIME_ROOT" "$previous"
  mv "$next" "$RUNTIME_ROOT"
}

build_app_if_missing() {
  if [ -x "$APP_EXE" ]; then
    echo "RUNTIME_APP=reused"
    return 0
  fi

  mkdir -p "$APP/Contents/MacOS"
  "$SWIFTC_BIN" "$APP_SOURCE" -o "$APP_EXE"
  /usr/bin/python3 - "$APP/Contents/Info.plist" "$BUNDLE_ID" <<'PY'
import plistlib, sys
path, bundle_id = sys.argv[1:]
data = {
    "CFBundleExecutable": "LocalBridgeMCPRuntime",
    "CFBundleIdentifier": bundle_id,
    "CFBundleName": "LocalBridge MCP Runtime",
    "CFBundlePackageType": "APPL",
    "CFBundleShortVersionString": "1.0",
    "CFBundleVersion": "1",
    "LSUIElement": True,
    "NSDocumentsFolderUsageDescription": "LocalBridge MCP needs access to the Documents folders you explicitly allow it to operate on.",
    "NSDesktopFolderUsageDescription": "LocalBridge MCP needs access to the Desktop folders you explicitly allow it to operate on.",
}
with open(path, "wb") as fh:
    plistlib.dump(data, fh, sort_keys=True)
PY
  /usr/bin/codesign --force --sign - --identifier "$BUNDLE_ID" "$APP" >/dev/null
  echo "RUNTIME_APP=created"
  echo "RUNTIME_APP_TCC_APPROVAL_REQUIRED=yes"
}

patch_profile_runtime() {
  /usr/bin/python3 - "$PROFILE_FILE" "$RUNTIME_ROOT" "$NODE_BIN" <<'PY'
import json, re, shlex, sys
from pathlib import Path
profile = Path(sys.argv[1])
runtime = Path(sys.argv[2])
node = sys.argv[3]
command = f"{shlex.quote(node)} {shlex.quote(str(runtime / 'dist/src/index.js'))}"
replacement = "      command: " + json.dumps(command)
text = profile.read_text()
updated, count = re.subn(r'(?m)^\s*command:\s*".*dist/src/index\.js"\s*$', replacement, text, count=1)
if count != 1:
    raise SystemExit("could not locate MCP command in production profile")
profile.write_text(updated)
profile.chmod(0o600)
PY
}

write_plist() {
  /usr/bin/python3 - "$PLIST" "$LABEL" "$APP_EXE" "$RUNTIME_ROOT" "$PROFILE" "$PROFILE_DIR" "$STATE_DIR" "$LOG_DIR" "$TUNNEL_WRAPPER" "$TUNNEL_CLIENT_BIN" "$RUNTIME_PATH" "$HEALTH_LISTEN_ADDR" <<'PY'
import plistlib
import sys
from pathlib import Path

(plist_path, label, app_exe, runtime_root, profile, profile_dir, state_dir, log_dir,
 tunnel_wrapper, tunnel_client, runtime_path, health_addr) = sys.argv[1:]

data = {
    "Label": label,
    "ProgramArguments": [app_exe],
    "WorkingDirectory": runtime_root,
    "EnvironmentVariables": {
        "PATH": runtime_path,
        "LOCALBRIDGE_MCP_PROFILE": profile,
        "TUNNEL_CLIENT_PROFILE_DIR": profile_dir,
        "LOCALBRIDGE_MCP_STATE_DIR": state_dir,
        "LOCALBRIDGE_MCP_LOG_DIR": log_dir,
        "LOCALBRIDGE_MCP_RUNTIME_ROOT": runtime_root,
        "LOCALBRIDGE_MCP_TUNNEL_CLIENT": tunnel_wrapper,
        "LOCALBRIDGE_MCP_REAL_TUNNEL_CLIENT": tunnel_client,
        "HEALTH_LISTEN_ADDR": health_addr,
        "HEALTH_URL_FILE": str(Path(state_dir) / "health-url"),
        "LOG_FILE": str(Path(log_dir) / "tunnel-client.jsonl"),
        "LOG_LEVEL": "info",
        "LOG_FORMAT": "json",
    },
    "RunAtLoad": True,
    "KeepAlive": {"SuccessfulExit": False},
    "ThrottleInterval": 10,
    "ProcessType": "Background",
    "StandardOutPath": str(Path(log_dir) / "launcher.stdout.log"),
    "StandardErrorPath": str(Path(log_dir) / "launcher.stderr.log"),
}
Path(plist_path).parent.mkdir(parents=True, exist_ok=True)
with open(plist_path, "wb") as fh:
    plistlib.dump(data, fh, sort_keys=True)
PY
  chmod 600 "$PLIST"
}

preflight_install() {
  [ "$(uname -s)" = "Darwin" ] || { echo "macOS service install requires Darwin"; exit 2; }
  discover_tools
  [ -f "$PROFILE_FILE" ] || { echo "production profile missing: $PROFILE_FILE"; exit 2; }
  [ -f "$APP_SOURCE" ] || { echo "runtime app source missing"; exit 2; }
  [ -f "$TUNNEL_WRAPPER_SOURCE" ] || { echo "macOS tunnel wrapper source missing"; exit 2; }
  mkdir -p "$STATE_DIR" "$LOG_DIR" "$HOME/Library/LaunchAgents" "$HOME/Applications"
  chmod 700 "$STATE_DIR" "$LOG_DIR"
  find "$LOG_DIR" -maxdepth 1 -type f -exec chmod 600 {} \; 2>/dev/null || true
}

install_service() {
  preflight_install
  launchctl bootout "$DOMAIN/$LABEL" >/dev/null 2>&1 || true
  "$NPM_BIN" --prefix "$REPO_ROOT" run build >/dev/null
  deploy_runtime
  build_app_if_missing
  patch_profile_runtime
  "$TUNNEL_CLIENT_BIN" doctor --profile "$PROFILE" --profile-dir "$PROFILE_DIR" --health.listen-addr 127.0.0.1:0 >/dev/null
  write_plist
  rm -f "$STATE_DIR/tunnel-client.pid" "$STATE_DIR/health-url" "$STATE_DIR/tcc-status"
  launchctl bootstrap "$DOMAIN" "$PLIST"
  launchctl enable "$DOMAIN/$LABEL"
  launchctl kickstart -k "$DOMAIN/$LABEL"
}

bootstrap_service_with_retry() {
  attempt=1
  while [ "$attempt" -le 10 ]; do
    if launchctl bootstrap "$DOMAIN" "$PLIST" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done

  echo "failed to bootstrap $LABEL after 10 attempts" >&2
  launchctl bootstrap "$DOMAIN" "$PLIST"
}

reload_service_from_plist() {
  if launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then
    launchctl bootout "$DOMAIN/$LABEL" >/dev/null 2>&1 || true
  fi
  bootstrap_service_with_retry
  launchctl enable "$DOMAIN/$LABEL"
  launchctl kickstart -k "$DOMAIN/$LABEL"
}

update_runtime() {
  preflight_install
  "$NPM_BIN" --prefix "$REPO_ROOT" run build >/dev/null
  deploy_runtime
  patch_profile_runtime
  "$TUNNEL_CLIENT_BIN" doctor --profile "$PROFILE" --profile-dir "$PROFILE_DIR" --health.listen-addr 127.0.0.1:0 >/dev/null
  write_plist
  reload_service_from_plist
}

case "${1:-status}" in
  install)
    install_service
    sleep 2
    "$STATUS"
    ;;
  update)
    update_runtime
    sleep 2
    "$STATUS"
    ;;
  uninstall)
    launchctl bootout "$DOMAIN/$LABEL" >/dev/null 2>&1 || true
    rm -f "$PLIST"
    echo "UNINSTALLED"
    ;;
  start)
    if launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then
      launchctl kickstart "$DOMAIN/$LABEL"
    else
      [ -f "$PLIST" ] || { echo "plist missing; run $0 install"; exit 2; }
      launchctl bootstrap "$DOMAIN" "$PLIST"
    fi
    ;;
  stop)
    launchctl bootout "$DOMAIN/$LABEL"
    ;;
  restart)
    launchctl kickstart -k "$DOMAIN/$LABEL"
    ;;
  status)
    "$STATUS"
    ;;
  *)
    echo "usage: $0 {install|update|uninstall|start|stop|restart|status}" >&2
    exit 2
    ;;
esac