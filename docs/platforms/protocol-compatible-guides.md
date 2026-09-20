# Protocol-compatible online platform guides

This guide is for AI sessions that need to route a user by online platform and give platform-specific setup guidance.

It does **not** mean every platform below is end-to-end qualified by this repository. Use the status words precisely.

## Required first question

Start every guided install with:

```text
Which online platform are you connecting LocalBridge MCP to?

Choose one if possible:
- ChatGPT / OpenAI
- Claude.ai / Claude custom connector
- Claude MCP tunnels
- Grok
- Perplexity
- Gemini Apps
- Gemini Enterprise
- Mistral Le Chat / Work / Studio
- GitHub Copilot cloud/app
- Kimi web
- Other
```

Then choose the matching platform guide below.

## Vocabulary

- **Qualified**: this repository has a tested end-to-end path for the platform.
- **Protocol-compatible**: the platform documents a way to add a custom remote MCP server, but this repository has not completed platform-specific end-to-end qualification.
- **Research-only / not claimed**: official docs were not sufficient to claim that the online product can connect to an arbitrary user-provided MCP server.
- **Vendor key**: a platform credential such as an API key, OAuth client secret, connector secret, bearer token, or tunnel runtime key.
- **LocalBridge gateway key**: a future or user-managed credential that protects a LocalBridge remote gateway. This is separate from vendor keys.

## Universal rules for non-OpenAI online platforms

Most online platforms expect a reachable remote MCP endpoint, usually an HTTPS URL. Do **not** reuse an OpenAI Secure MCP Tunnel ID for another vendor unless that vendor explicitly documents support for OpenAI Secure MCP Tunnel.

For non-OpenAI protocol-compatible platforms, LocalBridge needs one of these before the platform can connect:

- a LocalBridge remote MCP gateway reachable by HTTPS;
- a vendor-specific tunnel integration;
- a user-managed public/private tunnel with strict authentication;
- a platform-specific adapter.

Do not expose a shell-capable LocalBridge endpoint as an unauthenticated public MCP server.

## Billing and key usage language

Do not promise that any vendor key, tunnel, or connector is free or that it can never affect billing.

Safe wording:

```text
Use the narrowest key or auth method required by the platform. For OpenAI Secure MCP Tunnel, the runtime key should be restricted to Tunnels permissions and is not a general model-inference key. Do not assume that means every tunnel, connector, tool call, or platform feature is free. Check the vendor's current billing and keep budgets or alerts enabled where available.
```

## ChatGPT / OpenAI

Status: **Qualified** for macOS persistent runtime through OpenAI Secure MCP Tunnel.

Use when the user answers:

- ChatGPT
- OpenAI
- OpenAI Secure MCP Tunnel

### What the user needs

- OpenAI Platform account with Secure MCP Tunnel access.
- OpenAI Secure MCP Tunnel ID, usually `tunnel_...`.
- Runtime API key restricted to Tunnels permission.
- `tunnel-client` installed locally.
- Local filesystem allowlist.
- macOS privacy approvals when Runtime.app asks.

### Where the user goes

- OpenAI Tunnels management: `https://platform.openai.com/settings/organization/tunnels`
- OpenAI Runtime API keys: `https://platform.openai.com/settings/organization/api-keys`
- OpenAI Admin API keys: `https://platform.openai.com/settings/organization/admin-keys`
- ChatGPT connector settings: `https://chatgpt.com/#settings/Connectors`
- OpenAI tunnel-client guide: `https://github.com/openai/tunnel-client/blob/master/docs/end-user-guide.md`
- OpenAI tunnel-client permissions: `https://github.com/openai/tunnel-client/blob/master/docs/permissions.md`

### Key and permission guidance

Use a restricted runtime API key for the daemon. The runtime principal needs Tunnels Read + Use for the target tunnel. Admin keys are only for tunnel CRUD and should not be used as the long-running runtime daemon key.

### Session behavior

If the AI session has local shell access, follow `docs/INSTALL_MACOS.md` directly.

If the AI session has no local shell access, use the copy-paste bootstrap script in `docs/INSTALL_MACOS.md`. The script asks for tunnel ID, allowlist, and hidden API key input and does not print the key.

## Claude.ai / Claude custom connector

Status: **Protocol-compatible**.

Use when the user answers:

- Claude.ai
- Claude web
- Claude custom connector
- Claude remote MCP

### What the user needs

- A remote MCP server URL reachable by Anthropic's cloud infrastructure.
- OAuth support if the connector requires user authorization.
- OAuth client ID and secret only if using advanced settings or a server that requires them.
- Connector name and URL.

### Where the user goes

- Claude custom connectors using remote MCP: `https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp`
- Claude connector usage: `https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities`
- Claude MCP connector API docs: `https://platform.claude.com/docs/en/agents-and-tools/mcp-connector`

### Key / OAuth / no-key notes

Claude custom connectors typically use OAuth. In many connector flows, the user does not paste a raw vendor API key into Claude; instead, Claude starts an OAuth authorization flow against the remote MCP server.

A LocalBridge remote gateway may still need its own auth layer. Do not make LocalBridge open-auth merely because a platform supports open connectors.

### Session behavior

Ask whether the user already has a remote LocalBridge MCP URL. If not, explain that the current OpenAI tunnel path cannot be reused for Claude and that a remote gateway or Claude-compatible tunnel path is needed.

Do not run the OpenAI Secure MCP Tunnel installer unless the user is also setting up ChatGPT / OpenAI.

## Claude MCP tunnels

Status: **Protocol-compatible research path**.

Use when the user specifically answers:

- Claude MCP tunnels
- Anthropic MCP tunnel

### What the user needs

- Claude Console access to MCP tunnels.
- Tunnel token / tunnel domain / CA material as required by Anthropic's tunnel setup.
- A local MCP server that can be reached by the Anthropic tunnel agent.

### Where the user goes

- Claude MCP tunnels console guide: `https://platform.claude.com/docs/en/agents-and-tools/mcp-tunnels/console`
- Claude MCP tunnels quickstart: `https://platform.claude.com/docs/en/agents-and-tools/mcp-tunnels/quickstart`
- Claude Create Tunnel API: `https://platform.claude.com/docs/en/api/beta/tunnels/create`

### Session behavior

Treat this as separate from Claude custom connectors and separate from OpenAI Secure MCP Tunnel. Do not mix token names, endpoint URLs, or setup scripts between OpenAI and Anthropic.

## Grok

Status: **Protocol-compatible**.

Use when the user answers:

- Grok
- xAI
- grok.com connectors

### What the user needs

- A custom MCP server URL reachable by Grok.
- Authentication required by that server, if any.
- For local servers, a tunneling service or public remote endpoint.
- For Grok Business / Enterprise, team admin access may be required.

### Where the user goes

- Grok connectors: `https://docs.x.ai/grok/connectors`
- Grok custom MCP tunneling: `https://docs.x.ai/grok/connectors/custom-mcp-tunneling`
- Grok connector management: `https://docs.x.ai/grok/connector-management`
- Grok connector catalog: `https://grok.com/connectors`

### Key / OAuth / no-key notes

Grok needs an MCP server URL. Whether a separate key is needed depends on the MCP server's authentication. LocalBridge should require gateway auth before exposing shell-capable tools.

### Session behavior

Ask for a remote MCP URL. If the user only has a local machine, explain that Grok requires the server to be reachable over the public internet or via an appropriate tunnel. Do not use OpenAI tunnel credentials.

## Perplexity

Status: **Protocol-compatible**.

Use when the user answers:

- Perplexity
- Perplexity custom connector
- Bring Your Own Connector

### What the user needs

- A remote MCP server URL.
- An authentication mode supported by the connector flow: OAuth, API key, bearer token, or open authentication where appropriate.
- A paid plan or enterprise feature access where the connector feature is limited by plan.

### Where the user goes

- Perplexity MCP / Bring Your Own Connector changelog: `https://www.perplexity.ai/changelog/what-we-shipped---march-13-2026`
- Perplexity official MCP server for Perplexity API Platform: `https://github.com/perplexityai/modelcontextprotocol`

### Key / OAuth / no-key notes

Perplexity's connector flow can support different auth modes. Even if open auth is offered by the platform, do not expose LocalBridge open-auth. Use a gateway bearer token or OAuth layer for LocalBridge.

### Session behavior

Ask whether the user has Perplexity connector access and a remote LocalBridge MCP URL. If not, explain that the current qualified LocalBridge path is OpenAI-only and Perplexity needs a reachable MCP URL.

## Gemini Apps

Status: **Protocol-compatible**.

Use when the user answers:

- Gemini Apps
- Gemini web
- Gemini Spark custom app
- Google Gemini custom connected app

### What the user needs

- A Gemini feature surface that supports custom connected apps.
- A custom MCP server URL.
- Google account permission / connected app authorization.

### Where the user goes

- Gemini Apps custom connected apps: `https://support.google.com/gemini/answer/17209137`
- Gemini Connected Apps management: `https://support.google.com/gemini/answer/13695044`

### Key / OAuth / no-key notes

Gemini Apps custom app setup may rely on Google account connection and the MCP server URL rather than a user-generated vendor API key. The MCP server itself may still need authentication.

### Session behavior

Ask for the Gemini custom app surface and the remote MCP URL. If the user only has a local LocalBridge install, explain that Gemini Apps needs a reachable MCP URL and that OpenAI tunnel IDs are not Gemini connector URLs.

## Gemini Enterprise

Status: **Protocol-compatible enterprise path**.

Use when the user answers:

- Gemini Enterprise
- Google Cloud Gemini Enterprise
- Custom MCP server data store

### What the user needs

- Gemini Enterprise app access.
- Custom MCP Server data store creation permission.
- A remote MCP endpoint using StreamableHTTP.
- TLS certificate signed by a publicly trusted CA.
- OAuth client ID/secret where required by the data store configuration.
- Organization policy/VPC-SC allowances where applicable.

### Where the user goes

- Gemini Enterprise custom MCP server data store: `https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server`
- Gemini Enterprise workflow MCP servers: `https://docs.cloud.google.com/gemini/enterprise/docs/workflow-builder/connect-mcp-servers`

### Key / OAuth / no-key notes

Gemini Enterprise is stricter than consumer Gemini Apps. It requires StreamableHTTP and publicly trusted TLS. Treat this as an enterprise integration lane, not a copy-paste consumer install.

### Session behavior

Do not use the OpenAI tunnel installer. Ask for the Enterprise app, project/org requirements, public TLS endpoint, and auth mode.

## Mistral Le Chat / Work / Studio

Status: **Protocol-compatible**.

Use when the user answers:

- Mistral
- Le Chat
- Mistral Work
- Mistral Studio
- Mistral custom MCP connector

### What the user needs

- Mistral connector access.
- A custom MCP-compatible server URL.
- Connector visibility scope.
- Administrator setup where required.
- API key only for API/Studio automation paths that require it.

### Where the user goes

- Mistral MCP Connectors docs: `https://docs.mistral.ai/vibe/work/connectors/mcp-connectors`
- Mistral Studio connectors: `https://docs.mistral.ai/studio/connectors`
- Mistral connector management: `https://docs.mistral.ai/studio/connectors/management`
- Mistral connectors announcement: `https://mistral.ai/news/connectors/`

### Key / OAuth / no-key notes

Mistral custom connectors are registered by MCP server URL and visibility. Some connector workflows may require a Mistral API key for automation; user-facing connector authorization may be separate.

### Session behavior

Ask whether the user is using Le Chat, Work, or Studio. Ask for the MCP server URL and desired visibility. Do not run OpenAI tunnel setup unless the user also selected ChatGPT.

## GitHub Copilot cloud/app

Status: **Protocol-compatible narrow path**.

Use when the user answers:

- GitHub Copilot cloud agent
- GitHub Copilot code review
- Copilot app/cloud

### What the user needs

- Repository-level MCP configuration.
- A remote MCP endpoint supported by Copilot's cloud flow.
- Secrets/variables prefixed as required by GitHub Copilot agent configuration.
- Read-only tools for Copilot code review.

### Where the user goes

- Configure MCP servers for a repository: `https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers`
- About MCP in GitHub Copilot: `https://docs.github.com/en/copilot/concepts/context/mcp`

### Key / OAuth / no-key notes

GitHub Copilot cloud agent and code review have constraints around remote MCP servers and OAuth. Tool availability may be limited, and resources/prompts are not the same as general MCP client behavior.

### Session behavior

Treat this as a repository/cloud-agent integration, not a general chat platform. For LocalBridge, do not expose write-capable shell tools to code review without a strict read-only profile.

## Kimi web

Status: **Protocol-compatible research path, not yet install-qualified**.

Use when the user answers:

- Kimi web
- Kimi plugins
- Kimi Work

### What the user needs

- Kimi plugin support on the target surface.
- A plugin/package definition that can declare MCP servers.
- For Kimi Code, MCP can be declared through local CLI/plugin config, but local/CLI surfaces are out of scope for this online-platform guide.

### Where the user goes

- Kimi plugins overview: `https://www.kimi.com/en/help/plugins-and-skills/overview`
- Kimi plugin overview, Traditional Chinese: `https://www.kimi.ai/zh-hant/help/plugins-and-skills/overview`
- Kimi Code plugin docs: `https://www.kimi.com/code/docs/en/kimi-code-cli/customization/plugins`
- Kimi Code MCP docs: `https://www.kimi.com/code/docs/en/kimi-code-cli/customization/mcp.html`

### Key / OAuth / no-key notes

Kimi Web documents MCP support inside plugins, but this guide does not yet claim a complete arbitrary-remote-LocalBridge install flow for Kimi Web. Do not treat Kimi Code CLI docs as proof of online web support.

### Session behavior

Ask for the exact Kimi surface and plugin documentation the user wants to use. If the user only wants Kimi web, do not run local CLI instructions unless they explicitly switch to Kimi Code.

## Not claimed platforms

For these platforms, do not present LocalBridge as supported unless fresh official documentation shows that the online product can connect to an arbitrary user-provided MCP server:

- Poe: Poe documents its own Server Bot protocol, not arbitrary MCP client support.
- MiniMax chat/web: official MiniMax MCP projects are MCP servers for MiniMax APIs, not proof that the MiniMax chat app consumes arbitrary external MCP servers.
- DeepSeek web: DeepSeek Responses compatibility docs indicate built-in `mcp` tools are ignored; DeepSeek Harness/CLI is not the same as DeepSeek web.
- You.com chat: You.com documents You.com-provided MCP servers for other agents/clients, not verified consumer-chat support for arbitrary external LocalBridge MCP.

## Assistant routing template

After the user names a platform, respond with:

```text
Platform: <platform>
Current LocalBridge status: <Qualified / Protocol-compatible / Research-only / Not claimed>
What this platform expects: <OpenAI tunnel / remote MCP URL / OAuth / API key / connected app / enterprise data store>
What LocalBridge currently provides: <OpenAI tunnel path / local stdio server / needs remote gateway>
Next step: <platform-specific setup or stop condition>
```

If the platform is not OpenAI and the user does not already have a remote LocalBridge MCP URL or gateway, stop before asking for vendor secrets. Explain the missing transport first.
