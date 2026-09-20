# Changelog

All notable Daniel Commander source releases are documented here.

## [0.1.0-rc.2] - 2026-09-20

Second public-release candidate.

### Added

- Active-only macOS sleep prevention for the production tunnel lifecycle using `caffeinate -i -w <tunnel-pid>`.
- Runtime status reporting for the validated production caffeinate relationship.
- Original P8 lifecycle regression coverage and qualification documentation.

### Fixed

- Reloaded the macOS LaunchAgent after update-time environment changes so the runtime observes the deployed tunnel wrapper.
- Updated release-candidate notes to reflect that original P8 is closed and original P9 remains open.

### Known boundaries

- Original P9 row-by-row qualification remains open before any final `DANIEL_COMMANDER_V0_1_PASS` declaration.

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
- v0.1.0-rc.1 did not yet prevent system sleep; v0.1.0-rc.2 adds active-only macOS no-sleep behavior for the production tunnel lifecycle.
- npm publication is intentionally disabled; this release distributes source through GitHub.
