# LocalBridge MCP

[![CI](https://github.com/danielcanfly/localbridge-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/danielcanfly/localbridge-mcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/danielcanfly/localbridge-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/danielcanfly/localbridge-mcp/actions/workflows/codeql.yml)
[![Release](https://img.shields.io/github/v/release/danielcanfly/localbridge-mcp?label=release)](https://github.com/danielcanfly/localbridge-mcp/releases)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

LocalBridge MCP is a self-hosted MCP server that lets online AI assistants work with a local computer through a controlled, user-owned bridge.

It exposes local files, search, text editing, persistent shell sessions, Git, SSH, and other command-line workflows to online MCP clients that can reach a user-owned LocalBridge MCP runtime.

> LocalBridge MCP is intentionally powerful. It is designed for trusted, single-owner local automation. It is not a hosted service, not a sandbox, and not an unauthenticated public endpoint.

## Status

| Item | Status |
| --- | --- |
| Latest release | `v0.2.1` |
| Distribution | Source release only |
| npm package | Disabled intentionally (`private: true`) |
| Qualified online platform path | ChatGPT through OpenAI Secure MCP Tunnel |
| Other online platforms | Researched in `docs/ONLINE_PLATFORMS.md`; not yet qualified here |
| macOS local core | Qualified |
| Linux local core | Qualified in CI |
| macOS persistent runtime | Qualified with `launchd` and Runtime.app |
| Windows | Not yet qualified |
| Hosted relay | Not provided |

Release: [LocalBridge MCP v0.2.1](https://github.com/danielcanfly/localbridge-mcp/releases/tag/v0.2.1)

## Start here: ask the target online platform

Every guided install should start by asking the user:

```text
Which online platform are you connecting LocalBridge MCP to?

Choose one if possible:
- ChatGPT / OpenAI
- Claude.ai / Claude custom connector
- Grok
- Perplexity
- Gemini Apps or Gemini Enterprise
- Mistral Le Chat / Work / Studio
- GitHub Copilot cloud/app
- Other
```

Do not assume ChatGPT. Tunnel IDs, API keys, connector URLs, and remote MCP requirements are platform-specific.

The only currently qualified path in this repository is **ChatGPT / OpenAI Secure MCP Tunnel on macOS**. Other online platforms may support custom remote MCP servers, but LocalBridge MCP still needs a platform-compatible remote transport path before they are claimed as supported.

See [docs/ONLINE_PLATFORMS.md](docs/ONLINE_PLATFORMS.md) for the online platform compatibility matrix, setup links, and support wording.

## What LocalBridge MCP does

LocalBridge MCP gives an AI assistant a tool surface for practical local work:

- read, list, and inspect allowed local files;
- write, move, create, and patch text files;
- run fast text search with session-based pagination;
- start and manage persistent shell sessions;
- drive Git, SSH, test runners, package managers, Docker, and other CLI workflows through the shell;
- on macOS, run persistently behind OpenAI Secure MCP Tunnel through a local Runtime.app and `launchd`.

LocalBridge MCP does **not** provide a hosted relay. It also does not provide shared credentials, a shared tunnel, a cloud agent, a web dashboard, model hosting, or billing infrastructure.

Each user brings their own computer, credentials, tunnel or connector path, filesystem allowlist, and risk boundary.

## When to use it

Use LocalBridge MCP when you want an online AI assistant to help with local engineering and operations work, for example:

- inspect and edit a local repository;
- run test suites and read failures;
- search across project files;
- manage long-running shell sessions;
- operate SSH workflows from your machine;
- connect ChatGPT or another remote MCP-capable online platform to a private local environment without exposing an unauthenticated public shell server.

Do not use LocalBridge MCP as a security sandbox. Shell commands run with the permissions of the operating-system account that launches it.

## Before you install

LocalBridge MCP cannot be installed completely from this repository alone. The repository provides the server, scripts, and documentation. The user provides the local authority boundary.

### Required user inputs for the qualified ChatGPT path

| Required input | What it means | Who provides it | Safe handling |
| --- | --- | --- | --- |
| Target online platform | ChatGPT/OpenAI, Claude, Grok, Perplexity, Gemini, Mistral, GitHub Copilot cloud/app, or other | User | Ask before choosing commands |
| OpenAI Secure MCP Tunnel ID | The OpenAI tunnel identifier, usually starting with `tunnel_` | User | Required only for the OpenAI path; do not invent it |
| Tunnels-only API key | An OpenAI API key restricted to the `Tunnels` permission | User | Store in a local file; do not paste into chat, commits, logs, or issues |
| Filesystem allowlist | Local directories LocalBridge MCP may read/write through filesystem tools | User | Start narrow, for example one project folder; avoid `$HOME` unless intentional |
| macOS privacy approval | Permission for LocalBridge MCP Runtime.app to access protected folders such as Desktop or Documents | User through macOS prompts | Approve only folders you intend the assistant to use |
| `tunnel-client` installation | The OpenAI tunnel client binary available on the local machine | User or installer | Required only for the OpenAI tunnel path |

For other online platforms, see `docs/ONLINE_PLATFORMS.md` first. Most non-OpenAI platforms expect a remote HTTPS MCP server URL, not an OpenAI Secure MCP Tunnel ID.

### Installer behavior for AI assistants

If you are an AI assistant installing LocalBridge MCP:

1. Read this README, `docs/ONLINE_PLATFORMS.md`, and `docs/INSTALL_MACOS.md` before running commands.
2. Ask which online platform the user wants to connect before choosing an install path.
3. If the user chooses ChatGPT/OpenAI, follow the qualified OpenAI Secure MCP Tunnel path.
4. If the user chooses Claude, Grok, Perplexity, Gemini, Mistral, or GitHub Copilot cloud/app, explain that the platform may support custom remote MCP servers, but LocalBridge MCP still needs a compatible remote transport path for that platform. Do not run the OpenAI-specific setup unless the user is also configuring ChatGPT.
5. If the user chooses an unverified platform such as Poe, MiniMax chat/web, Kimi web, DeepSeek web, You.com chat, or another platform, ask for official custom MCP connector documentation before claiming support.
6. Check that Node.js and npm are installed. For the ChatGPT tunnel path, also check `tunnel-client`.
7. Ask the user for required platform-specific credentials if they are not already available.
8. Ask the user to create any secret API key locally, or to provide a local file path containing it. Do not ask them to paste secrets into chat.
9. Ask which directories should be allowlisted. Do not choose broad directories on behalf of the user.
10. Stop before installing the persistent macOS service if the required platform credential, connector/tunnel identifier, key file, allowlist, or required macOS permission is missing.
11. Never generate fake credentials, tunnel IDs, connector URLs, SSH keys, or API keys.
12. Never store credentials in the repository.
13. Never print API keys, SSH keys, or tunnel secrets.
14. If you do not have a local shell or filesystem tool for the user's Mac, do not merely stop after explaining that limitation. Switch to manual Terminal bootstrap mode and provide one complete copy-paste script that prompts interactively for tunnel ID, allowlist, and hidden API key input.
15. The manual bootstrap script must not require the user to edit placeholders. It should use `read` prompts, `read -s` or an equivalent hidden-input method for the API key, write the key to a local file with mode `600`, run the repository setup scripts, verify service health, and ask the user to paste terminal output back into the chat.

## Quick start: local stdio MCP server

The local stdio path is still available for development and testing, but this repository's public installation guide targets online platforms first.

Requirements:

- Node.js 20 or newer;
- npm;
- macOS or Linux for the currently qualified core path.

Clone and install:

```bash
git clone https://github.com/danielcanfly/localbridge-mcp.git
cd localbridge-mcp
npm ci
npm test
```

Choose the directories LocalBridge MCP may access:

```bash
./scripts/setup-core.sh --allow "$HOME/Projects"
```

The setup is fail-closed. If no `--allow` value is supplied, filesystem tools cannot access any directory.

Inspect the generated local configuration:

```bash
./scripts/doctor.sh
```

## macOS persistent ChatGPT runtime

The qualified macOS production path is:

```text
ChatGPT
  -> your MCP app
  -> your OpenAI Secure MCP Tunnel
  -> launchd
  -> LocalBridge MCP Runtime.app
  -> tunnel-client
  -> Node.js
  -> LocalBridge MCP
```

Additional requirements:

- macOS;
- Xcode Command Line Tools;
- `tunnel-client` installed;
- your own OpenAI Secure MCP Tunnel ID;
- your own API key restricted to the `Tunnels` permission;
- a local filesystem allowlist.

Create a private runtime key file. Do not paste secrets into issues, commits, release assets, or chat transcripts.

```bash
mkdir -p "$HOME/.config/localbridge-mcp"
chmod 700 "$HOME/.config/localbridge-mcp"

printf '%s' 'YOUR_TUNNELS_ONLY_API_KEY' > "$HOME/.config/localbridge-mcp/tunnel-runtime-key"
chmod 600 "$HOME/.config/localbridge-mcp/tunnel-runtime-key"
```

Install the macOS runtime:

```bash
./scripts/setup-macos.sh \
  --allow "$HOME/Projects" \
  --tunnel-id YOUR_TUNNEL_ID \
  --api-key-ref "file:$HOME/.config/localbridge-mcp/tunnel-runtime-key"
```

Verify:

```bash
./scripts/macos-service.sh status
/opt/homebrew/bin/tunnel-client doctor \
  --profile localbridge-prod \
  --profile-dir "$HOME/.config/tunnel-client" \
  --health.listen-addr 127.0.0.1:0
```

A healthy service reports:

```text
LAUNCHD=loaded
STATE=running
TCC_PREFLIGHT=ok
HEALTH=ok
READY=ok
```

See [docs/INSTALL_MACOS.md](docs/INSTALL_MACOS.md) for the full installation, update, profile-only validation, uninstall flow, and copy-paste bootstrap script for AI sessions that cannot operate the local terminal directly.

## AI-assisted install prompt

You can give this repository to ChatGPT or another online AI assistant and ask it to install LocalBridge MCP on your machine. Use a prompt like this:

```text
Install LocalBridge MCP from https://github.com/danielcanfly/localbridge-mcp on this computer.

Read README.md, docs/ONLINE_PLATFORMS.md, and docs/INSTALL_MACOS.md first. Do not invent credentials. Do not print secrets.

Start by asking me which online platform I want to connect:
- ChatGPT / OpenAI
- Claude.ai / Claude custom connector
- Grok
- Perplexity
- Gemini Apps or Gemini Enterprise
- Mistral Le Chat / Work / Studio
- GitHub Copilot cloud/app
- Other

The qualified path is ChatGPT through OpenAI Secure MCP Tunnel on macOS. Other online platforms may support custom remote MCP servers, but they need a platform-specific connector URL, tunnel, gateway, or adapter path. Do not run the OpenAI-specific setup unless I choose ChatGPT / OpenAI.

If I choose ChatGPT / OpenAI, target: macOS persistent ChatGPT runtime.

Before running installation commands, list what I need to prepare and stop if anything is missing.

For the ChatGPT / OpenAI path, I will provide or confirm separately:
- my OpenAI Secure MCP Tunnel ID;
- my own OpenAI API key with Tunnels permission only, stored locally and not pasted into chat;
- the local directories I want LocalBridge MCP to access;
- whether tunnel-client is already installed;
- macOS privacy approvals when LocalBridge MCP Runtime.app asks for access.

Use the repository scripts instead of hand-writing a service:
1. clone the repo;
2. run npm ci;
3. run npm test;
4. create ~/.config/localbridge-mcp/tunnel-runtime-key with chmod 600, but never display the key;
5. run scripts/setup-macos.sh with my allowlist, tunnel id, and file: key reference;
6. run tunnel-client doctor for the generated profile;
7. verify scripts/macos-service.sh status returns HEALTH=ok and READY=ok.

If you do not have a local shell/filesystem tool for this Mac, do not stop after only saying you cannot operate the machine. Instead, switch to manual Terminal bootstrap mode:
- give me one complete macOS Terminal script I can copy and paste;
- the script must ask for tunnel ID and allowlist interactively;
- the script must ask for the Tunnels-only API key with hidden input;
- the script must write the key to ~/.config/localbridge-mcp/tunnel-runtime-key with chmod 600;
- the script must not print the key;
- the script must clone or update LocalBridge MCP, run npm ci, run npm test, run setup-macos.sh, run tunnel-client doctor, and run macos-service.sh status;
- the script must not require me to edit placeholders before pasting;
- after the script runs, ask me to paste the terminal output back here for review.

Stop and ask me if any credential, connector/tunnel, tunnel-client installation, macOS permission, or allowlist is missing.
```

The assistant can perform local setup work when it has a local execution tool. Without one, it should provide the manual bootstrap script from `docs/INSTALL_MACOS.md` rather than asking the user to paste secrets into chat.

Every user must provide their own platform configuration, key, and filesystem boundaries.

## MCP tool surface

LocalBridge MCP exposes 17 tools using a product-owned `lb_*` namespace:

| Area | Tools |
| --- | --- |
| Filesystem read | `lb_read_text`, `lb_read_many_texts`, `lb_list_entries`, `lb_stat_path` |
| Filesystem write | `lb_write_text`, `lb_make_directory`, `lb_move_path`, `lb_patch_text_block` |
| Search | `lb_search_start`, `lb_search_read`, `lb_search_cancel`, `lb_search_sessions` |
| Shell | `lb_run_shell`, `lb_shell_output`, `lb_shell_input`, `lb_shell_sessions`, `lb_shell_kill` |

Git, SSH, package managers, test runners, and deployment workflows use the general shell surface instead of product-specific wrappers.

## Security model

LocalBridge MCP is a local control plane. Treat it like giving an assistant access to your terminal.

Filesystem allowlists and command blocklists are guardrails, not an operating-system sandbox. Shells, interpreters, scripts, SSH commands, and package managers can reach resources available to the OS user that runs LocalBridge MCP.

Recommended practices:

- use a dedicated OS account, VM, container, or disposable workspace for higher-risk work;
- keep credentials outside the repository;
- restrict OpenAI API keys to the minimum required permission, normally `Tunnels` only for the OpenAI path;
- avoid broad filesystem allowlists such as `$HOME` unless you intentionally want that scope;
- do not expose an unauthenticated shell-capable MCP endpoint to the public Internet;
- review [SECURITY.md](SECURITY.md) before enabling remote access.

## macOS service commands

```bash
./scripts/macos-service.sh status
./scripts/macos-service.sh update
./scripts/macos-service.sh restart
./scripts/macos-service.sh stop
./scripts/macos-service.sh start
./scripts/macos-service.sh uninstall
```

Normal updates replace the deployed JavaScript runtime without rebuilding Runtime.app, preserving macOS privacy authorization when possible.

The macOS runtime uses active-only sleep prevention while the production tunnel is alive:

```text
caffeinate -i -w <tunnel-pid>
```

The assertion is released when the service stops or the tunnel exits. It does not request display wake, prevent lid-close sleep, or manage non-macOS services.

## Configuration

Default configuration is fail-closed:

```json
{
  "allowedDirectories": []
}
```

See [config.example.json](config.example.json).

User-specific paths, tunnel IDs, connector URLs, API keys, SSH aliases, private keys, and runtime secrets belong in external configuration, never in this repository.

`fileWriteLineLimit` is an advisory chunking threshold for `lb_write_text`. It warns about large writes; it is not a security boundary or hard size cap.

## Repository layout

```text
src/                 MCP server and local execution core
scripts/             setup, doctor, release, and macOS service scripts
runtime-app/         macOS Runtime.app Swift entrypoint
test/                integration qualification suites
docs/                architecture, installation, portability, online-platform, and release docs
docs/qualification/ historical qualification evidence
```

## Development

```bash
npm ci
npm test
npm run release:preflight
```

The release preflight runs the test suite, checks dependency licenses, creates a clean source archive, installs it in a temporary home, tests it again, audits dependencies, and prints the source archive SHA-256.

## Documentation

- [Online platform compatibility](docs/ONLINE_PLATFORMS.md)
- [macOS installation](docs/INSTALL_MACOS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Portability](docs/PORTABILITY.md)
- [Release process](docs/RELEASE_PROCESS.md)
- [Security policy](SECURITY.md)
- [v0.2.1 release notes](docs/releases/v0.2.1.md)
- [v0.2.0 release notes](docs/releases/v0.2.0.md)
- [Qualification evidence](docs/qualification)

## Provenance and license

LocalBridge MCP is released under the [Apache License 2.0](LICENSE).

Selected execution-core code is derived from Desktop Commander MCP under the MIT license. Required third-party license and provenance notices are preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
