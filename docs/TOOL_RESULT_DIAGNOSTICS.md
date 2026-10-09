# Shell result states and policy denials

LocalBridge MCP exposes persistent terminal sessions. Treat a completed tool call, a completed child process, and a permitted tool operation as **different facts**.

## 1. Initial shell wait (not a policy denial)

For backwards compatibility, `lb_run_shell` can return `isBlocked: true` when its **initial waiting window** expires or a REPL prompt is detected. It does **not** mean the command is forbidden.

The v0.2.2 response includes optional:
- `status: "initial_wait_elapsed"`: initial wait ended; process may still be running.
- `status: "waiting_for_input"`: probable interactive prompt (heuristic, not authority).
- `status: "process_exit"` and `isComplete: true`: child process has exited; inspect `exitCode`.
- `status: "spawn_error"` or `"process_error"`: inspect error and recorded process state.

For an authorized command that returned a PID, use `lb_shell_output` **on that exact PID**, when permitted, to observe `isComplete` and `exitCode`. Do not resend uncertain commands, inject stdin without approval, or mistake another session's PID for your own.

Older versions expose only legacy `isBlocked`; do not infer enforcement policy from that boolean.

## 2. Server-side command-policy denial

Configured `blockedCommands` are enforced by LocalBridge before spawning a command. A denied command produces an MCP tool error, not a successful child-process result. Treat the denial as final. Do not use alternate spellings, wrappers, interpreters, other tools, or hosts to evade policy. Changes to policy require independent security review.

## 3. Client/platform enforcement

A ChatGPT/OpenAI-side tool-safety refusal may occur before LocalBridge receives a request. This is neither a successful local tool execution nor evidence of a LocalBridge `blockedCommands` violation. Its reason cannot be inferred from the local health endpoint or a local terminal wait flag.

Stop the refused operation; preserve the nonsecret redacted event summary, timestamp and external trace if available; seek a genuine authorized platform disposition. Owner permission over the local MCP server does not override the client platform's enforcement.

## 4. Engineering failures

A failing test, missing runtime dependency, nonzero child exit code, or CI failure is a separate engineering problem. Treat it as failed or not-run evidence and repair only within approved scope. Do not mislabel these failures as tool policy denials.

## Release invariants

- Keep actual shell tools marked with truthful security annotations, including `destructiveHint` and `openWorldHint`.
- Do not relax configured blocklists, filesystem allowlists, credentials, or authentication to reduce refusals.
- Successful tunnel health does not certify client policy acceptance.
- Runtime restarts must have independent recovery and rollback because the active MCP session can be severed.
- Source-only releases do not install a local runtime, refresh a ChatGPT plugin, or upgrade a tunnel client.
