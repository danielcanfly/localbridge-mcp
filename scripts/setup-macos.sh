#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PROFILE="daniel-prod"
TUNNEL_ID=""
API_KEY_REF=""
HEALTH_ADDR="127.0.0.1:43127"
FORCE_PROFILE=0
NO_SERVICE=0
ALLOW_FILE=$(mktemp "${TMPDIR:-/tmp}/daniel-commander-allow.XXXXXX")
trap 'rm -f "$ALLOW_FILE"' EXIT HUP INT TERM

# shellcheck source=macos-common.sh
. "$SCRIPT_DIR/macos-common.sh"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/setup-macos.sh --allow PATH [--allow PATH ...] \
    --tunnel-id TUNNEL_ID --api-key-ref file:/absolute/path/to/key \
    [--profile NAME] [--health-address 127.0.0.1:43127] \
    [--force-profile] [--no-service]

Requirements:
  - macOS
  - Node.js >=20 and npm
  - Xcode Command Line Tools (swiftc/codesign) for service installation
  - tunnel-client already installed
  - your own OpenAI Secure MCP Tunnel ID
  - a file: secret reference owned by you

--no-service creates and validates the user configuration/profile without
installing launchd or Runtime.app.

This project does not provide a shared hosted relay or shared credentials.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --allow)
      [ "$#" -ge 2 ] || { echo "--allow requires a path" >&2; exit 2; }
      printf '%s\n' "$2" >> "$ALLOW_FILE"
      shift 2
      ;;
    --tunnel-id)
      [ "$#" -ge 2 ] || { echo "--tunnel-id requires a value" >&2; exit 2; }
      TUNNEL_ID=$2; shift 2 ;;
    --api-key-ref)
      [ "$#" -ge 2 ] || { echo "--api-key-ref requires a value" >&2; exit 2; }
      API_KEY_REF=$2; shift 2 ;;
    --profile)
      [ "$#" -ge 2 ] || { echo "--profile requires a value" >&2; exit 2; }
      PROFILE=$2; shift 2 ;;
    --health-address)
      [ "$#" -ge 2 ] || { echo "--health-address requires a value" >&2; exit 2; }
      HEALTH_ADDR=$2; shift 2 ;;
    --force-profile)
      FORCE_PROFILE=1; shift ;;
    --no-service)
      NO_SERVICE=1; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[ "$(uname -s)" = "Darwin" ] || { echo "setup-macos.sh requires macOS" >&2; exit 2; }
[ -n "$TUNNEL_ID" ] || { echo "--tunnel-id is required" >&2; exit 2; }
[ -s "$ALLOW_FILE" ] || { echo "at least one --allow directory is required for macOS production TCC preflight" >&2; exit 2; }

case "$API_KEY_REF" in
  file:/*) ;;
  *) echo "--api-key-ref must use file:/absolute/path for launchd-safe secret loading" >&2; exit 2 ;;
esac

SECRET_FILE=${API_KEY_REF#file:}
[ -f "$SECRET_FILE" ] || { echo "secret file does not exist: $SECRET_FILE" >&2; exit 2; }
MODE=$(stat -f %Lp "$SECRET_FILE")
case "$MODE" in
  600|400) ;;
  *) echo "secret file must be mode 600 or 400; found $MODE" >&2; exit 2 ;;
esac

PROFILE_DIR="${TUNNEL_CLIENT_PROFILE_DIR:-$HOME/.config/tunnel-client}"
PROFILE_FILE="$PROFILE_DIR/$PROFILE.yaml"
if [ -e "$PROFILE_FILE" ] && [ "$FORCE_PROFILE" -ne 1 ]; then
  echo "profile already exists: $PROFILE_FILE (use --force-profile to replace)" >&2
  exit 2
fi

set --
while IFS= read -r allowed_path; do
  [ -n "$allowed_path" ] || continue
  set -- "$@" --allow "$allowed_path"
done < "$ALLOW_FILE"

"$SCRIPT_DIR/setup-core.sh" "$@"

NODE_BIN=$(dc_find_tool "${DANIEL_COMMANDER_NODE:-}" node) || { echo "node not found"; exit 2; }
TUNNEL_CLIENT_BIN=$(dc_find_tool "${DANIEL_COMMANDER_TUNNEL_CLIENT:-}" tunnel-client) || {
  echo "tunnel-client not found; install it first or set DANIEL_COMMANDER_TUNNEL_CLIENT" >&2
  exit 2
}

mkdir -p "$PROFILE_DIR"
chmod 700 "$PROFILE_DIR"

set --   --sample sample_mcp_stdio_local   --profile "$PROFILE"   --profile-dir "$PROFILE_DIR"   --tunnel-id "$TUNNEL_ID"   --control-plane-api-key-ref "$API_KEY_REF"   --mcp-command "$NODE_BIN $REPO_ROOT/dist/src/index.js"   --health-listen-addr "$HEALTH_ADDR"

[ "$FORCE_PROFILE" -eq 1 ] && set -- "$@" --force
"$TUNNEL_CLIENT_BIN" init "$@" >/dev/null
chmod 600 "$PROFILE_FILE"

if [ "$NO_SERVICE" -eq 1 ]; then
  "$TUNNEL_CLIENT_BIN" doctor --profile "$PROFILE" --profile-dir "$PROFILE_DIR" --health.listen-addr 127.0.0.1:0 >/dev/null
  echo "MACOS_REMOTE_PROFILE_PASS"
  echo "PROFILE=$PROFILE"
  echo "PROFILE_FILE=$PROFILE_FILE"
  exit 0
fi

SWIFTC_BIN=$(dc_find_tool "${DANIEL_COMMANDER_SWIFTC:-}" swiftc) || {
  echo "swiftc not found; install Xcode Command Line Tools" >&2
  exit 2
}
command -v codesign >/dev/null 2>&1 || { echo "codesign not found" >&2; exit 2; }

DANIEL_COMMANDER_PROFILE="$PROFILE" DANIEL_COMMANDER_NODE="$NODE_BIN" DANIEL_COMMANDER_TUNNEL_CLIENT="$TUNNEL_CLIENT_BIN" DANIEL_COMMANDER_SWIFTC="$SWIFTC_BIN" DANIEL_COMMANDER_HEALTH_LISTEN_ADDR="$HEALTH_ADDR" TUNNEL_CLIENT_PROFILE_DIR="$PROFILE_DIR"   "$SCRIPT_DIR/macos-service.sh" install

echo "MACOS_REMOTE_SETUP_PASS"
echo "PROFILE=$PROFILE"
echo "SERVICE_LABEL=${DANIEL_COMMANDER_LAUNCHD_LABEL:-com.danielcanfly.daniel-commander}"
