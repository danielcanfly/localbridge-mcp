#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

MACHINE_NAME=""
PROFILE=""
TUNNEL_ID=""
API_KEY_REF=""
HEALTH_ADDR=""
FORCE_PROFILE=0
NO_SERVICE=0

ALLOW_FILE=$(mktemp "${TMPDIR:-/tmp}/localbridge-machine-allow.XXXXXX")
trap 'rm -f "$ALLOW_FILE"' EXIT HUP INT TERM

usage() {
  cat <<'EOF'
Usage:
  sh scripts/setup-chatgpt-machine.sh --machine NAME --allow PATH [--allow PATH ...]
    [--tunnel-id TUNNEL_ID] [--api-key-ref file:/absolute/path/to/key]
    [--profile NAME] [--health-address 127.0.0.1:43128]
    [--force-profile] [--no-service]

Examples:
  sh scripts/setup-chatgpt-machine.sh --machine macbook-air --allow $HOME
  sh scripts/setup-chatgpt-machine.sh --machine mac-mini --allow $HOME

Purpose:
  Install one named ChatGPT/OpenAI Secure MCP Tunnel runtime per Mac.
  Each machine gets a distinct tunnel-client profile, launchd label, state
  directory, log directory, and health port.

Notes:
  - Use one OpenAI Secure MCP Tunnel per machine for simultaneous use.
  - Do not paste Runtime API keys into chat.
  - If --api-key-ref is omitted, this script prompts with hidden input and
    stores the key under ~/.config/localbridge-mcp with chmod 600.
EOF
}

slugify() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9][^a-z0-9]*/-/g; s/^-//; s/-$//'
}

label_suffix_from_slug() {
  printf '%s' "$1" | tr '-' '.'
}

default_health_addr() {
  case "$1" in
    macbook-air|air)
      printf '%s\n' "127.0.0.1:43127"
      ;;
    mac-mini|mini)
      printf '%s\n' "127.0.0.1:43128"
      ;;
    *)
      printf '%s\n' "127.0.0.1:43129"
      ;;
  esac
}

prompt() {
  printf '%s' "$1" >&2
}

require_tunnel_client() {
  if [ -n "${LOCALBRIDGE_MCP_TUNNEL_CLIENT:-}" ]; then
    [ -x "$LOCALBRIDGE_MCP_TUNNEL_CLIENT" ] || {
      echo "LOCALBRIDGE_MCP_TUNNEL_CLIENT is not executable: $LOCALBRIDGE_MCP_TUNNEL_CLIENT" >&2
      exit 2
    }
    return 0
  fi

  if command -v tunnel-client >/dev/null 2>&1; then
    return 0
  fi

  cat >&2 <<'EOF'
tunnel-client not found.

Install the OpenAI tunnel client on macOS first:
  brew install openai/tools/tunnel-client
  tunnel-client --version

Then rerun this setup command.
EOF
  exit 2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --machine)
      [ "$#" -ge 2 ] || { echo "--machine requires a value" >&2; exit 2; }
      MACHINE_NAME=$2; shift 2 ;;
    --profile)
      [ "$#" -ge 2 ] || { echo "--profile requires a value" >&2; exit 2; }
      PROFILE=$2; shift 2 ;;
    --allow)
      [ "$#" -ge 2 ] || { echo "--allow requires a path" >&2; exit 2; }
      printf '%s\n' "$2" >> "$ALLOW_FILE"; shift 2 ;;
    --tunnel-id)
      [ "$#" -ge 2 ] || { echo "--tunnel-id requires a value" >&2; exit 2; }
      TUNNEL_ID=$2; shift 2 ;;
    --api-key-ref)
      [ "$#" -ge 2 ] || { echo "--api-key-ref requires a value" >&2; exit 2; }
      API_KEY_REF=$2; shift 2 ;;
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
      echo "unknown argument: $1" >&2
      usage >&2
      exit 2 ;;
  esac
done

[ "$(uname -s)" = "Darwin" ] || { echo "setup-chatgpt-machine.sh requires macOS" >&2; exit 2; }
require_tunnel_client

if [ -z "$MACHINE_NAME" ]; then
  prompt "Machine name, for example macbook-air or mac-mini: "
  IFS= read -r MACHINE_NAME
fi

MACHINE_SLUG=$(slugify "$MACHINE_NAME")
[ -n "$MACHINE_SLUG" ] || { echo "machine name must contain at least one letter or number" >&2; exit 2; }

if [ -z "$PROFILE" ]; then
  PROFILE="localbridge-$MACHINE_SLUG"
fi

if [ -z "$HEALTH_ADDR" ]; then
  HEALTH_ADDR=$(default_health_addr "$MACHINE_SLUG")
fi

if [ ! -s "$ALLOW_FILE" ]; then
  echo "Enter allowlisted directories for this Mac. Use one path per line; blank line finishes." >&2
  while :; do
    prompt "allow> "
    IFS= read -r allowed_path || break
    [ -n "$allowed_path" ] || break
    printf '%s\n' "$allowed_path" >> "$ALLOW_FILE"
  done
fi

[ -s "$ALLOW_FILE" ] || { echo "at least one --allow directory is required" >&2; exit 2; }

if [ -z "$TUNNEL_ID" ]; then
  echo "Create or choose a dedicated OpenAI Secure MCP Tunnel for this machine first." >&2
  echo "OpenAI Tunnels: https://platform.openai.com/settings/organization/tunnels" >&2
  prompt "Tunnel ID for $MACHINE_SLUG: "
  IFS= read -r TUNNEL_ID
fi

[ -n "$TUNNEL_ID" ] || { echo "tunnel id is required" >&2; exit 2; }

case "$API_KEY_REF" in
  "")
    SECRET_DIR="$HOME/.config/localbridge-mcp"
    SECRET_FILE="$SECRET_DIR/tunnel-runtime-key-$MACHINE_SLUG"
    mkdir -p "$SECRET_DIR"
    chmod 700 "$SECRET_DIR"

    if [ -f "$SECRET_FILE" ]; then
      API_KEY_REF="file:$SECRET_FILE"
    else
      echo "Create a Runtime API key with Tunnels permission only." >&2
      echo "Runtime API keys: https://platform.openai.com/settings/organization/api-keys" >&2
      prompt "Runtime API key for $MACHINE_SLUG, hidden input: "
      old_stty=$(stty -g)
      stty -echo
      IFS= read -r RUNTIME_KEY
      stty "$old_stty"
      printf '\n' >&2
      [ -n "$RUNTIME_KEY" ] || { echo "runtime key cannot be empty" >&2; exit 2; }

      umask 077
      tmp="$SECRET_FILE.$$"
      printf '%s\n' "$RUNTIME_KEY" > "$tmp"
      mv "$tmp" "$SECRET_FILE"
      chmod 600 "$SECRET_FILE"
      unset RUNTIME_KEY
      API_KEY_REF="file:$SECRET_FILE"
    fi
    ;;
  file:/*)
    ;;
  *)
    echo "--api-key-ref must be file:/absolute/path/to/key" >&2
    exit 2 ;;
esac

LABEL_SUFFIX=$(label_suffix_from_slug "$MACHINE_SLUG")
SERVICE_LABEL="io.localbridge.mcp.$LABEL_SUFFIX"

export LOCALBRIDGE_MCP_MACHINE_NAME="$MACHINE_SLUG"
export LOCALBRIDGE_MCP_LAUNCHD_LABEL="$SERVICE_LABEL"
export LOCALBRIDGE_MCP_BUNDLE_ID="io.localbridge.mcp.runtime.$LABEL_SUFFIX"
export LOCALBRIDGE_MCP_STATE_DIR="$HOME/.local/state/localbridge-mcp-$MACHINE_SLUG"
export LOCALBRIDGE_MCP_LOG_DIR="$HOME/Library/Logs/LocalBridgeMCP-$MACHINE_SLUG"
export LOCALBRIDGE_MCP_HEALTH_LISTEN_ADDR="$HEALTH_ADDR"

set -- \
  --profile "$PROFILE" \
  --tunnel-id "$TUNNEL_ID" \
  --api-key-ref "$API_KEY_REF" \
  --health-address "$HEALTH_ADDR"

while IFS= read -r allowed_path; do
  [ -n "$allowed_path" ] || continue
  set -- "$@" --allow "$allowed_path"
done < "$ALLOW_FILE"

[ "$FORCE_PROFILE" -eq 1 ] && set -- "$@" --force-profile
[ "$NO_SERVICE" -eq 1 ] && set -- "$@" --no-service

echo "LOCALBRIDGE_MACHINE=$MACHINE_SLUG"
echo "LOCALBRIDGE_PROFILE=$PROFILE"
echo "LOCALBRIDGE_SERVICE_LABEL=$SERVICE_LABEL"
echo "LOCALBRIDGE_STATE_DIR=$LOCALBRIDGE_MCP_STATE_DIR"
echo "LOCALBRIDGE_LOG_DIR=$LOCALBRIDGE_MCP_LOG_DIR"
echo "LOCALBRIDGE_HEALTH_ADDR=$HEALTH_ADDR"

sh "$SCRIPT_DIR/setup-macos.sh" "$@"

if [ "$NO_SERVICE" -ne 1 ]; then
  echo "CHATGPT_APP_NAME=LocalBridge $MACHINE_SLUG"
  echo "CHATGPT_CONNECTION=Tunnel"
  echo "CHATGPT_AUTHENTICATION=None"
  echo "STATUS_COMMAND=LOCALBRIDGE_MCP_LAUNCHD_LABEL=$SERVICE_LABEL LOCALBRIDGE_MCP_PROFILE=$PROFILE LOCALBRIDGE_MCP_STATE_DIR=$LOCALBRIDGE_MCP_STATE_DIR LOCALBRIDGE_MCP_LOG_DIR=$LOCALBRIDGE_MCP_LOG_DIR sh $REPO_ROOT/scripts/macos-service.sh status"
fi
