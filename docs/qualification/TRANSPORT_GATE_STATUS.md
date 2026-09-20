# P1 Secure Tunnel Gate

Status: PASS on 2026-09-20.

This gate qualified the preferred v0.1 transport before importing any Desktop Commander source.

## What was proven

- A personal ChatGPT Plus account in the tested rollout can enable Developer Mode.
- A personal development plugin can connect to a local stdio MCP through OpenAI Secure MCP Tunnel.
- ChatGPT can discover both read and write MCP tools through that tunnel.
- ChatGPT executed dc_test_read on the Mac and returned the exact file content.
- ChatGPT executed dc_test_write on the Mac and created the expected isolated test file.
- The write tool remained annotated as destructive.
- The MCP server itself did not need a public HTTP listener or a public Cloudflare endpoint.

## Isolation

The qualification server is intentionally limited to:

    /tmp/daniel-commander-gate

It exposes only:

    dc_test_read
    dc_test_write

No production repository, SSH target, Oracle service, or existing MCP server was modified by this gate.

## Evidence

Read:

    DANIEL_COMMANDER_GATE_READ_OK

Write request content:

    CHATGPT_PLUS_WRITE_OK

The resulting file was verified locally as mode 0600, exactly 21 bytes, with exact content equality.

The gate server also logged handler entry and completion for both calls, proving that ChatGPT traffic traversed the Secure MCP Tunnel and reached the local Mac process.

## Architecture decision

Plan A is qualified:

    ChatGPT Work
        -> personal development plugin
        -> OpenAI Secure MCP Tunnel
        -> tunnel-client on the user's machine
        -> stdio MCP
        -> Daniel Commander

Cloudflare + public Streamable HTTP remains a fallback, not the primary v0.1 transport.

## Scope note

This is an account-specific qualification of the tested ChatGPT Plus rollout on 2026-09-20. It should not be generalized into a guarantee that every Plus account or future rollout has identical entitlements.

## Next phase

P2 may begin selective import of the pinned Desktop Commander local execution core. The deprecated job-skills-gateway and the old Oracle-hosted MCP remain untouched until the replacement is fully qualified.

## Qualification scaffold retirement

The temporary `gate/` MCP implementation was intentionally removed from the release-candidate source tree after the production 17-tool server, Secure Tunnel path, and later reconnect/crash-recovery paths were qualified. This document preserves the P1 evidence without shipping the one-off Gate server as product source.
