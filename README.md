# Daniel Commander

Self-hosted MCP computer-control server for local files, search, surgical editing, persistent terminal sessions, and SSH workflows.

> Status: pre-alpha. P0 through P4 are qualified. The 17-tool MCP surface works locally and from ChatGPT through a private Secure MCP Tunnel, including real Git workflows and persistent SSH to an existing remote host.

## Design goals

- Run the execution engine on the user's own Mac, Linux machine, or VM.
- Do not require a shared Daniel Commander cloud relay.
- Do not impose a Daniel Commander usage quota.
- Keep the runtime headless and small.
- Support local files, ripgrep search, targeted edits, persistent shell sessions, Git through the shell, and SSH through the shell.
- Keep user-specific paths, SSH aliases, credentials, keys, and tunnel secrets outside the repository.

## Current MCP surface

Daniel Commander exposes 17 focused tools covering:

- text filesystem read/write/list/create/move/info
- exact and fuzzy block editing
- asynchronous ripgrep filename/content search
- persistent terminal process start/output/stdin/session/termination

The selected upstream-derived core is pinned to Desktop Commander MCP v0.2.51 commit `092ce0b841e86455f12e41f4dc36399a7522ecb5`. See `THIRD_PARTY_NOTICES.md`, `docs/P2_SOURCE_CENSUS.md`, `docs/P3_STATUS.md`, and `docs/P4_STATUS.md`.

## Remote path

The qualified ChatGPT path is:

    ChatGPT
      -> private development app
      -> OpenAI Secure MCP Tunnel
      -> tunnel-client on the user's machine
      -> Daniel Commander stdio MCP

The same local terminal surface can use the user's existing SSH configuration to operate a remote machine. No Daniel Commander agent needs to be installed on that remote machine.

## Configuration

Fresh installs are fail-closed. Filesystem access starts with:

    allowedDirectories: []

Explicit roots must be configured in the user's external Daniel Commander config before filesystem tools can access them. Do not commit personal paths, credentials, SSH keys, tunnel identifiers, or runtime API keys to a public repository.

## Security

Daniel Commander is intentionally powerful. Filesystem allowlists and command blocklists are guardrails, not a security sandbox.

The terminal runs with the permissions of the operating-system user and can reach resources that are outside the filesystem-tool allowlist. Nested commands inside interpreters, scripts, or remote SSH command strings must not be assumed safe merely because a top-level command parser exists.

For stronger isolation, use OS permissions, a dedicated OS account, a container, or a VM. Do not expose an unauthenticated shell-capable MCP endpoint to the public Internet.
