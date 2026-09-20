# Daniel Commander

Daniel Commander is a self-hosted MCP computer-control server for local files, search, surgical editing, persistent terminal sessions, Git workflows, and SSH.

It does **not** provide a hosted relay. Each user runs their own MCP server and owns their own machine, credentials, tunnel, and remote hosts.

Current source version: **v0.1.0-rc.1**. The portable stdio core is qualified on macOS and Linux. The persistent login runtime is qualified on macOS. npm publication remains disabled; releases are source-only.

## What it exposes

Daniel Commander provides 17 MCP tools covering:

- text filesystem read/write/list/create/move/info
- exact and fuzzy block editing
- asynchronous ripgrep filename/content search
- persistent terminal process start/output/stdin/session/termination

Git, Docker, SSH, systemd, test runners, and similar workflows use the general terminal surface instead of product-specific wrappers.

## Support matrix

| Capability | macOS | Linux | Windows |
| --- | --- | --- | --- |
| stdio MCP core | Qualified | Qualified in CI | Not yet qualified |
| filesystem/search/edit | Qualified | Qualified in CI | Not yet qualified |
| persistent terminal | Qualified | Qualified in CI | Not yet qualified |
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
      -> your private MCP app
      -> your OpenAI Secure MCP Tunnel
      -> launchd
      -> Daniel Commander Runtime.app
      -> tunnel-client
      -> Node
      -> Daniel Commander MCP

Requirements in addition to the core:

- macOS
- Xcode Command Line Tools
- `tunnel-client` already installed
- your own Secure MCP Tunnel ID
- your own control-plane credential stored in a private file

Example:

    chmod 600 "$HOME/.config/daniel-commander/tunnel-runtime-key"

    ./scripts/setup-macos.sh \
      --allow "$HOME/Projects" \
      --tunnel-id YOUR_TUNNEL_ID \
      --api-key-ref "file:$HOME/.config/daniel-commander/tunnel-runtime-key"

Daniel Commander never ships a shared tunnel ID, API key, SSH key, or hosted relay.

See [docs/INSTALL_MACOS.md](docs/INSTALL_MACOS.md) for the full installation and update flow.

## Service commands on macOS

    ./scripts/macos-service.sh status
    ./scripts/macos-service.sh update
    ./scripts/macos-service.sh restart
    ./scripts/macos-service.sh stop
    ./scripts/macos-service.sh start
    ./scripts/macos-service.sh uninstall

Normal updates replace the deployed JavaScript bundle without rebuilding the Runtime.app, preserving its macOS privacy authorization. The update path reloads the LaunchAgent when its runtime environment changes.

Current `main` implements active-only macOS sleep prevention: while the production tunnel is alive, Daniel Commander holds `caffeinate -i -w <tunnel-pid>` and releases it when the service stops or the tunnel exits. This prevents idle system sleep while remote control is active without requesting display wake or overriding lid-close sleep. The tagged `v0.1.0-rc.1` source predates this original-P8 repair.

## Configuration

The default is deliberately fail-closed:

    {
      "allowedDirectories": []
    }

See [config.example.json](config.example.json).

User-specific paths, tunnel identifiers, credentials, SSH aliases/keys, and runtime secrets belong in external configuration, never in the repository.

`fileWriteLineLimit` is an advisory chunking threshold for `write_file`. It produces a warning for large writes; it is not a security boundary or hard size cap.

## Security model

Daniel Commander is intentionally powerful.

Filesystem allowlists and command blocklists are guardrails, not a security sandbox. Terminal commands execute with the permissions of the operating-system user. Shells, interpreters, scripts, and remote SSH commands can reach resources outside the filesystem-tool allowlist if the OS user can reach them.

For stronger isolation, use a dedicated OS account, container, or VM. Never expose an unauthenticated shell-capable MCP endpoint to the public Internet.

Read [SECURITY.md](SECURITY.md) before enabling remote access.

## Upstream provenance

Daniel Commander selectively derives portions of Desktop Commander MCP. The selected baseline is Desktop Commander MCP v0.2.51 commit `092ce0b841e86455f12e41f4dc36399a7522ecb5`.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution and the upstream MIT license.

## Development

    npm ci
    npm test

The repository CI runs the portable core on macOS and Linux. macOS additionally type-checks the Runtime.app supervisor.

The npm package is marked `private` intentionally. This repository is source distribution, not an npm registry release.

## Qualification history

- P0: repository/bootstrap/provenance
- P1: Secure MCP Tunnel entitlement gate
- P2: headless execution core
- P3: 17-tool MCP surface
- P4: real Mac, Git, tests, and existing SSH operator workflow
- P5: TCC-aware macOS production runtime, auto-start, crash recovery, health, logs, and update flow
- P6: public-ready setup, portability, clean-room install, documentation, CI, and release privacy gates

Detailed qualification evidence is under `docs/`.

## Releases

See [CHANGELOG.md](CHANGELOG.md) for release notes and [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md) for the release workflow.

The current release candidate is `v0.1.0-rc.1`. GitHub source releases are supported; npm publishing and prebuilt/notarized Runtime.app binaries are not currently offered.
