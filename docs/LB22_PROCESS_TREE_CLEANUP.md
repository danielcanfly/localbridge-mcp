# LB22 | POSIX Process-Tree Cleanup in Disabled Offline Recipe Runner
Date: 2026-10-10
Status: source-only / unregistered / production OFF / release HOLD.

## Scope and threat
The LB21 offline fixture runner previously invoked a child with `detached=false` and terminated only its immediate PID on timeout or output flood. Its descendants could survive and continue using the fixture directory. Moreover, when the immediate child exited normally after starting a background descendant, the background process was not cleaned up.

LB22 creates a private POSIX process group for each fixed recipe via `spawn(..., { detached:true, shell:false })` and signals **only that spawned group** on timeout, output excess, and child close. The direct child is also signalled on abnormal termination. This group ID is never taken from a user request. The new regression uses synthetic Node processes that only append bytes to files under their own temporary fixture directory and cleans the exact test-created descendant PID in a `finally` safeguard.

## Real red/green tests
- Pre-LB22 process-tree timeout test: synthetic descendant continued writing after parent's timeout, exit 1. Original test PID 91902.
- POSIX group kill after timeout: PID 91972 exit 0, `LB22_TIMEOUT_DESCENDANT_OUTPUT_STOPPED_PASS`.
- Added output-limit group test: PID 92061 exit 0, `LB22_OUTPUT_FLOOD_DESCENDANT_OUTPUT_STOPPED_PASS`.
- Added normal-exit background descendant regression: before final close cleanup, PID 92118 exit 1, background child continued writing; after close cleanup, PID 92149 exit 0, all three markers PASS.
- Exact source commit and complete release gate receipts belong in the separate LB22 engineering report; do not count compiler-only or focused tests as full release acceptance.

## Limits
- This is still a **DISABLED, UNREGISTERED, OFFLINE** fixture runner, with no MCP tool registration, no switchable production exposure and no automatic fallback action.
- macOS/Linux POSIX process groups do not enforce a network or filesystem sandbox. A descendant can escape the inherited group using a new session/process group; the result is best-effort cleanup of inheriting descendants, **not** a child-process containment security boundary.
- On Windows, the POSIX group kill is unavailable; Windows process trees are NOT qualified by this source patch. Never claim S10 OS isolation or production sandbox qualification from LB22.
- Trusted owner recipe allowlist and the lack of authenticated MCP client/session identity remain separate unresolved blockers. No arbitrary command, SSH, provider, remote operation, or previously platform-refused instruction was invoked.
- Runtime v0.2.1, Tunnel, Plugin, M27 Production, old Git refs and public repository remain untouched.
