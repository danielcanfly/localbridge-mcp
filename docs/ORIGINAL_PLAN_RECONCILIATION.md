# Original construction-plan reconciliation

Authority: the original frozen Daniel Commander v0.1 construction plan defined P0 through P9 by task content. Later implementation sessions reused phase numbers for different milestones. From this document forward, task content is authoritative and phase-number drift must not be used to infer completion.

## Original P0: clean independent repository

Status: PASS.

Implemented as an independent GitHub repository with fresh history, `fork=false`, MIT project license, pinned Desktop Commander provenance, and THIRD_PARTY_NOTICES.md.

No GitHub fork-network relationship is used.

## Original P1: Gate 0 / Secure MCP Tunnel entitlement

Status: PASS, with timing deviation.

The isolated two-tool Gate proved ChatGPT discovery, local read, local write, write/destructive permissions, and the OpenAI Secure MCP Tunnel path before Desktop Commander source was imported.

The original Gate checklist also mentioned reconnect. Reconnect was not separately closed inside P1 itself. It was subsequently qualified more strongly by production unload/bootstrap and tunnel/supervisor crash recovery in the lifecycle implementation.

The one-off `gate/` implementation is no longer product source. P1 evidence remains in docs/P1_GATE_STATUS.md.

## Original P2: selective execution-core extraction

Status: PASS with deliberate structural simplification.

The pinned authority remained Desktop Commander MCP v0.2.51 at commit `092ce0b841e86455f12e41f4dc36399a7522ecb5`.

Instead of copying the initially proposed directory layout and full handler graph, a dependency census showed that direct reuse would drag in 66 coupled source files. Daniel Commander retained only the mature terminal/session, command, process-state, fuzzy-search, ripgrep, and search-session behavior and rewrote thin headless filesystem/edit/config/runtime adapters.

The resulting structure consolidates execution code under `src/core/` rather than mirroring upstream directories. This is an intentional architecture improvement, not a missing capability.

## Original P3: remove product baggage

Status: PASS, primarily by exclusion rather than delete-after-import.

The source/runtime dependency graph contains no Desktop Commander Cloud remote-device stack, Supabase, telemetry upload, analytics, feedback upload, onboarding, A/B/remote feature flags, UI resources, PDF/DOCX/Excel/image-special handling, prompts library, testimonials, or marketing assets.

Local algorithm timing measurements are allowed; they are not telemetry and are not uploaded.

## Original P4: freeze the v0.1 tool surface

Status: PASS.

Exactly 17 public MCP tools are registered:

- 7 filesystem tools;
- 1 edit tool;
- 4 search/session tools;
- 5 terminal/session tools.

There are intentionally no dedicated Git, Docker, SSH, systemd, pytest, or npm-test wrappers. Those workflows use the general terminal surface.

## Original P5: config and security boundary

Status: PASS with one intentional path change.

The original sketch used `~/.daniel-commander/config.json`. The implementation uses `~/.config/daniel-commander/config.json` and supports `DANIEL_COMMANDER_CONFIG_DIR`, which is a deliberate portability/Unix-convention improvement.

Fresh configuration is fail-closed with an empty filesystem allowlist. Runtime/user configuration, SSH configuration, tunnel credentials, and secrets stay outside the repository. Telemetry is physically absent rather than controlled by a `telemetry: false` toggle.

Filesystem allowlists and command blocklists are documented as guardrails, not an OS sandbox.

## Original P6: minimal MCP server

Status: PASS after release-identity correction.

The production server is stdio-only and registers the 17 tools. It does not expose MCP resources, prompts, UI resources, onboarding, feedback, or tracking.

The release audit found and repaired one quality defect: the MCP server still advertised `0.1.0-dev` while the package/release candidate was `0.1.0-rc.1`. A regression contract now requires the MCP protocol version to equal the package version.

## Original P7: transport

Status: PASS for Plan A.

OpenAI Secure MCP Tunnel plus stdio is the qualified production transport. Plan B Streamable HTTP/Cloudflare was intentionally not implemented because Gate 0 passed.

The stdio server is structurally usable by other MCP clients, but live qualification currently covers the official MCP client and ChatGPT through Secure MCP Tunnel. Claude Desktop, Claude Code, Codex, Cursor, VS Code, and Gemini CLI are not individually claimed as live-qualified clients.

## Phase-number drift

Later sessions reused phase labels:

- actual P3 combined original P4 + original P6 and live Plan-A transport qualification;
- actual P4 completed much of original P5 plus real Git/SSH operator qualification;
- actual P5 implemented most of original P8 lifecycle;
- actual P6 and P7 became portability/public-release phases that were not part of the original P0-P9 numbering.

This renumbering did not remove the original P0-P7 requirements, but it obscured authority. Future work must use the original task-content definitions when deciding whether v0.1 is complete.

## Original P8: lifecycle status before resuming work

Status: PARTIAL, not closed.

Already implemented and qualified:

- launchd login auto-start;
- tunnel-client + MCP child supervision;
- restart/start/stop/status/update/uninstall;
- crash recovery;
- log management;
- loopback health/readiness;
- signal-based graceful shutdown;
- stable Runtime.app identity/TCC preservation.

Not yet implemented from the original frozen plan:

- active-only `caffeinate` / no-sleep behavior.

Therefore original P8 must not be declared complete until no-sleep behavior is implemented and qualified.

## Original P9: full qualification status

Status: PARTIAL, not closed.

Many matrix rows are already covered by P2-P7 automated/live qualification, but the original P9 authority must still be reconciled row-by-row before declaring `DANIEL_COMMANDER_V0_1_PASS`.

Known rows requiring explicit final adjudication include at least:

- line-ending preservation;
- complete regex/literal/search-pagination/cancellation matrix;
- terminal stderr and completed-session readability;
- multiple simultaneous sessions;
- explicit remote reconnect evidence under the final production build;
- active-only sleep prevention after original P8 is repaired;
- clean lifecycle shutdown in the final build.

A public release candidate does not imply final v0.1 qualification.

## Frozen next-step rule

Public RC visibility may proceed only after current release-preflight/CI/privacy gates are green.

After the Public Visibility Gate, resume the original authority at:

1. finish original P8 no-sleep lifecycle requirement;
2. execute original P9 row-by-row qualification;
3. only then consider `DANIEL_COMMANDER_V0_1_PASS`;
4. retire legacy Oracle MCP infrastructure only after the full replacement remains live-qualified and rollback evidence is no longer needed.
