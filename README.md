# Daniel Commander

Self-hosted MCP computer control for local files, search, surgical editing, persistent terminal sessions, Git workflows, and SSH.

Status: pre-alpha. P0 through P5 are qualified. The single-owner macOS runtime auto-starts through launchd and connects a private ChatGPT app to the owner's Mac through OpenAI Secure MCP Tunnel.

## Capabilities

Daniel Commander exposes 17 focused MCP tools covering:

- text filesystem read/write/list/create/move/info
- exact and fuzzy block editing
- asynchronous ripgrep filename/content search
- persistent terminal process start/output/stdin/session/termination

Git, Docker, SSH, systemd, test runners, and similar workflows use the general terminal surface instead of product-specific tools.

The selected upstream-derived execution core is pinned to Desktop Commander MCP v0.2.51 commit 092ce0b841e86455f12e41f4dc36399a7522ecb5. See THIRD_PARTY_NOTICES.md.

## macOS production architecture

    ChatGPT
      -> private Daniel Commander app
      -> OpenAI Secure MCP Tunnel
      -> launchd
      -> Daniel Commander Runtime.app
      -> tunnel-client
      -> Homebrew Node
      -> deployed Daniel Commander MCP bundle

The development checkout is not executed directly by launchd. A pruned production bundle is deployed outside protected Documents/Desktop locations.

The Runtime.app exists because macOS TCC blocks a plain background LaunchAgent from protected folders. Normal updates replace only the JS runtime bundle, preserving the app identity and its privacy authorization.

See docs/P5_STATUS.md for TCC, crash-recovery, and update qualification details.

## Service commands

From the source checkout:

    ./scripts/macos-service.sh install
    ./scripts/macos-service.sh status
    ./scripts/macos-service.sh update
    ./scripts/macos-service.sh restart
    ./scripts/macos-service.sh stop
    ./scripts/macos-service.sh start
    ./scripts/macos-service.sh uninstall

## Configuration

Fresh installs are fail-closed:

    allowedDirectories: []

Explicit filesystem roots must be configured externally before filesystem tools can access them. User-specific paths, tunnel identifiers, credentials, SSH keys, and other secrets do not belong in this repository.

## Security model

Daniel Commander is intentionally powerful. Filesystem allowlists and command blocklists are guardrails, not a security sandbox.

Terminal commands execute with the permissions of the operating-system user. Shells, interpreters, scripts, and remote SSH commands can reach resources outside the filesystem-tool allowlist if the OS user can reach them.

For stronger isolation, use a dedicated OS account, container, or VM. Never expose an unauthenticated shell-capable MCP endpoint to the public Internet.

## Qualification history

- P0: repository/bootstrap/provenance
- P1: ChatGPT Plus Secure MCP Tunnel entitlement gate
- P2: headless execution core
- P3: 17-tool MCP surface and live tunnel qualification
- P4: real Mac, Git, tests, and existing SSH operator workflow
- P5: TCC-aware macOS production runtime, auto-start, crash recovery, health, logs, and update flow

Detailed evidence is under docs/.
