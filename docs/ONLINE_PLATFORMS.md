# Online platform compatibility

LocalBridge MCP is designed for online AI assistants that need controlled access to a user's local computer.

Start every guided installation with this question:

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

Do not begin by assuming ChatGPT. The installation path, credential source, connector URL, and tunnel model are platform-specific.

## Mandatory assistant behavior

After the user chooses a platform, an AI assistant must show the platform's setup links and credential instructions before asking the user to provide or confirm missing values.

Do **not** only ask for a tunnel ID, key, connector URL, or allowlist. First tell the user where to create or find the platform-specific credential, what permission or auth mode is expected, and what should not be pasted into chat.

Use this response shape:

```text
Platform: <selected platform>
Current LocalBridge status: <Qualified / Protocol-compatible / Research-only / Not claimed>
What this platform expects: <OpenAI tunnel / remote MCP URL / OAuth / API key / connected app / enterprise data store>
Where to create or configure it:
- <official setup URL 1>
- <official setup URL 2>
Credential handling:
- <what key/token/OAuth/client setting is needed, if any>
- <whether the user should avoid pasting secrets into chat>
Next step:
- <what the user should prepare or confirm>
```

If the selected platform is ChatGPT / OpenAI, always show the OpenAI Tunnels and Runtime API key links before asking for `Tunnel ID` or `Tunnels-only Runtime API key` readiness.

If the selected platform is not OpenAI, do not run the OpenAI-specific installer. Explain that most non-OpenAI online platforms expect a reachable remote MCP URL and that LocalBridge needs a platform-compatible gateway, tunnel, or adapter before the platform can connect.

## Compatibility language

Use these terms consistently:

- **Qualified**: tested by this repository's release and setup scripts.
- **Protocol-compatible target**: the platform documents support for custom remote MCP servers, but this repository has not yet qualified a setup flow for it.
- **Not claimed**: no official evidence was found that the online product can connect to an arbitrary user-provided MCP server.
- **Out of scope**: local IDE, local CLI, or desktop-only MCP clients. LocalBridge may work with them, but this repository's online-platform installation docs do not target them.

## Current status

| Online platform | Status | What the user needs | Notes |
| --- | --- | --- | --- |
| ChatGPT / OpenAI | **Qualified** | OpenAI Secure MCP Tunnel ID, OpenAI runtime API key with Tunnels permission, `tunnel-client`, local allowlist | This is the currently qualified macOS persistent runtime path. |
| Claude.ai / Claude custom connectors | **Protocol-compatible target, not yet qualified here** | A remote MCP server URL, or Anthropic MCP tunnel access if using Claude's tunnel stack | Claude custom connectors can use remote MCP. Claude MCP tunnels are a separate research-preview deployment path. |
| Grok | **Protocol-compatible target, not yet qualified here** | A custom MCP connector URL and any connector auth the server requires | Grok documents Custom MCP connectors and requires locally running servers to be exposed through a tunneling service or public endpoint. |
| Perplexity | **Protocol-compatible target, not yet qualified here** | A custom remote MCP connector URL and optional OAuth/API-key/open authentication | Perplexity documents Bring Your Own Connector using MCP for Pro, Max, and Enterprise users. |
| Gemini Apps | **Protocol-compatible target, not yet qualified here** | A custom app MCP server URL | Gemini Apps custom connected apps are region/language/account limited and require the MCP server to follow MCP specifications. |
| Gemini Enterprise | **Protocol-compatible target, not yet qualified here** | A custom MCP server data store, trusted TLS certificate, and organization policy configuration | Gemini Enterprise custom MCP data stores require StreamableHTTP and publicly trusted TLS certificates. |
| Mistral Le Chat / Work / Studio | **Protocol-compatible target, not yet qualified here** | A custom MCP connector server URL and administrator setup where required | Mistral documents custom MCP connectors for Work/Studio and connector availability across Mistral apps. |
| GitHub Copilot cloud/app | **Protocol-compatible target, narrow use case, not yet qualified here** | Repository/app MCP configuration and a supported remote MCP endpoint | Copilot cloud agent/code review support MCP tools, but not MCP resources or prompts, and do not currently support remote MCP servers using OAuth. |
| Kimi web | **Research-only, not yet install-qualified here** | Kimi plugin/package path that can declare MCP servers | Kimi Web documents MCP support inside plugins, but this guide does not yet claim a complete arbitrary-remote-LocalBridge install flow. |
| Poe | **Not claimed** | N/A | Poe documents its own Server Bot protocol. This is not the same thing as arbitrary MCP client support. |
| MiniMax chat/web | **Not claimed** | N/A | MiniMax publishes MCP servers for MiniMax APIs; that does not prove the MiniMax online chat app can consume arbitrary external MCP servers. |
| DeepSeek web | **Not claimed** | N/A | No official arbitrary custom remote MCP connector path was verified during the research pass. |
| You.com chat | **Not claimed as an MCP client** | N/A | You.com documents You.com as an MCP server and integrations for agents; no official arbitrary external MCP-client path for the consumer chat surface was verified here. |

## Important distinction: platform support vs LocalBridge transport support

An online platform can support MCP and still not be immediately usable with LocalBridge MCP.

There are two separate gates:

1. **Platform gate**: Does the online platform let a user add an arbitrary custom MCP server?
2. **Transport gate**: Does LocalBridge MCP provide a connection method that platform can reach?

LocalBridge MCP v0.2.1 qualifies the OpenAI Secure MCP Tunnel transport for ChatGPT. Most other online platforms expect a remote HTTPS MCP server URL, not an OpenAI tunnel ID. Supporting those platforms usually requires one of these future paths:

- an HTTPS/StreamableHTTP remote MCP gateway for LocalBridge MCP;
- a vendor-specific tunnel integration, such as Claude MCP tunnels;
- a user-managed public or private tunnel, with strict authentication and allowlists;
- a platform-specific adapter if the platform does not consume MCP directly.

Do not tell users that an OpenAI Secure MCP Tunnel works for Grok, Perplexity, Gemini, Mistral, or Claude unless that vendor explicitly documents compatibility with OpenAI's tunnel service. Treat OpenAI tunnel IDs as OpenAI-specific.

## Setup links by platform

### ChatGPT / OpenAI

Use this path for the current qualified installation.

- OpenAI Tunnels management: `https://platform.openai.com/settings/organization/tunnels`
- OpenAI Runtime API keys: `https://platform.openai.com/settings/organization/api-keys`
- OpenAI Admin API keys: `https://platform.openai.com/settings/organization/admin-keys`
- ChatGPT connector settings: `https://chatgpt.com/#settings/Connectors`
- OpenAI tunnel-client guide: `https://github.com/openai/tunnel-client/blob/master/docs/end-user-guide.md`
- OpenAI tunnel-client permissions: `https://github.com/openai/tunnel-client/blob/master/docs/permissions.md`

Use a restricted runtime API key with Tunnels permission for the long-running daemon. Do not use an Admin API key as the runtime daemon key.

Assistant behavior: show the links above before asking for tunnel ID, runtime key readiness, or `tunnel-client` status.

### Claude.ai / Claude custom connectors

- Claude custom connectors using remote MCP: `https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp`
- Claude connector usage: `https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities`
- Claude MCP connector API docs: `https://platform.claude.com/docs/en/agents-and-tools/mcp-connector`
- Claude MCP tunnels console guide: `https://platform.claude.com/docs/en/agents-and-tools/mcp-tunnels/console`
- Claude MCP tunnels quickstart: `https://platform.claude.com/docs/en/agents-and-tools/mcp-tunnels/quickstart`
- Claude Create Tunnel API: `https://platform.claude.com/docs/en/api/beta/tunnels/create`

Claude custom connectors are remote MCP connectors. Claude MCP tunnels are a separate Anthropic tunnel path and are marked as research preview in Anthropic's docs.

Assistant behavior: ask whether the user is using Claude custom connectors or Claude MCP tunnels. Show the appropriate links before asking for connector URL, OAuth/client configuration, tunnel token, or tunnel domain.

### Grok

- Grok connectors: `https://docs.x.ai/grok/connectors`
- Grok custom MCP tunneling: `https://docs.x.ai/grok/connectors/custom-mcp-tunneling`
- Grok connector management: `https://docs.x.ai/grok/connector-management`
- Grok connector catalog: `https://grok.com/connectors`

Grok documents Custom MCP connectors. It asks for an MCP server URL and states that a local machine server needs a tunneling service to be reachable.

Assistant behavior: show these links before asking for the MCP server URL. If the user only has a local LocalBridge install, explain that a reachable remote MCP URL is missing.

### Perplexity

- Perplexity custom connectors / MCP changelog: `https://www.perplexity.ai/changelog/what-we-shipped---march-13-2026`
- Perplexity official MCP server for Perplexity API Platform: `https://github.com/perplexityai/modelcontextprotocol`

Perplexity documents Bring Your Own Connector with a custom remote MCP server URL. The Perplexity MCP server repository is a server for using Perplexity APIs from MCP clients; it is not the same thing as LocalBridge support.

Assistant behavior: show these links before asking for connector access or a remote MCP URL. Explain that auth may be OAuth, API key, bearer token, or open auth depending on the connector, but LocalBridge should not expose shell tools as open auth.

### Gemini

- Gemini Apps custom connected apps: `https://support.google.com/gemini/answer/17209137`
- Gemini Connected Apps management: `https://support.google.com/gemini/answer/13695044`
- Gemini Enterprise custom MCP server data store: `https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server`
- Gemini Enterprise workflow MCP servers: `https://docs.cloud.google.com/gemini/enterprise/docs/workflow-builder/connect-mcp-servers`

Gemini Apps custom apps and Gemini Enterprise custom MCP data stores are online-platform paths. Gemini CLI is a local CLI and is out of scope for this online-platform guide.

Assistant behavior: ask whether the user means Gemini Apps or Gemini Enterprise. Show the matching links before asking for a custom app URL, Enterprise data store settings, OAuth client settings, or TLS details.

### Mistral

- Mistral MCP Connectors docs: `https://docs.mistral.ai/vibe/work/connectors/mcp-connectors`
- Mistral Studio connectors: `https://docs.mistral.ai/studio/connectors`
- Mistral connector management: `https://docs.mistral.ai/studio/connectors/management`
- Mistral connectors announcement: `https://mistral.ai/news/connectors/`
- Le Chat MCP connectors announcement: `https://mistral.ai/news/le-chat-mcp-connectors-memories/`

Mistral documents custom MCP connectors by server URL. Administrator setup may be required.

Assistant behavior: ask whether the user is using Le Chat, Work, or Studio. Show links before asking for server URL, visibility, administrator status, or any API/Studio key.

### GitHub Copilot cloud/app

- Configure MCP servers for a repository: `https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers`
- About MCP in GitHub Copilot: `https://docs.github.com/en/copilot/concepts/context/mcp`

This is a code-assistant/cloud-agent use case, not a general chat platform path. Copilot cloud agent and code review currently support MCP tools, not resources or prompts.

Assistant behavior: show these links before asking for repository MCP configuration, secrets/variables, or remote endpoint details. Do not expose write-capable shell tools to code review without a strict read-only profile.

### Kimi web

- Kimi plugins overview: `https://www.kimi.com/en/help/plugins-and-skills/overview`
- Kimi plugin overview, Traditional Chinese: `https://www.kimi.ai/zh-hant/help/plugins-and-skills/overview`
- Kimi Code plugin docs: `https://www.kimi.com/code/docs/en/kimi-code-cli/customization/plugins`
- Kimi Code MCP docs: `https://www.kimi.com/code/docs/en/kimi-code-cli/customization/mcp.html`

Kimi Web documents MCP support inside plugins, but this guide does not yet claim a complete arbitrary-remote-LocalBridge install flow for Kimi Web. Do not treat Kimi Code CLI docs as proof of online web support.

Assistant behavior: ask for the exact Kimi surface and plugin documentation. Do not run local CLI instructions unless the user explicitly switches to Kimi Code.

### Poe

- Poe Server Bot protocol: `https://creator.poe.com/docs/server-bots/poe-protocol-specification`

Poe can host custom bots through Poe's protocol. This guide does not claim Poe can directly consume arbitrary MCP servers.

### Platforms to re-check before claiming support

Re-check official docs before claiming support for: MiniMax chat/web, DeepSeek web, You.com consumer chat, and any platform not listed above. Publishing an MCP server is not the same as supporting arbitrary user-provided MCP servers as a client.

## Recommended assistant response flow

When an AI assistant is asked to install LocalBridge MCP, it should first say:

```text
Which online platform are you connecting LocalBridge MCP to?

The qualified path is ChatGPT / OpenAI Secure MCP Tunnel. Other online platforms may support custom remote MCP servers, but they need a platform-specific remote URL, tunnel, or gateway path. I will choose commands only after you confirm the platform.
```

Then:

- If the user chooses **ChatGPT / OpenAI**, show the OpenAI setup links from this document and then follow `docs/INSTALL_MACOS.md`.
- If the user chooses **Claude, Grok, Perplexity, Gemini, Mistral, GitHub Copilot cloud/app, or Kimi web**, show the platform's setup links first, explain the expected connector URL/auth model, and stop if the user does not already have a reachable LocalBridge remote MCP URL or gateway.
- If the user chooses **Poe, MiniMax chat/web, DeepSeek web, You.com chat, or another unverified platform**, say support is not currently claimed and ask for the platform's official custom MCP connector documentation before proceeding.
