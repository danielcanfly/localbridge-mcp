# P3 MCP tool surface status

Status: PASS on 2026-09-20.

## Result

P3 registered the P2 headless execution core as a minimal stdio MCP server and qualified it both locally and through ChatGPT Plus over OpenAI Secure MCP Tunnel.

The MCP layer is intentionally thin. Tool handlers call the qualified P2 core and do not duplicate filesystem, search, editing, command-policy, or terminal-session logic.

## Tool surface

Exactly 17 public tools are registered:

1. read_file
2. read_multiple_files
3. list_directory
4. get_file_info
5. write_file
6. create_directory
7. move_file
8. edit_block
9. start_search
10. get_more_search_results
11. stop_search
12. list_searches
13. start_process
14. read_process_output
15. interact_with_process
16. list_sessions
17. force_terminate

ChatGPT discovery exposed all 17 actions.

Tool annotations distinguish read-only operations from writes, destructive operations, and open-world terminal actions.

## Local MCP qualification

The P3 integration test uses the official MCP client and stdio transport to spawn the compiled LocalBridge MCP server.

Passing markers:

    P3_TOOL_DISCOVERY_PASS
    P3_FILESYSTEM_TOOLS_PASS
    P3_EDIT_TOOL_PASS
    P3_SEARCH_TOOLS_PASS
    P3_TERMINAL_TOOLS_PASS
    P3_POLICY_BOUNDARY_PASS
    P3_MCP_STDIO_PASS

The full test command also reruns the P2 core suite before P3.

## ChatGPT Secure Tunnel live qualification

A private development app named LocalBridge MCP Dev was connected to the already-qualified personal Secure MCP Tunnel.

Live tests were deliberately restricted to:

    /tmp/localbridge-mcp-p3-live

Read:

    P3_LIVE_READ_OK

Write:

    P3_LIVE_WRITE_OK

The written file was independently verified on the Mac with mode 0600 and exact content equality.

Terminal:

    command: echo P3_LIVE_TERM_OK
    timeout_ms: 3000

The live result contained:

    output: P3_LIVE_TERM_OK
    isBlocked: false
    exitReason: process_exit

This proves the production-shaped MCP server can execute a real terminal command when invoked from ChatGPT through Secure MCP Tunnel.

## Runtime defects found and repaired during P3

### Invalid inherited working directory

The parent control environment had inherited a deleted working directory. That state propagated into tunnel-client and then into the MCP process.

LocalBridge MCP now repairs an invalid startup working directory by switching to the user home directory. Terminal spawns also explicitly use a valid working directory.

### Short-command wait window

A macOS zsh login shell on the qualification machine required slightly more than one second before first command output. A 1000 ms wait could therefore return a timeout result immediately before the command completed.

The default command wait window is now 3000 ms.

This is a wait-for-initial-result policy, not a maximum lifetime for persistent sessions.

### Process completion boundary

Terminal completion now uses the child-process close event rather than exit so stdout and stderr can drain before the synchronous result is finalized.

## Dependencies added in P3

Runtime:

- @modelcontextprotocol/server
- zod

Development/testing:

- @modelcontextprotocol/client

No Desktop Commander cloud, Supabase, UI, PDF, Office-document, analytics, telemetry, or remote-device dependency was added.

## Phase boundary

P3 proves the formal 17-tool MCP surface and the ChatGPT Secure Tunnel path.

P3 does not yet:

- broaden allowed directories to the owner's real repositories
- configure the Oracle SSH workflow
- create a permanent launchd service
- create a long-lived production runtime key
- publish the GitHub repository
- retire the historical P1 Gate app or the old Oracle MCP

Those belong to later phases.
