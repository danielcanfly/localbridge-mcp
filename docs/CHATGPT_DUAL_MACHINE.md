# ChatGPT dual-machine setup

This guide is for running LocalBridge MCP from two macOS machines at the same time, for example:

All usernames and home directories below are placeholders. Replace `air-user` and `mini-user` with the actual account names on your own machines, and do not publish real account or credential paths in a shared repository.

| Machine | macOS user | Suggested profile | Suggested allowlist |
| --- | --- | --- | --- |
| MacBook Air | `air-user` | `localbridge-macbook-air` | `/Users/air-user/` |
| Mac mini | `mini-user` | `localbridge-mac-mini` | `/Users/mini-user/` |

The important rule is simple: **do not make both machines share the same tunnel identity**. A profile such as `localbridge-prod` is fine for a single machine, but it becomes ambiguous once two Macs are online.

## Recommended shape

Use one OpenAI Secure MCP Tunnel per machine and one ChatGPT developer-mode MCP app per machine.

```text
ChatGPT
  -> LocalBridge MacBook Air
  -> OpenAI tunnel for MacBook Air
  -> MacBook Air launchd service
  -> /Users/air-user allowlist

ChatGPT
  -> LocalBridge Mac mini
  -> OpenAI tunnel for Mac mini
  -> Mac mini launchd service
  -> /Users/mini-user allowlist
```

Recommended ChatGPT-side app names:

```text
LocalBridge MacBook Air
LocalBridge Mac mini
```

Both apps should use:

```text
Connection: Tunnel
Authentication: None
```

Select the matching tunnel in each app.

## Install on MacBook Air

Run this on the MacBook Air as the `air-user` macOS user:

```bash
git clone https://github.com/mini-usercanfly/localbridge-mcp.git
cd localbridge-mcp
npm ci
npm test

sh scripts/setup-chatgpt-machine.sh \
  --machine macbook-air \
  --allow /Users/air-user
```

The script prompts for:

1. the MacBook Air OpenAI Secure MCP Tunnel ID;
2. a Runtime API key with Tunnels permission only, using hidden input if no key file already exists.

The default generated values are:

```text
profile: localbridge-macbook-air
launchd label: io.localbridge.mcp.macbook.air
state dir: ~/.local/state/localbridge-mcp-macbook-air
log dir: ~/Library/Logs/LocalBridgeMCP-macbook-air
health: 127.0.0.1:43127
```

## Install on Mac mini

Run this on the Mac mini as the `mini-user` macOS user:

```bash
git clone https://github.com/mini-usercanfly/localbridge-mcp.git
cd localbridge-mcp
npm ci
npm test

sh scripts/setup-chatgpt-machine.sh \
  --machine mac-mini \
  --allow /Users/mini-user
```

The script prompts for:

1. the Mac mini OpenAI Secure MCP Tunnel ID;
2. a Runtime API key with Tunnels permission only, using hidden input if no key file already exists.

The default generated values are:

```text
profile: localbridge-mac-mini
launchd label: io.localbridge.mcp.mac.mini
state dir: ~/.local/state/localbridge-mcp-mac-mini
log dir: ~/Library/Logs/LocalBridgeMCP-mac-mini
health: 127.0.0.1:43128
```

## Non-interactive mode

Use this only when the tunnel ID and local key file already exist.

Mac mini example:

```bash
sh scripts/setup-chatgpt-machine.sh \
  --machine mac-mini \
  --profile localbridge-mac-mini \
  --allow /Users/mini-user \
  --tunnel-id tunnel_your_mac_mini_tunnel_id \
  --api-key-ref file:/Users/mini-user/.config/localbridge-mcp/tunnel-runtime-key-mac-mini
```

MacBook Air example:

```bash
sh scripts/setup-chatgpt-machine.sh \
  --machine macbook-air \
  --profile localbridge-macbook-air \
  --allow /Users/air-user \
  --tunnel-id tunnel_your_macbook_air_tunnel_id \
  --api-key-ref file:/Users/air-user/.config/localbridge-mcp/tunnel-runtime-key-macbook-air
```

Do not commit key files, tunnel IDs, connector URLs, SSH keys, or other secrets.

## Status checks

MacBook Air:

```bash
LOCALBRIDGE_MCP_LAUNCHD_LABEL=io.localbridge.mcp.macbook.air \
LOCALBRIDGE_MCP_PROFILE=localbridge-macbook-air \
LOCALBRIDGE_MCP_STATE_DIR=$HOME/.local/state/localbridge-mcp-macbook-air \
LOCALBRIDGE_MCP_LOG_DIR=$HOME/Library/Logs/LocalBridgeMCP-macbook-air \
sh scripts/macos-service.sh status
```

Mac mini:

```bash
LOCALBRIDGE_MCP_LAUNCHD_LABEL=io.localbridge.mcp.mac.mini \
LOCALBRIDGE_MCP_PROFILE=localbridge-mac-mini \
LOCALBRIDGE_MCP_STATE_DIR=$HOME/.local/state/localbridge-mcp-mac-mini \
LOCALBRIDGE_MCP_LOG_DIR=$HOME/Library/Logs/LocalBridgeMCP-mac-mini \
sh scripts/macos-service.sh status
```

A healthy machine should report:

```text
LAUNCHD=loaded
HEALTH=ok
READY=ok
```

After connecting in ChatGPT, run a tiny identity check through each LocalBridge app:

```bash
whoami
hostname
printf 'HOME=%s\n' "$HOME"
pwd
```

Expected results:

```text
MacBook Air -> air-user, /Users/air-user
Mac mini    -> mini-user, /Users/mini-user
```

## Migrating from the old single-machine service

If a machine is already running the old default profile:

```text
profile: localbridge-prod
launchd label: io.localbridge.mcp
```

keep it running until the new named machine service is verified. After the named service is healthy and ChatGPT connects to the right machine, remove the old default service from that same machine:

```bash
sh scripts/macos-service.sh uninstall
```

That command uses the default label `io.localbridge.mcp`, so it removes the old single-machine service, not the named service such as `io.localbridge.mcp.mac.mini`.

## Failure modes

### ChatGPT still reaches the wrong Mac

Run through the LocalBridge tool:

```bash
whoami && hostname && printf 'HOME=%s\n' "$HOME"
```

If ChatGPT says it reached `air-user` when you expected `mini-user`, the ChatGPT app is still pointed at the MacBook Air tunnel. Edit the ChatGPT developer-mode MCP app and select the Mac mini tunnel.

### Two machines used the same tunnel

Only one live machine should own a given tunnel identity. Create a second OpenAI Secure MCP Tunnel and bind it to the other Mac.

### The service is loaded but not ready

Run the status command for that machine and inspect its dedicated logs:

```bash
tail -n 200 "$HOME/Library/Logs/LocalBridgeMCP-mac-mini/launcher.stderr.log"
tail -n 200 "$HOME/Library/Logs/LocalBridgeMCP-mac-mini/tunnel-client.jsonl"
```

Replace `mac-mini` with `macbook-air` on the MacBook Air.

### macOS blocks Desktop or Documents

Open System Settings and approve LocalBridge MCP Runtime for the folder you intentionally allowlisted. Keep the allowlist as narrow as practical.