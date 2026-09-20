# LocalBridge MCP

LocalBridge MCP is a self-hosted MCP computer-control server for local files, text editing, search, persistent shell sessions, Git workflows, and SSH-driven operations.

It does **not** provide a hosted relay. Each user runs their own MCP server and owns their machine, credentials, tunnel, filesystem allowlist, and remote hosts.

Current source version: **v0.2.0**. The portable stdio core is qualified on macOS and Linux. The persistent login runtime is qualified on macOS. npm publication remains disabled; releases are source-only.


## Install with an AI assistant

You can hand this repository to ChatGPT, Claude, Codex, or another coding assistant and ask it to install LocalBridge MCP on your machine. Use this prompt:

```text
Install LocalBridge MCP from https://github.com/danielcanfly/localbridge-mcp on this computer.

Read README.md and docs/INSTALL_MACOS.md first. Do not invent credentials. Do not print secrets.

Target: macOS persistent ChatGPT runtime.

Requirements I will provide separately:
- my OpenAI Secure MCP Tunnel ID
- my own OpenAI API key with Tunnels permission only
- the local directories I want LocalBridge MCP to access

Use the repository scripts instead of hand-writing a service:
1. clone the repo
2. run npm ci
3. run npm test
4. create ~/.config/localbridge-mcp/tunnel-runtime-key with chmod 600, but never display the key
5. run scripts/setup-macos.sh with my allowlist, tunnel id, and file: key reference
6. run tunnel-client doctor for the generated profile
7. verify scripts/macos-service.sh status returns HEALTH=ok and READY=ok

Stop and ask me if any credential, tunnel, or macOS permission is missing.
```

The assistant can do the local installation work, but every user must bring their own tunnel, credential, and filesystem allowlist. LocalBridge MCP does not ship shared credentials or a hosted relay.

## What it exposes

LocalBridge MCP provides 17 MCP tools with a LocalBridge-specific `lb_*` surface:

- `lb_read_text`, `lb_read_many_texts`, `lb_list_entries`, `lb_stat_path`
- `lb_write_text`, `lb_make_directory`, `lb_move_path`, `lb_patch_text_block`
- `lb_search_start`, `lb_search_read`, `lb_search_cancel`, `lb_search_sessions`
- `lb_run_shell`, `lb_shell_output`, `lb_shell_input`, `lb_shell_sessions`, `lb_shell_kill`

Git, Docker, SSH, systemd, test runners, and similar workflows use the general shell surface instead of product-specific wrappers.

## Support matrix

| Capability | macOS | Linux | Windows |
| --- | --- | --- | --- |
| stdio MCP core | Qualified | Qualified in CI | Not yet qualified |
| filesystem/search/edit | Qualified | Qualified in CI | Not yet qualified |
| persistent shell sessions | Qualified | Qualified in CI | Not yet qualified |
| launch-at-login runtime | Qualified with launchd | Not implemented | Not implemented |
| macOS protected-folder handling | Qualified with Runtime.app/TCC | N/A | N/A |
| OpenAI Secure MCP Tunnel path | Qualified on macOS | Core-compatible, not production-qualified here | Not qualified |

## Quick start: local stdio core

Requirements:

- Node.js 20 or newer
- npm
- macOS or Linux for the currently qualified core path

Clone the repository, then choose the directories the filesystem tools are allowed to access:

    ./scripts/setup-core.sh --allow "$HOME/Projects"

The setup is fail-closed. If no `--allow` values are supplied, filesystem tools cannot access any directory.

The script prints the stdio command you can register in an MCP client.

You can inspect the installation without printing secrets:

    ./scripts/doctor.sh

## macOS persistent ChatGPT runtime

The macOS production path is:

    ChatGPT
      -> your MCP app
      -> your OpenAI Secure MCP Tunnel
      -> launchd
      -> LocalBridge MCP Runtime.app
      -> tunnel-client
      -> Node
      -> LocalBridge MCP

Requirements in addition to the core:

- macOS
- Xcode Command Line Tools
- `tunnel-client` already installed
- your own Secure MCP Tunnel ID
- your own control-plane credential stored outside the repository

Example:

    mkdir -p "$HOME/.config/localbridge-mcp"
    chmod 700 "$HOME/.config/localbridge-mcp"

    # Paste your own Tunnels-only OpenAI API key locally. Do not commit it.
    printf '%s' 'YOUR_TUNNELS_ONLY_API_KEY' > "$HOME/.config/localbridge-mcp/tunnel-runtime-key"
    chmod 600 "$HOME/.config/localbridge-mcp/tunnel-runtime-key"

    ./scripts/setup-macos.sh \
      --allow "$HOME/Projects" \
      --tunnel-id YOUR_TUNNEL_ID \
      --api-key-ref "file:$HOME/.config/localbridge-mcp/tunnel-runtime-key"

LocalBridge MCP never ships a shared tunnel ID, API key, SSH key, or hosted relay.

See [docs/INSTALL_MACOS.md](docs/INSTALL_MACOS.md) for the full installation and update flow.

## Service commands on macOS

    ./scripts/macos-service.sh status
    ./scripts/macos-service.sh update
    ./scripts/macos-service.sh restart
    ./scripts/macos-service.sh stop
    ./scripts/macos-service.sh start
    ./scripts/macos-service.sh uninstall

Normal updates replace the deployed JavaScript bundle without rebuilding the Runtime.app, preserving its macOS privacy authorization. The update path reloads the LaunchAgent when its runtime environment changes.

LocalBridge MCP holds active-only macOS sleep prevention while the production tunnel is alive: `caffeinate -i -w <tunnel-pid>`. It releases that assertion when the service stops or the tunnel exits. It does not request display wake or override lid-close sleep.

## Configuration

The default is deliberately fail-closed:

    {
      "allowedDirectories": []
    }

See [config.example.json](config.example.json).

User-specific paths, tunnel identifiers, credentials, SSH aliases/keys, and runtime secrets belong in external configuration, never in the repository.

`fileWriteLineLimit` is an advisory chunking threshold for `lb_write_text`. It produces a warning for large writes; it is not a security boundary or hard size cap.

## Security model

LocalBridge MCP is intentionally powerful.

Filesystem allowlists and command blocklists are guardrails, not a security sandbox. Shell commands execute with the permissions of the operating-system user. Shells, interpreters, scripts, and remote SSH commands can reach resources outside the filesystem-tool allowlist if the OS user can reach them.

For stronger isolation, use a dedicated OS account, container, or VM. Never expose an unauthenticated shell-capable MCP endpoint to the public Internet.

Read [SECURITY.md](SECURITY.md) before enabling remote access.

## Qualification and release evidence

Product qualification evidence lives under [docs/qualification](docs/qualification). It is retained for auditability but kept out of the main product path.

## License and notices

LocalBridge MCP is MIT licensed. Third-party license and provenance notices are preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Development

    npm ci
    npm test
    npm run release:preflight

The npm package is marked `private` intentionally. This repository is source distribution, not an npm registry release.
