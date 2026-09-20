#!/bin/sh
set -eu

LABEL="${DANIEL_COMMANDER_LAUNCHD_LABEL:-com.danielcanfly.daniel-commander}"
BUNDLE_ID="com.danielcanfly.daniel-commander.runtime"
PROFILE="${DANIEL_COMMANDER_PROFILE:-daniel-prod}"
DOMAIN="gui/$(id -u)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
STATUS="$SCRIPT_DIR/macos-runtime-status.sh"
PROFILE_FILE="$HOME/.config/tunnel-client/$PROFILE.yaml"
STATE_DIR="${DANIEL_COMMANDER_STATE_DIR:-$HOME/.local/state/daniel-commander}"
LOG_DIR="${DANIEL_COMMANDER_LOG_DIR:-$HOME/Library/Logs/DanielCommander}"
RUNTIME_ROOT="${DANIEL_COMMANDER_RUNTIME_ROOT:-$HOME/.local/share/daniel-commander/runtime}"
APP="$HOME/Applications/Daniel Commander Runtime.app"
APP_EXE="$APP/Contents/MacOS/DanielCommanderRuntime"
APP_SOURCE="$REPO_ROOT/runtime-app/DanielCommanderRuntime.swift"

deploy_runtime() {
  next="$RUNTIME_ROOT.next.$$"
  previous="$RUNTIME_ROOT.previous"
  rm -rf "$next"
  mkdir -p "$next"

  cp "$REPO_ROOT/package.json" "$REPO_ROOT/package-lock.json" "$next/"
  /usr/bin/ditto "$REPO_ROOT/dist" "$next/dist"
  /usr/bin/ditto "$REPO_ROOT/node_modules" "$next/node_modules"
  (
    cd "$next"
    /opt/homebrew/bin/npm prune --omit=dev --ignore-scripts --no-audit --no-fund >/dev/null
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
  /usr/bin/swiftc "$APP_SOURCE" -o "$APP_EXE"
  /usr/bin/python3 - "$APP/Contents/Info.plist" "$BUNDLE_ID" <<'PY'
import plistlib, sys
path, bundle_id = sys.argv[1:]
data = {
    "CFBundleExecutable": "DanielCommanderRuntime",
    "CFBundleIdentifier": bundle_id,
    "CFBundleName": "Daniel Commander Runtime",
    "CFBundlePackageType": "APPL",
    "CFBundleShortVersionString": "1.0",
    "CFBundleVersion": "1",
    "LSUIElement": True,
    "NSDocumentsFolderUsageDescription": "Daniel Commander needs access to the Documents folders you explicitly allow it to operate on.",
    "NSDesktopFolderUsageDescription": "Daniel Commander needs access to the Desktop folders you explicitly allow it to operate on.",
}
with open(path, "wb") as fh:
    plistlib.dump(data, fh, sort_keys=True)
PY
  /usr/bin/codesign --force --sign - --identifier "$BUNDLE_ID" "$APP" >/dev/null
  echo "RUNTIME_APP=created"
  echo "RUNTIME_APP_TCC_APPROVAL_REQUIRED=yes"
}

patch_profile_runtime() {
  /usr/bin/python3 - "$PROFILE_FILE" "$RUNTIME_ROOT" <<'PY'
import re, sys
from pathlib import Path
profile = Path(sys.argv[1])
runtime = Path(sys.argv[2])
text = profile.read_text()
replacement = f'      command: "/opt/homebrew/bin/node {runtime}/dist/src/index.js"'
updated, count = re.subn(r'(?m)^\s*command:\s*".*dist/src/index\.js"\s*$', replacement, text, count=1)
if count != 1:
    raise SystemExit("could not locate MCP command in production profile")
profile.write_text(updated)
profile.chmod(0o600)
PY
}

write_plist() {
  /usr/bin/python3 - "$PLIST" "$LABEL" "$APP_EXE" "$RUNTIME_ROOT" "$PROFILE" "$STATE_DIR" "$LOG_DIR" <<'PY'
import plistlib
import sys
from pathlib import Path

plist_path, label, app_exe, runtime_root, profile, state_dir, log_dir = sys.argv[1:]
data = {
    "Label": label,
    "ProgramArguments": [app_exe],
    "WorkingDirectory": runtime_root,
    "EnvironmentVariables": {
        "PATH": "/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        "DANIEL_COMMANDER_PROFILE": profile,
        "DANIEL_COMMANDER_STATE_DIR": state_dir,
        "DANIEL_COMMANDER_LOG_DIR": log_dir,
        "DANIEL_COMMANDER_RUNTIME_ROOT": runtime_root,
        "DANIEL_COMMANDER_TUNNEL_CLIENT": "/opt/homebrew/bin/tunnel-client",
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
  [ -x /opt/homebrew/bin/tunnel-client ] || { echo "tunnel-client missing"; exit 2; }
  [ -x /opt/homebrew/bin/node ] || { echo "Homebrew node missing"; exit 2; }
  [ -f "$PROFILE_FILE" ] || { echo "production profile missing: $PROFILE_FILE"; exit 2; }
  [ -f "$APP_SOURCE" ] || { echo "runtime app source missing"; exit 2; }
  mkdir -p "$STATE_DIR" "$LOG_DIR" "$HOME/Library/LaunchAgents" "$HOME/Applications"
  chmod 700 "$STATE_DIR" "$LOG_DIR"
  find "$LOG_DIR" -maxdepth 1 -type f -exec chmod 600 {} \; 2>/dev/null || true
}

install_service() {
  preflight_install
  launchctl bootout "$DOMAIN/$LABEL" >/dev/null 2>&1 || true
  /opt/homebrew/bin/npm --prefix "$REPO_ROOT" run build >/dev/null
  deploy_runtime
  build_app_if_missing
  patch_profile_runtime
  /opt/homebrew/bin/tunnel-client doctor --profile "$PROFILE" --health.listen-addr 127.0.0.1:0 >/dev/null
  write_plist
  rm -f "$STATE_DIR/tunnel-client.pid" "$STATE_DIR/health-url" "$STATE_DIR/tcc-status"
  launchctl bootstrap "$DOMAIN" "$PLIST"
  launchctl enable "$DOMAIN/$LABEL"
  launchctl kickstart -k "$DOMAIN/$LABEL"
}

update_runtime() {
  preflight_install
  /opt/homebrew/bin/npm --prefix "$REPO_ROOT" run build >/dev/null
  deploy_runtime
  patch_profile_runtime
  /opt/homebrew/bin/tunnel-client doctor --profile "$PROFILE" --health.listen-addr 127.0.0.1:0 >/dev/null
  if launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then
    launchctl kickstart -k "$DOMAIN/$LABEL"
  fi
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
