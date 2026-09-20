# Daniel Commander

Self-hosted MCP computer-control server for local files, search, surgical editing, persistent terminal sessions, and SSH workflows.

> Status: pre-alpha. P0/P1 qualification in progress.

## Design goals

- Run the execution engine on the user's own Mac, Linux machine, or VM.
- No shared hosted relay is provided by this project.
- No vendor telemetry, analytics, or usage quota.
- Support local MCP clients and a private remote path for ChatGPT.
- Keep terminal sessions interactive across MCP tool calls.

## Security

This project is intended to provide powerful local computer access to an authorized AI client. Filesystem allowlists and command blocklists are guardrails, not a security sandbox.

Do not expose an unauthenticated shell-capable MCP endpoint to the public Internet.
