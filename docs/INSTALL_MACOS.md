# macOS installation

This guide covers the public single-owner macOS path for the currently qualified ChatGPT / OpenAI Secure MCP Tunnel setup.

## 1. Prerequisites

Install:

- Node.js 20 or newer and npm
- Xcode Command Line Tools
- `git`
- `tunnel-client` if you want the OpenAI Secure MCP Tunnel path

LocalBridge MCP does not install or bundle a shared remote relay.

## 2. Required user inputs

The persistent ChatGPT runtime needs user-owned configuration that is not included in this repository. Prepare these before running the macOS service setup:

| Required input | What it means | How to handle it |
| --- | --- | --- |
| OpenAI Secure MCP Tunnel ID | The tunnel identifier, usually starting with `tunnel_` | Create or find it in OpenAI Tunnels management; pass it to `--tunnel-id`; do not invent it |
| Tunnels-only API key | An OpenAI API key restricted to the `Tunnels` permission | Create it in OpenAI Runtime API keys; store it in `~/.config/localbridge-mcp/tunnel-runtime-key` with mode `600`; do not paste it into chat or commit it |
| Filesystem allowlist | Directories LocalBridge MCP may access through filesystem tools | Pass one or more `--allow` values; start with a project directory |
| macOS privacy approval | Runtime.app access to protected folders such as Desktop or Documents | Approve only the folders you intentionally allow |
| `tunnel-client` | Local tunnel client binary | Install it before using the persistent ChatGPT tunnel path |

If an AI assistant is installing this for you, it must show the setup links below before asking whether you already have a tunnel ID, runtime key, or `tunnel-client`. It should not create fake tunnel IDs, fake keys, or broad allowlists on your behalf.

For local stdio-only use, you can skip the tunnel ID, tunnel API key, and `tunnel-client`. You still need to choose an allowlist.

## 3. OpenAI setup links the assistant must show

When the selected platform is ChatGPT / OpenAI and any tunnel or key value is missing, the assistant must show this block before asking for values:

```text
Create or find your OpenAI Secure MCP Tunnel:
https://platform.openai.com/settings/organization/tunnels

Create a Runtime API key for tunnel-client:
https://platform.openai.com/settings/organization/api-keys

Use a restricted runtime key with Tunnels permission for the long-running daemon.
Do not paste the key into chat. The bootstrap script will read it with hidden input and store it locally at:
~/.config/localbridge-mcp/tunnel-runtime-key

Do not use an Admin API key as the long-running runtime key. Admin keys are for tunnel management, not the daemon.

ChatGPT connector settings:
https://chatgpt.com/#settings/Connectors

OpenAI tunnel-client installation and permission docs:
https://github.com/openai/tunnel-client/blob/master/docs/end-user-guide.md
https://github.com/openai/tunnel-client/blob/master/docs/permissions.md
```

The assistant should then ask:

```text
Tunnel ID: already available / need to create
Tunnels-only Runtime API key: already available / need to create
Allowlist directory: <path>
tunnel-client: installed / not installed / unsure
```

The assistant should not ask the user to paste the API key into chat.

## 4. Copy-paste bootstrap when the assistant has no local shell tool

Some AI sessions can read this repository but cannot operate the user's Mac directly. In that case, the assistant should not merely stop after explaining the limitation. It should provide a single copy-paste Terminal script that:

- asks the user for the tunnel ID interactively;
- asks for the filesystem allowlist interactively, with a narrow default;
- asks for the Tunnels-only API key with hidden input using `read -s`;
- writes the key to `~/.config/localbridge-mcp/tunnel-runtime-key` with mode `600` without printing it;
- checks Node.js, npm, Xcode Command Line Tools, `git`, and `tunnel-client`;
- clones or updates LocalBridge MCP at the requested release tag;
- runs `npm ci` and `npm test`;
- runs `scripts/setup-macos.sh` with the user-provided values;
- verifies `scripts/macos-service.sh status`;
- tells the user to paste the terminal output back into the chat.

The assistant should not ask the user to edit placeholders in the command. The command itself should prompt for user-specific values.

Paste-and-run bootstrap for the latest documented release:

```bash
set -euo pipefail

RELEASE_TAG="v0.2.1"
REPO_URL="https://github.com/danielcanfly/localbridge-mcp.git"
DEFAULT_WORKSPACE="$HOME/Documents/GitHub"
DEFAULT_ALLOWLIST="$HOME/Documents/GitHub"
KEY_FILE="$HOME/.config/localbridge-mcp/tunnel-runtime-key"

cleanup_secret() {
  stty echo 2>/dev/null || true
  unset LOCALBRIDGE_TUNNELS_API_KEY 2>/dev/null || true
}
trap cleanup_secret EXIT

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "MISSING_REQUIRED_COMMAND: $1"
    exit 1
  fi
}

need_cmd git
need_cmd node
need_cmd npm
need_cmd xcode-select

if ! xcode-select -p >/dev/null 2>&1; then
  echo "MISSING_XCODE_COMMAND_LINE_TOOLS"
  echo "Install them with: xcode-select --install"
  exit 1
fi

if command -v tunnel-client >/dev/null 2>&1; then
  TUNNEL_CLIENT_BIN="$(command -v tunnel-client)"
elif [ -x /opt/homebrew/bin/tunnel-client ]; then
  TUNNEL_CLIENT_BIN="/opt/homebrew/bin/tunnel-client"
elif [ -x /usr/local/bin/tunnel-client ]; then
  TUNNEL_CLIENT_BIN="/usr/local/bin/tunnel-client"
else
  echo "MISSING_TUNNEL_CLIENT"
  echo "Install tunnel-client first, then rerun this script."
  exit 1
fi

printf 'OpenAI Secure MCP Tunnel ID, starts with tunnel_: '
IFS= read -r LOCALBRIDGE_TUNNEL_ID
case "$LOCALBRIDGE_TUNNEL_ID" in
  tunnel_*) ;;
  *) echo "INVALID_TUNNEL_ID"; exit 1 ;;
esac

printf 'Filesystem allowlist [%s]: ' "$DEFAULT_ALLOWLIST"
IFS= read -r LOCALBRIDGE_ALLOWLIST
LOCALBRIDGE_ALLOWLIST="${LOCALBRIDGE_ALLOWLIST:-$DEFAULT_ALLOWLIST}"

if [ ! -d "$LOCALBRIDGE_ALLOWLIST" ]; then
  echo "ALLOWLIST_DIRECTORY_MISSING: $LOCALBRIDGE_ALLOWLIST"
  echo "Create the directory or rerun with a different allowlist."
  exit 1
fi

printf 'Workspace for cloning/updating LocalBridge MCP [%s]: ' "$DEFAULT_WORKSPACE"
IFS= read -r LOCALBRIDGE_WORKSPACE
LOCALBRIDGE_WORKSPACE="${LOCALBRIDGE_WORKSPACE:-$DEFAULT_WORKSPACE}"
mkdir -p "$LOCALBRIDGE_WORKSPACE"

printf 'Paste Tunnels-only API key, input hidden: '
stty -echo
IFS= read -r LOCALBRIDGE_TUNNELS_API_KEY
stty echo
printf '\n'

if [ -z "$LOCALBRIDGE_TUNNELS_API_KEY" ]; then
  echo "EMPTY_API_KEY"
  exit 1
fi

mkdir -p "$(dirname "$KEY_FILE")"
chmod 700 "$(dirname "$KEY_FILE")"
printf '%s' "$LOCALBRIDGE_TUNNELS_API_KEY" > "$KEY_FILE"
chmod 600 "$KEY_FILE"
unset LOCALBRIDGE_TUNNELS_API_KEY

if [ ! -s "$KEY_FILE" ]; then
  echo "KEY_FILE_MISSING_OR_EMPTY"
  exit 1
fi

REPO_DIR="$LOCALBRIDGE_WORKSPACE/localbridge-mcp"
if [ -d "$REPO_DIR/.git" ]; then
  cd "$REPO_DIR"
  git fetch --tags origin
else
  git clone --branch "$RELEASE_TAG" "$REPO_URL" "$REPO_DIR"
  cd "$REPO_DIR"
fi

git checkout "$RELEASE_TAG"

node -v
npm -v
"$TUNNEL_CLIENT_BIN" --version || true

npm ci
npm test

./scripts/setup-macos.sh \
  --allow "$LOCALBRIDGE_ALLOWLIST" \
  --tunnel-id "$LOCALBRIDGE_TUNNEL_ID" \
  --api-key-ref "file:$KEY_FILE"

"$TUNNEL_CLIENT_BIN" doctor \
  --profile localbridge-prod \
  --profile-dir "$HOME/.config/tunnel-client" \
  --health.listen-addr 127.0.0.1:0

./scripts/macos-service.sh status

echo "LOCALBRIDGE_BOOTSTRAP_DONE"
echo "Paste this terminal output back into the AI session for review."
```

## 5. Clone and configure the core

Choose one or more directories the MCP filesystem tools may access:

    ./scripts/setup-core.sh --allow "$HOME/Projects"

You can repeat `--allow`.

Running the script with no allowed directories is valid and leaves filesystem access disabled.

Inspect the result:

    ./scripts/doctor.sh

## 6. Local MCP clients

The core setup prints a stdio command in this form:

    /absolute/path/to/node /absolute/path/to/localbridge-mcp/dist/src/index.js

Register that command in any MCP client that supports a local stdio server.

No tunnel is needed for this mode.

## 7. Prepare remote credentials

For the persistent ChatGPT path you need your own OpenAI Secure MCP Tunnel configuration. See section 3 for the exact OpenAI setup links.

Store the control-plane credential in a private file rather than in a shell history or plist:

    mkdir -p "$HOME/.config/localbridge-mcp"
    chmod 700 "$HOME/.config/localbridge-mcp"

    # Write the credential using the secure workflow provided by your account/tooling.
    chmod 600 "$HOME/.config/localbridge-mcp/tunnel-runtime-key"

Do not put the credential in this repository.

## 8. Configure the macOS remote runtime

    ./scripts/setup-macos.sh \
      --allow "$HOME/Projects" \
      --tunnel-id YOUR_TUNNEL_ID \
      --api-key-ref "file:$HOME/.config/localbridge-mcp/tunnel-runtime-key"

The script:

1. runs the core setup;
2. discovers stable Node/npm/tunnel-client paths;
3. creates your tunnel-client profile;
4. deploys a pruned production runtime outside Documents/Desktop;
5. creates the Runtime.app if necessary;
6. installs and starts a launchd service.

If macOS asks LocalBridge MCP Runtime for Documents/Desktop access, approve only the folders you intend LocalBridge MCP to operate on.

## 9. Verify

    ./scripts/macos-service.sh status

A healthy service reports:

    LAUNCHD=loaded
    STATE=running
    TCC_PREFLIGHT=ok
    HEALTH=ok
    READY=ok

You can also run:

    ./scripts/doctor.sh

## 10. Update

After pulling source changes:

    npm test
    ./scripts/macos-service.sh update

The normal update path replaces the deployed JavaScript runtime without rebuilding Runtime.app.

## 11. Stop or uninstall the service

Temporarily stop it:

    ./scripts/macos-service.sh stop

Start it again:

    ./scripts/macos-service.sh start

Remove the LaunchAgent:

    ./scripts/macos-service.sh uninstall

Uninstall does not delete your source checkout, external config, logs, credential file, or Runtime.app. This is deliberate so uninstalling the service cannot silently destroy user-owned data.

## Tool discovery

The macOS scripts prefer explicit overrides and then stable package-manager/system locations. Supported overrides include:

    LOCALBRIDGE_MCP_NODE
    LOCALBRIDGE_MCP_NPM
    LOCALBRIDGE_MCP_TUNNEL_CLIENT
    LOCALBRIDGE_MCP_SWIFTC

This supports Apple Silicon Homebrew, Intel Homebrew, and other stable absolute paths without baking one developer's machine into the project.

## Profile-only validation

To create and validate your private tunnel profile without installing launchd or Runtime.app yet:

    ./scripts/setup-macos.sh \
      --allow "$HOME/Projects" \
      --tunnel-id YOUR_TUNNEL_ID \
      --api-key-ref "file:$HOME/.config/localbridge-mcp/tunnel-runtime-key" \
      --no-service

This is useful for first-time setup and automation. When it passes, rerun without `--no-service` to install the persistent macOS service.
