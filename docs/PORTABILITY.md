# Portability

LocalBridge MCP separates the portable MCP core from platform-specific service management.

## Portable core

The TypeScript stdio MCP core is intended for macOS and Linux and is exercised by repository CI on both platforms.

The core depends on:

- Node.js 20 or newer
- npm dependencies from the lockfile
- a POSIX shell on the currently qualified Unix paths
- ripgrep provided through the project dependency or a compatible system binary

## macOS

macOS has the most complete qualification:

- stdio MCP
- filesystem/search/edit
- persistent terminal sessions
- launchd auto-start
- protected Documents/Desktop access through Runtime.app/TCC
- crash recovery
- production health/readiness
- runtime update flow
- OpenAI Secure MCP Tunnel runtime path
- ChatGPT connector end-to-end smoke tests for read, write, and shell

This is the only production-oriented desktop runtime path currently advertised by the repository.

## Linux

Linux is qualified for the portable stdio core through CI.

There is intentionally no fake launchd abstraction on Linux. A future Linux production service should use a native service manager such as systemd and receive its own qualification before being advertised as production-ready.

## Windows

Windows is **not yet qualified**.

Parts of the core contain Windows-aware code, but the project does not currently claim Windows support. Do not interpret code paths as a support guarantee.

A proper Windows support claim would need a dedicated qualification lane covering at least:

- Windows path handling and drive-letter behavior
- CRLF/LF line ending preservation
- PowerShell and/or `cmd.exe` shell behavior
- long-running process management
- filesystem permission boundaries
- service startup, restart, health, and update behavior
- `tunnel-client` behavior on Windows
- ChatGPT connector end-to-end smoke tests for read, write, and shell

WSL may be useful for experiments, but WSL should be treated as an unqualified Linux-like environment until it has its own focused validation. Do not advertise Windows or WSL as a supported LocalBridge install target from this repository yet.

## Remote transports

The MCP core does not require OpenAI Secure MCP Tunnel.

The tunnel path is one deployment adapter. Other MCP clients can run the stdio server locally. Future authenticated remote transports can be added without moving the filesystem/terminal execution engine off the user's machine.