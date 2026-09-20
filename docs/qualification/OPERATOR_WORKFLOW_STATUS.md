# P4 real-world operator qualification

Status: PASS on 2026-09-20.

## Scope

P4 moved Daniel Commander from isolated fixtures to a production-shaped owner workflow while keeping the remote machine unchanged.

Qualified path:

    ChatGPT
      -> private Daniel Commander development app
      -> OpenAI Secure MCP Tunnel
      -> Daniel Commander on the owner's Mac
      -> local repositories and processes
      -> pre-existing SSH configuration
      -> remote Linux host

No Daniel Commander service, Node runtime, MCP server, agent, or other package was installed on the remote host.

## Policy hardening

Fresh installs are now fail-closed:

    allowedDirectories: []

A user must explicitly configure filesystem roots before filesystem tools can read or write data.

The owner's live config is external to the repository and has a narrow filesystem allowlist. Secrets, SSH configuration, and credentials are not committed to this repository.

Persistent terminal input now passes through the command blocklist before it is written to a session. This closes the straightforward path where a blocked command could otherwise be sent through `interact_with_process` after opening a shell.

The runtime test suite also enforces that stdio MCP code contains no `console.log` or `console.info` calls. stdout is reserved for MCP JSON-RPC traffic.

## Important security boundary

Filesystem allowlists and blocked-command parsing are guardrails, not a sandbox.

A terminal process runs with the permissions of the operating-system user. Commands embedded inside other interpreters, SSH remote-command arguments, scripts, or equivalent wrappers must not be treated as a security boundary merely because a top-level command blocklist exists.

Use operating-system permissions, separate users, containers, or virtual machines when stronger isolation is required.

## Live ChatGPT qualification

### Filesystem boundary

ChatGPT successfully read a file from an explicitly allowed repository root.

A harmless fixture outside the allowlist was rejected with:

    Error: Path is outside allowed directories

### Git workflow

A disposable local Git repository was used to qualify:

- `git status`
- `git diff`
- `git add`
- `git commit`

The commit completed successfully and the fixture was independently verified clean afterward.

No production repository was modified for this qualification.

### Project tests

ChatGPT instructed Daniel Commander to run the project's complete `npm test` command.

The first live run exposed a deterministic-test weakness: a P2 terminal interaction test waited a fixed 200 ms before checking echoed stdin. Under the real tunnel/Work load that interval was occasionally too short.

The test was repaired to use bounded polling. The second ChatGPT-driven run passed the complete P2, P3, and P4 suite.

### Persistent SSH

ChatGPT opened one SSH process and retained its PID across multiple MCP calls.

Using that same process, ChatGPT:

1. sent additional commands with `interact_with_process`;
2. read later output with `read_process_output`;
3. observed a production Git HEAD;
4. observed an active web-server service;
5. observed a healthy application container;
6. sent `exit` and closed the SSH session cleanly.

This proves session persistence across separate MCP requests.

The current SSH implementation is pipe-based. The SSH client can warn that a pseudo-terminal was not allocated when Daniel Commander itself is running over stdio. Shell-command interaction is qualified; full terminal-emulator or PTY semantics are not claimed.

### Remote logs

ChatGPT also performed a separate read-only SSH command to tail recent application-container logs. The returned health requests were successful HTTP 200 responses.

## Runtime defect found during P4

The imported terminal core emitted a debug message with `console.log` when automatically adjusting an SSH command.

For a stdio MCP server, arbitrary stdout text corrupts the JSON-RPC stream. During live qualification this produced an MCP internal error even though the SSH child process had started.

The debug line was moved to stderr and a regression test now rejects stdout logging in runtime source.

## Automated acceptance

P4 adds:

    P4_FAIL_CLOSED_DEFAULT_PASS
    P4_EXPLICIT_ALLOWLIST_PASS
    P4_STDIN_POLICY_PASS
    P4_STDIO_STDOUT_CLEAN_PASS
    P4_POLICY_BASELINE_PASS

The full test command reruns P2, P3, and P4.

## Phase boundary

P4 proves the owner can use ChatGPT to operate real local repositories and an existing remote Linux host through Daniel Commander.

P4 does not yet provide:

- a permanent macOS launch agent for automatic startup;
- full PTY emulation;
- OS-level sandboxing;
- recursive security inspection of arbitrary nested shell/interpreter/SSH command strings;
- multi-user hosting;
- a public shared Daniel Commander service.

Those are outside the P4 acceptance contract.
