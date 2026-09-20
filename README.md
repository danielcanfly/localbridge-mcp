# Daniel Commander

Self-hosted MCP computer-control server for local files, search, surgical editing, persistent terminal sessions, and SSH workflows.

> Status: pre-alpha. P0 through P3 are qualified. The 17-tool MCP surface works locally and from ChatGPT Plus through OpenAI Secure MCP Tunnel.

## Design goals

- Run the execution engine on the user's own Mac, Linux machine, or VM.
- No shared hosted relay is provided by this project.
- No vendor telemetry, analytics, or usage quota in the Daniel Commander core.
- Support local MCP clients and a private remote path for ChatGPT.
- Keep terminal sessions interactive across MCP tool calls.
- Keep the runtime small by excluding PDF, DOCX, Excel, image-preview, UI, onboarding, and hosted-remote product code.

## Current MCP surface

Daniel Commander exposes 17 focused tools covering:

- text filesystem read/write/list/create/move/info
- exact and fuzzy block editing
- asynchronous ripgrep filename/content search
- persistent terminal process start/output/stdin/session/termination

The selected upstream-derived core is pinned to Desktop Commander MCP v0.2.51 commit `092ce0b841e86455f12e41f4dc36399a7522ecb5`. See `THIRD_PARTY_NOTICES.md`, `docs/P2_SOURCE_CENSUS.md`, and `docs/P3_STATUS.md`.

## Remote path

The qualified ChatGPT path is:

    ChatGPT
      -> personal development plugin
      -> OpenAI Secure MCP Tunnel
      -> tunnel-client on the user's machine
      -> Daniel Commander stdio MCP

No Desktop Commander Cloud relay is required by Daniel Commander.

## Security

This project is intended to provide powerful local computer access to an authorized AI client. Filesystem allowlists and command blocklists are guardrails, not a security sandbox.

Do not expose an unauthenticated shell-capable MCP endpoint to the public Internet.
