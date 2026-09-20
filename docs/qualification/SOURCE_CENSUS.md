# P2 selective core import

Pinned upstream authority:

- Repository: `wonderwhy-er/DesktopCommanderMCP`
- Commit: `092ce0b841e86455f12e41f4dc36399a7522ecb5`
- Release: `v0.2.51`
- License: MIT

## Dependency census

A direct import of the initially interesting Desktop Commander runtime files expanded to 66 source files because the upstream runtime couples filesystem/edit/search/server code to UI previews, PDF/DOCX/Excel support, telemetry, onboarding, usage tracking, and remote-product code.

LocalBridge MCP intentionally did not import that dependency closure.

## Imported or closely derived

- `src/core/terminal-manager.ts`
- `src/core/command-manager.ts`
- `src/core/process-detection.ts`
- `src/core/fuzzy-search-core.ts`
- `src/core/ripgrep-resolver.ts`
- `src/core/search-manager.ts` is a headless derivative of the upstream search session design

The copied files retain explicit pinned-upstream provenance headers.

## Rewritten headless adapters

- `src/config.ts`
- `src/config-manager.ts`
- `src/types.ts`
- `src/core/filesystem.ts`
- `src/core/fuzzy-search.ts`
- `src/core/edit.ts`
- `src/core/runtime.ts`
- `src/core/index.ts`

These adapters deliberately expose only the v0.1 execution core.

## Explicitly excluded from P2

- upstream `server.ts` and `index.ts`
- Desktop Commander remote-device stack
- Supabase
- telemetry and analytics
- usage tracking
- feedback
- onboarding
- UI resources and file previews
- PDF creation/editing/parsing
- DOCX-specific handling
- Excel-specific handling
- image preview/Sharp
- prompts library
- MCPB/Claude/Cursor/Gemini packaging

## P2 contract

P2 proves the imported headless core independently of MCP transport. MCP tool registration and Secure Tunnel wiring belong to the next phase.

Required P2 behavior:

- allowed-directory constrained text file read/write/list/create/move/info
- exact edit
- fuzzy edit
- ripgrep filename search
- ripgrep content search
- command blocklist
- persistent terminal process
- stdin interaction
- paginated process output
- session listing
- process termination
- no telemetry/UI/document dependencies in the source dependency tree
