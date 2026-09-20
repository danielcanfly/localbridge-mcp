# P2 headless core status

Status: PASS on 2026-09-20.

## Result

P2 selectively imported the local execution core from the pinned Desktop Commander MCP baseline without importing the upstream product dependency graph.

Pinned upstream:

- `wonderwhy-er/DesktopCommanderMCP`
- `v0.2.51`
- `092ce0b841e86455f12e41f4dc36399a7522ecb5`

The initial dependency census showed that importing the obvious upstream runtime files directly would expand to 66 source files. The expansion came from PDF, Office-document, UI-preview, telemetry, onboarding, usage-tracking, and product-server dependencies.

Daniel Commander instead retained the mature terminal/session, command parsing, process-state, fuzzy-search, ripgrep-resolution, and search-session behavior behind a rewritten headless adapter layer.

## Acceptance

The P2 integration suite passes:

- filesystem read/write/list/create/move/info
- multi-level directory creation
- allowed-directory enforcement
- symlink escape rejection
- exact edit
- fuzzy edit
- filename search
- content search
- command blocklist
- command-substitution blocklist coverage
- persistent terminal session
- stdin interaction
- paginated terminal output
- session listing
- process termination

Terminal:

`P2_HEADLESS_CORE_PASS`

## Dependency boundary

The P2 source tree has no imports of:

- telemetry/capture
- usage tracking
- Supabase
- remote-device
- UI resources
- PDF tooling
- Excel tooling
- DOCX tooling
- Sharp/image preview
- md-to-pdf
- PizZip

Runtime dependencies are intentionally small:

- `@vscode/ripgrep`
- `fastest-levenshtein`

## Phase boundary

P2 does not register MCP tools and does not connect the production Daniel Commander core to the Secure MCP Tunnel.

The next phase can build the minimal MCP registration layer over this qualified headless core.
