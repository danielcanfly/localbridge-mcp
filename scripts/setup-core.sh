#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
CONFIG_DIR="${LOCALBRIDGE_MCP_CONFIG_DIR:-$HOME/.config/localbridge-mcp}"
CONFIG_FILE="$CONFIG_DIR/config.json"
ALLOWED=""
ALLOW_COUNT=0

usage() {
  cat <<'EOF'
Usage:
  ./scripts/setup-core.sh [--allow PATH]...

Builds LocalBridge MCP and writes a fail-closed user config.
Repeat --allow for each filesystem root the MCP filesystem tools may access.
With no --allow values, filesystem access remains disabled.

If config.json already exists, setup-core preserves its other keys and updates
only allowedDirectories.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --allow)
      [ "$#" -ge 2 ] || { echo "--allow requires a path" >&2; exit 2; }
      candidate=$2
      [ -d "$candidate" ] || { echo "allowed directory does not exist: $candidate" >&2; exit 2; }
      resolved=$(cd "$candidate" && pwd -P)
      ALLOWED="$ALLOWED$resolved
"
      ALLOW_COUNT=$((ALLOW_COUNT + 1))
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

NODE_BIN="${LOCALBRIDGE_MCP_NODE:-$(command -v node 2>/dev/null || true)}"
NPM_BIN="${LOCALBRIDGE_MCP_NPM:-$(command -v npm 2>/dev/null || true)}"
[ -n "$NODE_BIN" ] && [ -x "$NODE_BIN" ] || { echo "node not found" >&2; exit 2; }
[ -n "$NPM_BIN" ] && [ -x "$NPM_BIN" ] || { echo "npm not found" >&2; exit 2; }

NODE_MAJOR=$("$NODE_BIN" -p 'Number(process.versions.node.split(".")[0])')
[ "$NODE_MAJOR" -ge 20 ] || { echo "Node.js >=20 required; found $NODE_MAJOR" >&2; exit 2; }

cd "$REPO_ROOT"
"$NPM_BIN" ci
"$NPM_BIN" run build

mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"
LB_ALLOWED_DIRS="$ALLOWED" "$NODE_BIN" - "$CONFIG_FILE" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const target = process.argv[2];
const allowed = [...new Set((process.env.LB_ALLOWED_DIRS || '').split(/\r?\n/).filter(Boolean))];

let current = {};
if (fs.existsSync(target)) {
  const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('existing config must be a JSON object');
  }
  current = parsed;
}

const payload = { ...current, allowedDirectories: allowed };
const tmp = target + '.tmp';
fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n', { mode: 0o600 });
fs.renameSync(tmp, target);
fs.chmodSync(target, 0o600);
NODE

echo "CORE_SETUP_PASS"
echo "CONFIG=$CONFIG_FILE"
echo "NODE=$NODE_BIN"
echo "ALLOWED_DIRECTORY_COUNT=$ALLOW_COUNT"
echo "STDIO_COMMAND=$NODE_BIN $REPO_ROOT/dist/src/index.js"
