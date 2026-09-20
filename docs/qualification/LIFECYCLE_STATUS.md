# Lifecycle qualification lifecycle qualification

Status: **PASS**

Authority: original frozen Daniel Commander v0.1 P8 lifecycle requirement, after the Public Visibility Gate.

## Active-only sleep prevention

The macOS production runtime now deploys `scripts/macos-tunnel-wrapper.sh` as a thin wrapper around the real `tunnel-client`. While the production tunnel child is alive, the wrapper starts:

```text
/usr/bin/caffeinate -i -w <tunnel-pid>
```

This holds `PreventUserIdleSystemSleep` only for the lifetime of the active production tunnel. It does not request display wake or lid-close override behavior.

The wrapper persists its own caffeinate PID under the private runtime state directory and removes it during clean shutdown. `macos-runtime-status.sh` reports the validated production relationship as `CAFFEINATE_COUNT` and `CAFFEINATE_PID`.

## Update-path repair

Qualification found a real lifecycle defect: `macos-service.sh update` rewrote the LaunchAgent plist but previously used only `launchctl kickstart -k`. launchd therefore retained the old in-memory environment and did not see the newly configured wrapper.

The repaired update path reloads the job from the written plist using `bootout` plus retrying `bootstrap`, then enables and kickstarts the job. The retry is required because macOS launchd can briefly return `Input/output error` immediately after a bootout while teardown finishes.

## Identity and TCC preservation

The repair does not rebuild the locally installed Runtime.app. During live qualification its executable remained:

```text
SHA-256 2137a19af08f4d121531ccc7dfb78ee52d6ea5d4ae133947c79e39fd80bac7c7
Bundle ID com.danielcanfly.daniel-commander.runtime
CDHash 1a8ce803e9fe4bd549223af0bca792fc56421e55
```

TCC preflight remained `ok` after the production update and every recovery exercise.

## Live qualification

Final candidate: `47495e95ca761b17096c42685909c361409eb233`.

- Product update path reloaded the new LaunchAgent environment and returned health/readiness green with exactly one production caffeinate assertion.
- `pmset -g assertions` showed `PreventUserIdleSystemSleep` owned by the Daniel Commander caffeinate process on behalf of the active tunnel PID.
- Killing the production tunnel with `SIGKILL` recovered to a new tunnel and new caffeinate process in 7 seconds; the old caffeinate process did not survive.
- Killing Runtime.app with `SIGKILL` recovered to a new app, tunnel, and caffeinate process in about 1 second; stale tunnel/caffeinate processes were absent and exactly one wrapper remained.
- `macos-service.sh stop` removed the tunnel and Daniel Commander caffeinate process and reported `CAFFEINATE_COUNT=0`.
- `macos-service.sh start` restored health/readiness and exactly one active caffeinate process in about 1 second.
- Isolated Darwin regression tests verify the wrapper creates exactly one caffeinate process for a real child PID and cleans it plus its state file on shutdown.

## Boundary

Lifecycle qualification is closed. Final qualification remains separate and must be qualified row-by-row before `DANIEL_COMMANDER_V0_1_PASS` can be declared.
