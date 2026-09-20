# macOS installation

This guide covers the public single-owner macOS path.

## 1. Prerequisites

Install:

- Node.js 20 or newer and npm
- Xcode Command Line Tools
- tunnel-client if you want the OpenAI Secure MCP Tunnel path

LocalBridge MCP does not install or bundle a shared remote relay.

## 2. Clone and configure the core

Choose one or more directories the MCP filesystem tools may access:

    ./scripts/setup-core.sh --allow "$HOME/Projects"

You can repeat `--allow`.

Running the script with no allowed directories is valid and leaves filesystem access disabled.

Inspect the result:

    ./scripts/doctor.sh

## 3. Local MCP clients

The core setup prints a stdio command in this form:

    /absolute/path/to/node /absolute/path/to/localbridge-mcp/dist/src/index.js

Register that command in any MCP client that supports a local stdio server.

No tunnel is needed for this mode.

## 4. Prepare remote credentials

For the persistent ChatGPT path you need your own OpenAI Secure MCP Tunnel configuration.

Store the control-plane credential in a private file rather than in a shell history or plist:

    mkdir -p "$HOME/.config/localbridge-mcp"
    chmod 700 "$HOME/.config/localbridge-mcp"

    # Write the credential using the secure workflow provided by your account/tooling.
    chmod 600 "$HOME/.config/localbridge-mcp/tunnel-runtime-key"

Do not put the credential in this repository.

## 5. Configure the macOS remote runtime

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

## 6. Verify

    ./scripts/macos-service.sh status

A healthy service reports:

    LAUNCHD=loaded
    STATE=running
    TCC_PREFLIGHT=ok
    HEALTH=ok
    READY=ok

You can also run:

    ./scripts/doctor.sh

## 7. Update

After pulling source changes:

    npm test
    ./scripts/macos-service.sh update

The normal update path replaces the deployed JavaScript runtime without rebuilding Runtime.app.

## 8. Stop or uninstall the service

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
