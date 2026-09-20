#!/bin/sh
set -eu

LABEL="${DANIEL_COMMANDER_LAUNCHD_LABEL:-com.danielcanfly.daniel-commander}"
DOMAIN="gui/$(id -u)"
STATE_DIR="${DANIEL_COMMANDER_STATE_DIR:-$HOME/.local/state/daniel-commander}"
RUNTIME_ROOT="${DANIEL_COMMANDER_RUNTIME_ROOT:-$HOME/.local/share/daniel-commander/runtime}"
URL_FILE="$STATE_DIR/health-url"

if launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then
  echo "LAUNCHD=loaded"
  launchctl print "$DOMAIN/$LABEL" 2>/dev/null | awk '
    /^[[:space:]]*state = / && !state_seen++ {print "STATE=" $3}
    /^[[:space:]]*pid = / && !pid_seen++ {print "APP_PID=" $3}
    /^[[:space:]]*last exit code = / && !exit_seen++ {
      line=$0
      sub(/^[[:space:]]*last exit code = /, "", line)
      print "LAST_EXIT=" line
    }
  '
else
  echo "LAUNCHD=not_loaded"
fi

if [ -s "$STATE_DIR/tcc-status" ]; then
  tcc=$(head -n 1 "$STATE_DIR/tcc-status")
  echo "TCC_PREFLIGHT=$tcc"
else
  echo "TCC_PREFLIGHT=unknown"
fi

if [ -s "$STATE_DIR/tunnel-client.pid" ]; then
  pid=$(cat "$STATE_DIR/tunnel-client.pid" 2>/dev/null || true)
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    echo "TUNNEL_PID=$pid"
  else
    echo "TUNNEL_PID=stale"
  fi
else
  echo "TUNNEL_PID=missing"
fi

if [ -s "$URL_FILE" ]; then
  base=$(cat "$URL_FILE")
  echo "HEALTH_URL=$base"
  if /usr/bin/curl -fsS --max-time 3 "$base/healthz" >/dev/null; then
    echo "HEALTH=ok"
  else
    echo "HEALTH=fail"
  fi
  if /usr/bin/curl -fsS --max-time 3 "$base/readyz" >/dev/null; then
    echo "READY=ok"
  else
    echo "READY=fail"
  fi
else
  echo "HEALTH_URL=missing"
  echo "HEALTH=unknown"
  echo "READY=unknown"
fi

if [ -s "$RUNTIME_ROOT/.source-commit" ]; then
  echo "RUNTIME_COMMIT=$(cut -c1-12 "$RUNTIME_ROOT/.source-commit")"
else
  echo "RUNTIME_COMMIT=unknown"
fi
