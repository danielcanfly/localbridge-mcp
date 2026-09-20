# P5 production macOS runtime status

Status: PASS on 2026-09-20.

## Production path

P5 turns LocalBridge MCP into a persistent single-owner macOS runtime:

    launchd
      -> LocalBridge MCP Runtime.app
      -> tunnel-client
      -> Homebrew Node
      -> deployed LocalBridge MCP bundle

No LocalBridge MCP daemon is installed on the remote SSH host.

## macOS TCC design

A plain LaunchAgent was tested first and macOS denied access to protected Documents paths with Operation not permitted. P5 therefore uses a small headless app identity at:

    $HOME/Applications/LocalBridge MCP Runtime.app

The app declares Documents/Desktop usage and preflights configured allowed directories. A dedicated probe proved the authorized app can read an allowed Documents path both normally and when launched by launchd.

Normal updates do not rebuild Runtime.app. They replace only the deployed JS bundle, preserving the app identity and privacy authorization.

## Production bundle

The development checkout is not executed directly by launchd. P5 deploys a pruned bundle to:

    $HOME/.local/share/localbridge-mcp/runtime

The bundle contains compiled dist, package metadata, production Node dependencies, and a source-commit marker. Pruning reduced node_modules from roughly 64 MB to roughly 20 MB on the qualification Mac.

The background runtime uses Homebrew Node rather than an interactive-shell NVM version.

## launchd and health

The LaunchAgent uses RunAtLoad, KeepAlive on unsuccessful exit, a 10-second throttle, the Runtime.app executable, and a working directory outside protected Documents/Desktop folders.

A full unload/bootstrap test passed: launchd unloaded, the tunnel stopped, then bootstrap restored TCC/health/readiness in about 2 seconds.

Production health is loopback-only. The status command reports launchd state, Runtime.app PID, TCC preflight, tunnel PID, health, readiness, and deployed source commit.

## Crash recovery

### Tunnel child crash

The tunnel process was killed with SIGKILL. Runtime.app stayed alive, started a replacement child, and readiness recovered automatically. One final-build run recovered in about 7 seconds.

### Runtime.app crash

The first implementation exposed a real bug: killing Runtime.app could leave tunnel-client orphaned under PID 1 while launchd started a new supervisor, causing duplicate tunnels and a health-port collision.

The repaired Runtime.app startup verifies any stale tunnel PID belongs to tunnel-client with the configured LocalBridge MCP profile and exact PID file before terminating it. Mismatched PIDs are refused. Verified stale state is cleaned before exactly one replacement tunnel starts.

The repaired qualification passed with the old orphan gone, exactly one tunnel, TCC preflight ok, health ok, and readiness ok. One measured full app recovery completed in about 2 seconds.

## Update flow

The service controller supports:

    ./scripts/macos-service.sh install
    ./scripts/macos-service.sh update
    ./scripts/macos-service.sh status
    ./scripts/macos-service.sh restart
    ./scripts/macos-service.sh stop
    ./scripts/macos-service.sh start
    ./scripts/macos-service.sh uninstall

Update builds and atomically replaces the pruned runtime bundle without rebuilding Runtime.app. Profile validation uses an ephemeral health-port override so tunnel-client doctor does not mistake the already-running production listener for a conflict.

Qualification confirmed the app code requirement remained unchanged across update, TCC stayed authorized, the bundle stayed about 20 MB, exactly one tunnel remained, and health/readiness returned green.

## MCP and ChatGPT qualification

The exact deployed production bundle was tested with the official MCP client and Homebrew Node:

    start_process -> P5_BUNDLE_ECHO_OK
    read_file     -> # LocalBridge MCP

A fresh ChatGPT Work call then traversed the production auto-start tunnel. Debug tracing proved the full protocol path:

1. command polled from the OpenAI control plane;
2. command forwarded to LocalBridge MCP;
3. MCP response received with has_error=false;
4. response posted back to the control plane;
5. final response accepted with HTTP 200.

During browser automation, Work sometimes rendered only the opening brace even after the complete response had been accepted by the control plane. The deployed MCP bundle, tunnel response path, and HTTP 200 delivery were independently proven, so this is recorded as a presentation/streaming anomaly rather than a LocalBridge MCP runtime failure.

P5 does not bypass platform safety checks. A fresh browser-automated SSH prompt was blocked before submission, so the P4 read-only SSH qualification remains the authority for the unchanged remote-host terminal capability.

## Logs and privacy

Runtime state lives under:

    $HOME/.local/state/localbridge-mcp

Runtime logs live under:

    $HOME/Library/Logs/LocalBridgeMCP

Runtime-managed state/log files are private, and tunnel/config secrets remain outside the repository. No tunnel IDs, app IDs, API keys, SSH keys, account identifiers, or machine-specific usernames belong in source control.

## P5 automated markers

    P5_PRIVATE_RUNTIME_FILES_PASS
    P5_RUNTIME_APP_SUPERVISOR_PASS
    P5_TCC_PREFLIGHT_CONTRACT_PASS
    P5_ORPHAN_CLEANUP_CONTRACT_PASS
    P5_LOG_ROTATION_CONTRACT_PASS
    P5_LIVE_DOCTOR_OVERRIDE_PASS
    P5_DEPLOY_BUNDLE_CONTRACT_PASS
    P5_LAUNCHD_APP_CONTRACT_PASS
    P5_HEALTH_STATUS_CONTRACT_PASS
    P5_REPO_PRIVACY_CONTRACT_PASS
    P5_TEST_WIRING_PASS

## Phase boundary

P5 qualifies a self-hosted, single-owner macOS production runtime. It does not provide multi-user hosting, an OS sandbox around arbitrary shell commands, notarized public app distribution, or automatic source updates from GitHub.
