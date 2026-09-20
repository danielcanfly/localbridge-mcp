#!/bin/sh
set -eu

REAL_TUNNEL_CLIENT="${DANIEL_COMMANDER_REAL_TUNNEL_CLIENT:-}"
STATE_DIR="${DANIEL_COMMANDER_STATE_DIR:-$HOME/.local/state/daniel-commander}"
CAFFEINATE_PID_FILE="$STATE_DIR/caffeinate.pid"

[ -n "$REAL_TUNNEL_CLIENT" ] || {
  echo "DANIEL_COMMANDER_REAL_TUNNEL_CLIENT is required" >&2
  exit 2
}
[ -x "$REAL_TUNNEL_CLIENT" ] || {
  echo "real tunnel-client is not executable: $REAL_TUNNEL_CLIENT" >&2
  exit 2
}

mkdir -p "$STATE_DIR"
tunnel_pid=""
caffeinate_pid=""

forward_stop() {
  if [ -n "$tunnel_pid" ] && kill -0 "$tunnel_pid" 2>/dev/null; then
    kill -TERM "$tunnel_pid" 2>/dev/null || true
  fi
}

cleanup() {
  trap - EXIT TERM INT
  if [ -n "$tunnel_pid" ] && kill -0 "$tunnel_pid" 2>/dev/null; then
    kill -TERM "$tunnel_pid" 2>/dev/null || true
  fi
  if [ -n "$caffeinate_pid" ] && kill -0 "$caffeinate_pid" 2>/dev/null; then
    kill -TERM "$caffeinate_pid" 2>/dev/null || true
  fi
  rm -f "$CAFFEINATE_PID_FILE"
}

trap forward_stop TERM INT
trap cleanup EXIT

"$REAL_TUNNEL_CLIENT" "$@" &
tunnel_pid=$!

if [ "$(uname -s)" = "Darwin" ]; then
  /usr/bin/caffeinate -i -w "$tunnel_pid" >/dev/null 2>&1 &
  caffeinate_pid=$!
  printf '%s\n' "$caffeinate_pid" > "$CAFFEINATE_PID_FILE"
  chmod 600 "$CAFFEINATE_PID_FILE"
fi

set +e
wait "$tunnel_pid"
status=$?
set -e

if [ -n "$caffeinate_pid" ] && kill -0 "$caffeinate_pid" 2>/dev/null; then
  kill -TERM "$caffeinate_pid" 2>/dev/null || true
fi
if [ -n "$caffeinate_pid" ]; then
  wait "$caffeinate_pid" 2>/dev/null || true
fi
rm -f "$CAFFEINATE_PID_FILE"
trap - EXIT TERM INT
exit "$status"
