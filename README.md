# LocalBridge MCP

[![CI](https://github.com/danielcanfly/localbridge-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/danielcanfly/localbridge-mcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/danielcanfly/localbridge-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/danielcanfly/localbridge-mcp/actions/workflows/codeql.yml)
[![Release](https://img.shields.io/github/v/release/danielcanfly/localbridge-mcp?label=release)](https://github.com/danielcanfly/localbridge-mcp/releases)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

LocalBridge MCP is a self-hosted bridge between an online AI assistant and your own computer.

Most online assistants can reason, write code, and plan work, but they normally cannot touch the local files, terminals, repos, logs, and scripts that make real work happen. LocalBridge MCP gives a trusted assistant a controlled doorway into a machine you own, so it can inspect files, edit text, search a project, run tests, use Git, and operate a shell inside the boundaries you choose.

Think of it as a local workbench for an online AI assistant:

```text
online AI assistant
  -> your connector or tunnel
  -> LocalBridge MCP on your computer
  -> allowed files, search, edits, shell, Git, SSH, tests, scripts
```

It is not a cloud agent. It is not a hosted relay. It is not a sandbox. It is your computer, your credentials, your allowlist, and your risk boundary.

> LocalBridge MCP is intentionally powerful. Treat it like giving an assistant access to a terminal, not like installing a harmless browser bookmark.

### Why I built it

For the engineering story behind LocalBridge MCP, including the cost motivation, ChatGPT-to-macOS architecture, runtime reliability work, and how it fits alongside Codex and API usage, see [AI Engineering Field Notes Part 02: Codex Quota Wasn’t Enough, So I Gave ChatGPT a Way Into My Mac](https://danielcanfly.com/en/blog/ai-engineering-field-notes-part-2/).

## In one minute

Use LocalBridge MCP when you want an online AI assistant to help with local computer work, for example:

- look through a repo and explain what changed;
- edit files and run the test suite;
- search a project faster than copying snippets into chat;
- execute small shell commands and return exact output;
- drive Git, SSH, package managers, Docker, build scripts, or deployment commands;
- keep a persistent macOS runtime online through OpenAI Secure MCP Tunnel.

The currently qualified happy path is:

```text
ChatGPT
  -> developer-mode MCP app
  -> OpenAI Secure MCP Tunnel
  -> LocalBridge MCP Runtime.app on macOS
  -> local filesystem and shell tools
```

That path has been end-to-end tested for listing files, reading files, writing a smoke-test file, and running a shell command.

## Can I use it on Windows?

Not as a supported path yet.

Parts of the TypeScript core are written with portability in mind, but this repository does **not** currently claim Windows qualification. The Windows path still needs dedicated testing for path handling, line endings, shell behavior, process management, service startup, `tunnel-client`, permissions, and ChatGPT end-to-end tool calls.

Practical guidance:

- **macOS**: use this repo's qualified ChatGPT/OpenAI Secure MCP Tunnel path.
- **Linux**: the portable stdio core is tested in CI, but no production service manager is advertised here yet.
- **Windows**: treat as future work or an experiment, not a documented install target.
- **WSL**: may be useful for experimentation, but it should be treated as an unqualified Linux-like environment until someone runs a focused WSL/Windows qualification pass.

See [docs/PORTABILITY.md](docs/PORTABILITY.md) for the current portability contract.

## AI-assisted install prompt

You can give this repository to ChatGPT or another online AI assistant and ask it to install LocalBridge MCP on your machine. Use a prompt like this:

```text
Install LocalBridge MCP from https://github.com/danielcanfly/localbridge-mcp on this computer.

Read README.md, docs/ONLINE_PLATFORMS.md, docs/platforms/protocol-compatible-guides.md, docs/platforms/platform-flow-reference.md, and docs/INSTALL_MACOS.md first. Do not invent credentials. Do not print secrets.

Start by asking me which online platform I want to connect:
- ChatGPT / OpenAI
- Claude.ai / Claude custom connector
- Claude MCP tunnels
- Grok
- Perplexity
- Gemini Apps or Gemini Enterprise
- Mistral Le Chat / Work / Studio
- GitHub Copilot cloud/app
- Kimi web
- Other

The qualified path is ChatGPT through OpenAI Secure MCP Tunnel on macOS. Other online platforms may support custom remote MCP servers, but they need a platform-specific connector URL, tunnel, gateway, or adapter path. Do not run the OpenAI-specific setup unless I choose ChatGPT / OpenAI.

After I choose a platform, show me exactly where to create or find the platform-specific tunnel, key, connector URL, OAuth/client setting, or gateway requirement before asking me to provide or confirm anything. Give the official setup URLs in the answer.

If I choose ChatGPT / OpenAI, show these links before asking for Tunnel ID or Runtime API key readiness:
- OpenAI Tunnels management: https://platform.openai.com/settings/organization/tunnels
- OpenAI Runtime API keys: https://platform.openai.com/settings/organization/api-keys
- ChatGPT developer-mode plugin page: https://chatgpt.com/plugins
- OpenAI tunnel-client guide: https://github.com/openai/tunnel-client/blob/master/docs/end-user-guide.md
- OpenAI tunnel-client permissions: https://github.com/openai/tunnel-client/blob/master/docs/permissions.md

For the ChatGPT / OpenAI path, I will provide or confirm separately:
- my OpenAI Secure MCP Tunnel ID;
- my own OpenAI Runtime API key with Tunnels permission only, stored locally and not pasted into chat;
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

## Status

| Item | Status |
| --- | --- |
| Latest release | `v0.2.1` |
| Distribution | Source release only |
| npm package | Disabled intentionally (`private: true`) |
| Qualified online platform path | ChatGPT through OpenAI Secure MCP Tunnel |
| Other online platforms | Researched in `docs/ONLINE_PLATFORMS.md`; protocol-compatible guides exist, but not yet qualified here |
| macOS local core | Qualified |
| Linux local core | Qualified in CI |
| macOS persistent runtime | Qualified with `launchd` and Runtime.app |
| Windows | Not yet qualified; do not advertise as supported |
| Hosted relay | Not provided |

Release: [LocalBridge MCP v0.2.1](https://github.com/danielcanfly/localbridge-mcp/releases/tag/v0.2.1)

## What this repo is and is not

| This repo is | This repo is not |
| --- | --- |
| A self-hosted MCP server for local files, search, editing, and shell work | A hosted SaaS relay |
| A bridge from online assistants to a user-owned runtime | A shared public endpoint |
| A macOS-qualified ChatGPT/OpenAI Secure MCP Tunnel setup | A universal all-platform installer |
| A controlled local automation surface | A security sandbox |
| Source release only | An npm-published package |

LocalBridge MCP does **not** provide a hosted relay. It also does not provide shared credentials, a shared tunnel, a cloud agent, a web dashboard, model hosting, or billing infrastructure.

Each user brings their own computer, platform account, connector or tunnel, API key if required, filesystem allowlist, and security boundary.

## Start here: choose the online platform

Every guided install should start by asking:

```text
Which online platform are you connecting LocalBridge MCP to?

Choose one if possible:
- ChatGPT / OpenAI
- Claude.ai / Claude custom connector
- Claude MCP tunnels
- Grok
- Perplexity
- Gemini Apps or Gemini Enterprise
- Mistral Le Chat / Work / Studio
- GitHub Copilot cloud/app
- Kimi web
- Other
```

Do not assume ChatGPT. Tunnel IDs, API keys, connector URLs, OAuth settings, and remote MCP requirements are platform-specific.

The only currently qualified online path in this repository is **ChatGPT / OpenAI Secure MCP Tunnel on macOS**. Other online platforms may support custom remote MCP servers, but LocalBridge MCP still needs a platform-compatible remote transport path before they are claimed as supported.

See:

- [Online platform compatibility](docs/ONLINE_PLATFORMS.md)
- [Protocol-compatible platform guides](docs/platforms/protocol-compatible-guides.md)
- [Platform setup flow reference](docs/platforms/platform-flow-reference.md)
- [ChatGPT UI gates](docs/platforms/chatgpt-ui-gates.md)

## Before you install

LocalBridge MCP cannot be installed completely from this repository alone. The repository provides the server, scripts, and documentation. The user provides the local authority boundary.

### Required user inputs for the qualified ChatGPT path

| Required input | What it means | Who provides it | Safe handling |
| --- | --- | --- | --- |
| Target online platform | ChatGPT/OpenAI, Claude, Grok, Perplexity, Gemini, Mistral, GitHub Copilot cloud/app, Kimi web, or other | User | Ask before choosing commands |
| OpenAI Secure MCP Tunnel ID | The OpenAI tunnel identifier, usually starting with `tunnel_` | User | Required only for the OpenAI path; show the OpenAI Tunnels link before asking for it; do not invent it |
| Tunnels-only Runtime API key | An OpenAI API key restricted to the `Tunnels` permission | User | Required only for the OpenAI path; show the Runtime API key link before asking whether it is prepared; do not paste it into chat |
| Filesystem allowlist | Local directories LocalBridge MCP may read/write through filesystem tools | User | Start narrow, for example one project folder; avoid `$HOME` unless intentional |
| macOS privacy approval | Permission for LocalBridge MCP Runtime.app to access protected folders such as Desktop or Documents | User through macOS prompts | Approve only folders you intend the assistant to use |
| `tunnel-client` installation | The OpenAI tunnel client binary available on the local machine | User or installer | Required only for the OpenAI tunnel path |

For other online platforms, see `docs/ONLINE_PLATFORMS.md` first. Most non-OpenAI platforms expect a remote HTTPS MCP server URL, not an OpenAI Secure MCP Tunnel ID.

### Installer behavior for AI assistants

If you are an AI assistant installing LocalBridge MCP:

1. Read this README, `docs/ONLINE_PLATFORMS.md`, `docs/platforms/protocol-compatible-guides.md`, `docs/platforms/platform-flow-reference.md`, and `docs/INSTALL_MACOS.md` before running commands.
2. Ask which online platform the user wants to connect before choosing an install path.
3. After the user chooses a platform, show that platform's setup links and credential instructions before asking for missing values.
4. If the user chooses ChatGPT/OpenAI, show the OpenAI Tunnels, Runtime API key, ChatGPT plugin creation page, and tunnel-client docs links before asking for tunnel ID, runtime key readiness, or `tunnel-client` status.
5. If the user chooses Claude, Grok, Perplexity, Gemini, Mistral, GitHub Copilot cloud/app, or Kimi web, show the platform's setup links first, explain that the platform may support custom remote MCP servers, and stop if the user does not have a reachable LocalBridge remote MCP URL or gateway.
6. If the user chooses an unverified platform such as Poe, MiniMax chat/web, DeepSeek web, You.com chat, or another platform, ask for official custom MCP connector documentation before claiming support.
7. Check that Node.js and npm are installed. For the ChatGPT tunnel path, also check `tunnel-client`.
8. Ask the user to create any secret API key locally, or to provide a local file path containing it. Do not ask them to paste secrets into chat.
9. Ask which directories should be allowlisted. Do not choose broad directories on behalf of the user.
10. Stop before installing the persistent macOS service if the required platform credential, connector/tunnel identifier, key file, allowlist, or required macOS permission is missing.
11. Never generate fake credentials, tunnel IDs, connector URLs, SSH keys, or API keys.
12. Never store credentials in the repository.
13. Never print API keys, SSH keys, or tunnel secrets.
14. If you do not have a local shell or filesystem tool for the user's Mac, do not merely stop after explaining that limitation. Switch to manual Terminal bootstrap mode and provide one complete copy-paste script that prompts interactively for tunnel ID, allowlist, and hidden API key input.
15. The manual bootstrap script must not require the user to edit placeholders. It should use `read` prompts, `read -s` or an equivalent hidden-input method for the API key, write the key to a local file with mode `600`, run the repository setup scripts, verify service health, and ask the user to paste terminal output back into the chat.

## ChatGPT setup, in plain English

For the qualified ChatGPT/OpenAI path, the user supplies three things:

1. **A tunnel**: the private route between ChatGPT and the user's local machine.
2. **A restricted Runtime API key**: used by `tunnel-client` to keep that route alive. Do not paste it into chat.
3. **An allowlist**: the local directories LocalBridge is allowed to touch.

The local runtime then runs behind `launchd` and `LocalBridge MCP Runtime.app` on macOS.

After the local install is healthy, the ChatGPT-side app is created from:

```text
https://chatgpt.com/plugins
```

With Developer Mode enabled, a `+` button appears next to the plugin search box. Click it and fill the new plugin form:

```text
Name:
LocalBridge MCP

Description:
Self-hosted MCP bridge for local files, search, editing, shell sessions, Git, and SSH.

Connection:
Tunnel / 通道

Available tunnel:
Select localbridge-mcp (tunnel_...)

Authentication:
None / No authentication / 無

Advanced OAuth settings:
Leave unset for the current stdio-over-tunnel path.
```

Start with read-only smoke tests before write or shell tests.

## Required installer behavior: links before values

When an AI assistant is guiding setup, it must not only ask for a missing tunnel ID, API key, connector URL, or allowlist. It must first show the platform-specific setup links and explain where the user creates or finds each value.

For ChatGPT / OpenAI, show this block before asking whether the user already has a tunnel ID or runtime key:

```text
Create or find your OpenAI Secure MCP Tunnel:
https://platform.openai.com/settings/organization/tunnels

Create a Runtime API key for tunnel-client:
https://platform.openai.com/settings/organization/api-keys

Use a restricted runtime key with Tunnels permission for the long-running daemon.
Do not paste the key into chat. The bootstrap script will read it with hidden input and store it locally at:
~/.config/localbridge-mcp/tunnel-runtime-key

Do not use an Admin API key as the long-running runtime key. Admin keys are for tunnel management, not the daemon.

Create the ChatGPT developer-mode MCP app:
https://chatgpt.com/plugins

OpenAI tunnel-client installation and permission docs:
https://github.com/openai/tunnel-client/blob/master/docs/end-user-guide.md
https://github.com/openai/tunnel-client/blob/master/docs/permissions.md
```

For non-OpenAI platforms, show the platform setup links from `docs/ONLINE_PLATFORMS.md`, `docs/platforms/protocol-compatible-guides.md`, or `docs/platforms/platform-flow-reference.md` before asking for a connector URL, OAuth/client configuration, vendor key, bearer token, tunnel token, or enterprise data-store settings.

Do not promise that any vendor key, tunnel, connector, or tool call is free. Safe wording is: use the narrowest platform key or auth method available, keep budgets or alerts enabled where available, and check the vendor's current billing policy.

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
- your own Runtime API key restricted to the `Tunnels` permission;
- a local filesystem allowlist.

See [docs/INSTALL_MACOS.md](docs/INSTALL_MACOS.md) for the full installation, OpenAI setup links, update, profile-only validation, uninstall flow, and copy-paste bootstrap script for AI sessions that cannot operate the local terminal directly.

## Quick start: local stdio MCP server

The local stdio path is still available for development and testing, but this repository's public installation guide targets online platforms first.

```bash
git clone https://github.com/danielcanfly/localbridge-mcp.git
cd localbridge-mcp
npm ci
npm test
./scripts/setup-core.sh --allow "$HOME/Projects"
./scripts/doctor.sh
```

## What LocalBridge MCP does

LocalBridge MCP gives an AI assistant a tool surface for practical local work:

- read, list, and inspect allowed local files;
- write, move, create, and patch text files;
- run fast text search with session-based pagination;
- start and manage persistent shell sessions;
- drive Git, SSH, test runners, package managers, Docker, and other CLI workflows through the shell;
- on macOS, run persistently behind OpenAI Secure MCP Tunnel through a local Runtime.app and `launchd`.

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

## Documentation

- [Online platform compatibility](docs/ONLINE_PLATFORMS.md)
- [Protocol-compatible online platform guides](docs/platforms/protocol-compatible-guides.md)
- [Platform setup flow reference](docs/platforms/platform-flow-reference.md)
- [ChatGPT UI gates](docs/platforms/chatgpt-ui-gates.md)
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
