# Daniel Commander

Self-hosted MCP computer-control server for local files, search, surgical editing, persistent terminal sessions, and SSH workflows.

> Status: pre-alpha. P0, P1, and the P2 headless-core qualification are complete. MCP tool registration remains a later phase.

## Design goals

- Run the execution engine on the user's own Mac, Linux machine, or VM.
- No shared hosted relay is provided by this project.
- No vendor telemetry, analytics, or usage quota in the Daniel Commander core.
- Support local MCP clients and a private remote path for ChatGPT.
- Keep terminal sessions interactive across MCP tool calls.
- Keep the runtime small by excluding PDF, DOCX, Excel, image-preview, UI, onboarding, and hosted-remote product code.

## Current headless core

P2 includes allowed-directory constrained text filesystem operations, ripgrep search sessions, exact and fuzzy editing, command blocklist parsing, persistent terminal sessions, stdin interaction, paginated output, session listing, and termination.

The selected upstream-derived logic is pinned to Desktop Commander MCP v0.2.51 commit `092ce0b841e86455f12e41f4dc36399a7522ecb5`. See `THIRD_PARTY_NOTICES.md` and `docs/P2_SOURCE_CENSUS.md`.

## Security

This project is intended to provide powerful local computer access to an authorized AI client. Filesystem allowlists and command blocklists are guardrails, not a security sandbox.

Do not expose an unauthenticated shell-capable MCP endpoint to the public Internet.
