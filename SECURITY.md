# Security

Daniel Commander gives an MCP client access to real filesystem and terminal capabilities. Treat installation as granting a powerful local operator access to the operating-system account that runs it.

## Security boundaries

The filesystem allowlist limits Daniel Commander's filesystem tools. It does not sandbox arbitrary terminal commands.

The command blocklist is a guardrail. It is not a complete shell security policy. Commands can be nested inside shells, interpreters, scripts, SSH commands, build tools, and other executables.

For a stronger boundary, run Daniel Commander as a dedicated OS user, in a container, or in a VM with only the files and network access you intend to expose.

## Remote access

Daniel Commander does not provide a hosted relay or shared credentials.

If you connect it to a remote MCP transport:

- use your own authenticated tunnel or connector;
- keep health/admin listeners on loopback unless you explicitly know why they must be remote;
- never expose an unauthenticated shell-capable MCP endpoint to the public Internet;
- keep API keys and tunnel credentials outside the repository;
- prefer file-backed secret references with mode 600 or 400 for background services.

## macOS privacy

The macOS production runtime uses a small Runtime.app identity so the user can explicitly authorize protected Documents/Desktop access through macOS TCC.

Normal runtime updates do not rebuild this app identity. Rebuilding or replacing the app may require the user to approve protected-folder access again.

## Secrets that must never be committed

Do not commit:

- API keys or bearer tokens
- tunnel IDs tied to a private deployment
- control-plane credentials
- SSH private keys
- personal machine paths or usernames in distributable templates
- OAuth client secrets
- production environment files

The release tests include heuristic privacy scans, but they are not a substitute for reviewing staged changes.

## Reporting a vulnerability

For a private deployment, disable the affected remote connector first if you believe access is exposed.

For source-code security issues, use GitHub's private vulnerability reporting feature when it is enabled for the repository. Avoid filing public issues that contain credentials, private hostnames, or exploit details for an active deployment.
