# Changelog

All notable Daniel Commander source releases are documented here.

## [0.1.0-rc.1] - 2026-09-20

First public-release candidate.

### Added

- 17 focused MCP tools for filesystem, edit, search, and persistent terminal workflows.
- Portable stdio MCP core qualified on macOS and Linux.
- TCC-aware macOS Runtime.app and launchd production service.
- OpenAI Secure MCP Tunnel deployment path using user-owned tunnel credentials.
- Fail-closed filesystem configuration and clean-room setup scripts.
- Doctor, security, portability, contribution, and public-release documentation.
- macOS/Linux CI matrix on Node.js 20 and 24.

### Hardened

- Removed the one-off P1 Gate qualification scaffold from release source.
- Synchronized the MCP server protocol version with the package release version.
- Removed unused telemetry-derived fuzzy-search timing payloads.
- Activated `fileWriteLineLimit` as an advisory write-chunk warning instead of leaving a dead configuration key.
- Hardened direct-start config directory permissions to 0700.

- Removed upstream telemetry, hosted remote-device dependencies, product UI, and document-specific tooling from the imported execution core.
- Added verified orphan-tunnel cleanup and two-layer crash recovery.
- Removed login-shell startup files from background terminal execution.
- Added POSIX process-group termination to prevent orphan command descendants.
- Fixed unread terminal-output cursor handling across chunk boundaries.
- Pinned GitHub Actions to exact commit SHAs.

### Known boundaries

- Windows is not yet qualified.
- Linux production service management is not yet implemented.
- Filesystem allowlists and command blocklists are guardrails, not an OS sandbox.
- The project does not provide a hosted relay or shared remote credentials.
- The macOS runtime does not yet prevent system sleep; remote access pauses while the Mac is asleep.
- npm publication is intentionally disabled; this release distributes source through GitHub.
