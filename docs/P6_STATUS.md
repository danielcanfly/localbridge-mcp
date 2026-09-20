# P6 public-ready and portability status

Status: PASS on 2026-09-20.

## Goal

P6 converts the single-owner P5 implementation into source that another user can clone, inspect, configure, and run without depending on the original developer's filesystem paths, credentials, tunnel identifiers, or Homebrew architecture.

Repository visibility remains private during qualification. P6 does not make the repository public automatically.

## Public architecture

The project now documents two layers.

### Portable stdio core

Qualified target platforms:

- macOS
- Linux through CI

The portable core requires Node.js 20 or newer and does not require OpenAI Secure MCP Tunnel.

### macOS production runtime

The persistent remote path remains macOS-specific:

    launchd
      -> Daniel Commander Runtime.app
      -> user-owned tunnel-client
      -> user-owned Secure MCP Tunnel
      -> deployed Daniel Commander stdio MCP

Linux production service management is not claimed until a native systemd lane is separately implemented and qualified.

## Installer hardening

P6 adds:

- portable `setup-core.sh`;
- macOS `setup-macos.sh`;
- profile-only `--no-service` mode;
- `doctor.sh`;
- dynamic Node/npm/tunnel-client/Swift discovery;
- Apple Silicon and Intel Homebrew search paths;
- explicit tool-path overrides;
- support for an external tunnel-client profile directory;
- file-backed credential references for launchd-safe remote setup.

The macOS service no longer hardcodes one developer's Homebrew path.

## Clean-room qualification

A clean-room source copy was created with:

- a fresh temporary HOME;
- no pre-existing Daniel Commander config;
- no node_modules;
- a new workspace.

From that state:

1. `setup-core.sh` ran `npm ci`;
2. the project built successfully;
3. the config directory was mode 0700;
4. config.json was mode 0600;
5. the allowlist contained only the clean-room workspace;
6. P3 MCP integration passed.

A second clean-room run proved setup idempotence:

- an unrelated custom config value was preserved;
- `allowedDirectories` was intentionally replaced by the new requested allowlist.

A fake tunnel-client stub then qualified macOS `--no-service` orchestration without contacting a real control plane or modifying launchd. The generated profile was mode 0600.

## Production regression

The generalized macOS service was applied to the existing P5 production runtime.

Tool discovery selected stable installed binaries, the production bundle updated successfully, readiness returned in about one second, Runtime.app identity stayed unchanged, TCC stayed authorized, and exactly one production tunnel remained.

## Privacy and provenance

The entire reachable main-branch Git history was scanned for:

- the original developer machine username/path;
- device identifiers;
- private app/tunnel identifier patterns;
- common API/token patterns;
- committed env/key/credential files.

The history scan passed.

All existing commits use a GitHub noreply author address.

GitHub repository metadata reports `fork=false`. Desktop Commander attribution is preserved through THIRD_PARTY_NOTICES.md and source provenance rather than GitHub fork metadata.

## Public CI

P6 adds a GitHub Actions matrix for:

- macOS
- Ubuntu Linux
- Node.js 20
- Node.js 24

The workflow uses current major releases of the official GitHub checkout and setup-node actions and requires no private deployment credentials.

## Automated P6 markers

    P6_DYNAMIC_TOOL_DISCOVERY_PASS
    P6_PORTABLE_CORE_SETUP_PASS
    P6_MACOS_REMOTE_SETUP_PASS
    P6_PUBLIC_DOCS_PASS
    P6_CI_MATRIX_PASS
    P6_SOURCE_DISTRIBUTION_CONTRACT_PASS
    P6_NO_MACHINE_IDENTITY_PASS

## Hosted-runner terminal repair

The first pushed CI matrix exposed a real portability bug in persistent terminal handling rather than an infrastructure failure.

P6 repaired three issues:

- background bash/zsh/fish commands no longer force login-shell startup files;
- appending new bytes to an already-consumed trailing output line rewinds the line cursor so fresh output cannot be lost;
- POSIX terminal sessions run in their own process group so termination cleans descendant processes instead of leaving shell children orphaned.

A repeated local P2 stress run passed 20/20 with no orphan processes.

## Final closure

The complete local P2-P6 regression suite passes, npm audit reports zero known vulnerabilities, current-tree and reachable-history privacy scans pass, and the pushed GitHub Actions matrix passes all four jobs:

- Ubuntu / Node.js 20
- Ubuntu / Node.js 24
- macOS / Node.js 20
- macOS / Node.js 24

The CI commit history was rebuilt before closure so all reachable main-branch commits use the GitHub noreply author identity. Obsolete Actions runs associated with the replaced history were deleted.

Repository visibility remains private. Making the repository public is an explicit owner action outside P6 closure.
