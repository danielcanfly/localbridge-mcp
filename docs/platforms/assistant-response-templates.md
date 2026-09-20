# Assistant response templates for online platform setup

This file gives exact response templates for AI sessions guiding a user through LocalBridge MCP setup.

Use these templates after the user answers the required first question:

```text
Which online platform are you connecting LocalBridge MCP to?
```

The templates are intentionally repetitive. They are rails for AI assistants, not prose essays. Keep the platform names, status words, credential handling, and stop conditions intact.

## Global rules

1. Show the platform setup links before asking for missing values.
2. Do not ask the user to paste API keys, OAuth client secrets, bearer tokens, tunnel tokens, SSH keys, or private credentials into chat.
3. Do not invent tunnel IDs, connector URLs, client IDs, API keys, bearer tokens, OAuth credentials, allowlists, or public hostnames.
4. Do not run the OpenAI Secure MCP Tunnel installer unless the user selected ChatGPT / OpenAI.
5. If the selected platform is not OpenAI and the user does not already have a reachable LocalBridge remote MCP URL, stop and explain that LocalBridge needs a platform-compatible remote gateway, tunnel, or adapter first.
6. Do not promise that any vendor key, tunnel, connector, tool call, or platform feature is free. Use cautious billing language.
7. For shell-capable LocalBridge tools, never recommend open unauthenticated remote access.

Safe billing language:

```text
Use the narrowest key or auth method required by the platform. Do not assume that any tunnel, connector, tool call, or platform feature is free. Check the vendor's current billing page and keep budgets or alerts enabled where available.
```

## ChatGPT / OpenAI

Use when the user says: ChatGPT, OpenAI, OpenAI Secure MCP Tunnel.

```text
Platform: ChatGPT / OpenAI
Current LocalBridge status: Qualified for macOS persistent runtime through OpenAI Secure MCP Tunnel.

What this platform expects:
- OpenAI Secure MCP Tunnel ID, usually starting with tunnel_
- Restricted OpenAI Runtime API key with Tunnels permission for tunnel-client
- tunnel-client installed locally
- Local filesystem allowlist
- macOS privacy approval when Runtime.app asks

Where to create or configure it:
- OpenAI Tunnels management: https://platform.openai.com/settings/organization/tunnels
- OpenAI Runtime API keys: https://platform.openai.com/settings/organization/api-keys
- OpenAI Admin API keys: https://platform.openai.com/settings/organization/admin-keys
- ChatGPT connector settings: https://chatgpt.com/#settings/Connectors
- OpenAI tunnel-client guide: https://github.com/openai/tunnel-client/blob/master/docs/end-user-guide.md
- OpenAI tunnel-client permissions: https://github.com/openai/tunnel-client/blob/master/docs/permissions.md

Credential handling:
- Create or find the tunnel ID in OpenAI Tunnels management.
- Create a restricted Runtime API key for tunnel-client.
- Do not paste the Runtime API key into chat.
- The bootstrap script will read the Runtime API key with hidden input and store it locally at ~/.config/localbridge-mcp/tunnel-runtime-key with chmod 600.
- Do not use an Admin API key as the long-running runtime daemon key. Admin keys are for tunnel management.

What LocalBridge currently provides:
- A qualified macOS persistent runtime path for ChatGPT through OpenAI Secure MCP Tunnel.

Next step:
Please prepare or confirm:
- Tunnel ID: already available / need to create
- Tunnels-only Runtime API key: already available / need to create
- Allowlist directory: <path>
- tunnel-client: installed / not installed / unsure

Do not paste the API key. If this session cannot operate your Mac directly, I will provide the copy-paste Terminal bootstrap script from docs/INSTALL_MACOS.md after the required values are ready.
```

## Claude.ai / Claude custom connector

Use when the user says: Claude.ai, Claude web, Claude custom connector, Claude remote MCP.

```text
Platform: Claude.ai / Claude custom connector
Current LocalBridge status: Protocol-compatible target, not yet qualified here.

What this platform expects:
- A remote MCP server URL reachable by Claude's cloud infrastructure
- OAuth flow if the remote MCP connector requires user authorization
- OAuth client ID and client secret only if the remote connector configuration requires them
- Connector name and connector URL in Claude settings

Where to create or configure it:
- Claude custom connectors using remote MCP: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- Claude connector usage: https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities
- Claude MCP connector API docs: https://platform.claude.com/docs/en/agents-and-tools/mcp-connector

Credential handling:
- Claude custom connectors commonly use OAuth rather than asking the user to paste a raw vendor API key.
- Do not paste OAuth client secrets, bearer tokens, or gateway secrets into chat.
- A LocalBridge remote gateway should still require authentication even if a platform offers open connector modes.

What LocalBridge currently provides:
- LocalBridge v0.2.1 does not yet provide a Claude-qualified remote gateway.
- The OpenAI Secure MCP Tunnel ID cannot be reused as a Claude connector URL.

Stop condition:
If the user does not already have a reachable LocalBridge remote MCP URL or Claude-compatible gateway, stop before asking for OAuth secrets or connector values.

Next step:
Do you already have a reachable LocalBridge remote MCP URL for Claude? If yes, provide the non-secret URL only. If no, the next engineering step is to add or configure a Claude-compatible remote MCP gateway for LocalBridge.
```

## Claude MCP tunnels

Use when the user says: Claude MCP tunnels, Anthropic MCP tunnel.

```text
Platform: Claude MCP tunnels
Current LocalBridge status: Protocol-compatible research path, not yet qualified here.

What this platform expects:
- Claude Console access to MCP tunnels
- Claude tunnel token, tunnel domain, CA material, or other tunnel setup material required by Anthropic
- A local or private MCP server reachable by the Claude tunnel agent

Where to create or configure it:
- Claude MCP tunnels console guide: https://platform.claude.com/docs/en/agents-and-tools/mcp-tunnels/console
- Claude MCP tunnels quickstart: https://platform.claude.com/docs/en/agents-and-tools/mcp-tunnels/quickstart
- Claude Create Tunnel API: https://platform.claude.com/docs/en/api/beta/tunnels/create

Credential handling:
- Do not paste Claude tunnel tokens, client secrets, certificates, or private material into chat.
- Treat Anthropic tunnel credentials as separate from OpenAI tunnel credentials.

What LocalBridge currently provides:
- LocalBridge currently has a qualified OpenAI tunnel path, not a qualified Claude tunnel path.

Stop condition:
Do not run OpenAI setup scripts for Claude MCP tunnels. Stop if the user does not have Claude MCP tunnel access or required tunnel material.

Next step:
Confirm whether Claude MCP tunnels are available in your Claude Console and whether you already have a tunnel domain/token prepared. Do not paste tunnel tokens into chat.
```

## Grok

Use when the user says: Grok, xAI, grok.com connectors.

```text
Platform: Grok
Current LocalBridge status: Protocol-compatible target, not yet qualified here.

What this platform expects:
- A custom MCP server URL reachable by Grok
- Authentication required by that MCP server, if any
- A tunneling service or public/private remote endpoint if the server starts on a local machine
- Team admin access for Business / Enterprise connector management when required

Where to create or configure it:
- Grok connectors: https://docs.x.ai/grok/connectors
- Grok custom MCP tunneling: https://docs.x.ai/grok/connectors/custom-mcp-tunneling
- Grok connector management: https://docs.x.ai/grok/connector-management
- Grok connector catalog: https://grok.com/connectors

Credential handling:
- Grok primarily needs a reachable MCP server URL.
- Whether a separate key is needed depends on the MCP server authentication.
- Do not expose LocalBridge shell tools as open unauthenticated MCP.
- Do not paste bearer tokens or gateway secrets into chat.

What LocalBridge currently provides:
- LocalBridge v0.2.1 does not yet provide a Grok-qualified remote gateway.
- OpenAI tunnel IDs are not Grok connector URLs.

Stop condition:
If the user has only a local LocalBridge install and no remote MCP URL, stop before asking for Grok connector secrets.

Next step:
Do you already have a reachable LocalBridge remote MCP URL for Grok? If yes, provide the non-secret URL only. If no, the next step is to create a Grok-compatible remote gateway or tunnel for LocalBridge.
```

## Perplexity

Use when the user says: Perplexity, Perplexity custom connector, Bring Your Own Connector.

```text
Platform: Perplexity
Current LocalBridge status: Protocol-compatible target, not yet qualified here.

What this platform expects:
- A remote MCP server URL
- Connector auth mode such as OAuth, API key, bearer token, or open authentication where appropriate
- Plan or workspace access to custom connector features when required

Where to create or configure it:
- Perplexity MCP / Bring Your Own Connector changelog: https://www.perplexity.ai/changelog/what-we-shipped---march-13-2026
- Perplexity official MCP server for Perplexity API Platform: https://github.com/perplexityai/modelcontextprotocol

Credential handling:
- Perplexity connector flows may support OAuth, API key, bearer token, or open authentication depending on the connector.
- LocalBridge should not be exposed as open auth because it can expose shell-capable tools.
- Do not paste API keys, bearer tokens, or OAuth client secrets into chat.

What LocalBridge currently provides:
- LocalBridge v0.2.1 does not yet provide a Perplexity-qualified remote gateway.
- The Perplexity MCP server repository is for using Perplexity APIs from MCP clients; it is not the same as making Perplexity connect to LocalBridge.

Stop condition:
If the user does not already have a reachable LocalBridge remote MCP URL, stop before asking for Perplexity connector secrets.

Next step:
Confirm whether your Perplexity account/workspace has custom connector access and whether you already have a reachable LocalBridge remote MCP URL. Do not paste secrets.
```

## Gemini Apps

Use when the user says: Gemini Apps, Gemini web, Gemini custom connected app.

```text
Platform: Gemini Apps
Current LocalBridge status: Protocol-compatible target, not yet qualified here.

What this platform expects:
- A Gemini feature surface that supports custom connected apps
- A custom MCP server URL
- Google account permission or connected-app authorization

Where to create or configure it:
- Gemini Apps custom connected apps: https://support.google.com/gemini/answer/17209137
- Gemini Connected Apps management: https://support.google.com/gemini/answer/13695044

Credential handling:
- Gemini Apps custom connected app setup may rely on Google account authorization rather than a user-created API key.
- The MCP server itself should still require authentication if it exposes LocalBridge tools.
- Do not paste OAuth secrets or gateway bearer tokens into chat.

What LocalBridge currently provides:
- LocalBridge v0.2.1 does not yet provide a Gemini Apps-qualified remote gateway.
- OpenAI tunnel IDs are not Gemini connected-app URLs.

Stop condition:
If the user does not already have a reachable LocalBridge MCP URL, stop before asking for connected-app credentials.

Next step:
Confirm whether your Gemini account supports custom connected apps and whether you already have a reachable LocalBridge MCP URL. Provide only non-secret URLs.
```

## Gemini Enterprise

Use when the user says: Gemini Enterprise, Google Cloud Gemini Enterprise, custom MCP server data store.

```text
Platform: Gemini Enterprise
Current LocalBridge status: Protocol-compatible enterprise path, not yet qualified here.

What this platform expects:
- Gemini Enterprise app and admin access
- Custom MCP Server data store creation permission
- Remote MCP endpoint using StreamableHTTP
- TLS certificate signed by a publicly trusted CA
- OAuth client ID and client secret where required
- Organization policy or VPC-SC allowances where applicable

Where to create or configure it:
- Gemini Enterprise custom MCP server data store: https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server
- Gemini Enterprise workflow MCP servers: https://docs.cloud.google.com/gemini/enterprise/docs/workflow-builder/connect-mcp-servers

Credential handling:
- Treat OAuth client secrets, service credentials, enterprise policies, and bearer tokens as secrets.
- Do not paste secrets into chat.
- Use a properly authenticated remote gateway for LocalBridge.

What LocalBridge currently provides:
- LocalBridge v0.2.1 does not yet provide a Gemini Enterprise-qualified StreamableHTTP gateway.
- A local stdio server or OpenAI tunnel is not enough for Gemini Enterprise.

Stop condition:
Stop unless the user has an enterprise admin path and a public-trusted-TLS StreamableHTTP MCP endpoint plan.

Next step:
Confirm the enterprise surface, project/org requirements, TLS endpoint plan, and auth mode. Do not paste secrets.
```

## Mistral Le Chat / Work / Studio

Use when the user says: Mistral, Le Chat, Mistral Work, Mistral Studio, Mistral custom MCP connector.

```text
Platform: Mistral Le Chat / Work / Studio
Current LocalBridge status: Protocol-compatible target, not yet qualified here.

What this platform expects:
- Mistral connector access
- Custom MCP-compatible server URL
- Connector visibility scope
- Administrator setup where required
- API key only for API/Studio automation paths that require it

Where to create or configure it:
- Mistral MCP Connectors docs: https://docs.mistral.ai/vibe/work/connectors/mcp-connectors
- Mistral Studio connectors: https://docs.mistral.ai/studio/connectors
- Mistral connector management: https://docs.mistral.ai/studio/connectors/management
- Mistral connectors announcement: https://mistral.ai/news/connectors/

Credential handling:
- User-facing connector authorization may be separate from Mistral API keys.
- API/Studio automation may require a Mistral API key.
- Do not paste API keys, bearer tokens, or connector secrets into chat.

What LocalBridge currently provides:
- LocalBridge v0.2.1 does not yet provide a Mistral-qualified remote gateway.
- OpenAI tunnel IDs are not Mistral connector URLs.

Stop condition:
If the user does not already have a reachable LocalBridge remote MCP URL, stop before asking for Mistral connector secrets.

Next step:
Confirm whether you are using Le Chat, Work, or Studio, and whether you already have a reachable LocalBridge MCP URL. Provide only non-secret URLs.
```

## GitHub Copilot cloud/app

Use when the user says: GitHub Copilot cloud agent, GitHub Copilot code review, Copilot app/cloud.

```text
Platform: GitHub Copilot cloud/app
Current LocalBridge status: Protocol-compatible narrow path, not yet qualified here.

What this platform expects:
- Repository-level or app-level MCP configuration
- Supported remote MCP endpoint
- Secrets or variables using the naming conventions required by Copilot configuration
- Read-only tools for code review scenarios

Where to create or configure it:
- Configure MCP servers for a repository: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers
- About MCP in GitHub Copilot: https://docs.github.com/en/copilot/concepts/context/mcp

Credential handling:
- Use GitHub repository/app secrets or variables as documented by GitHub.
- Do not paste repository secrets, PATs, bearer tokens, or connector secrets into chat.
- Do not expose write-capable shell tools to code review without a strict read-only LocalBridge profile.

What LocalBridge currently provides:
- LocalBridge v0.2.1 does not yet provide a Copilot-qualified remote gateway.
- This is a repository/cloud-agent integration path, not a general chat platform setup.

Stop condition:
Stop unless the user has a supported remote endpoint and an appropriate read-only or constrained LocalBridge profile.

Next step:
Confirm whether this is Copilot coding agent or Copilot code review, and whether you already have a remote MCP URL plus a safe tool profile.
```

## Kimi web

Use when the user says: Kimi web, Kimi plugins, Kimi Work.

```text
Platform: Kimi web
Current LocalBridge status: Research-only / not yet install-qualified here.

What this platform expects:
- Kimi plugin support on the target surface
- Plugin or package definition that can declare MCP servers
- Exact Kimi surface documentation for the user's account or workspace

Where to create or configure it:
- Kimi plugins overview: https://www.kimi.com/en/help/plugins-and-skills/overview
- Kimi plugin overview, Traditional Chinese: https://www.kimi.ai/zh-hant/help/plugins-and-skills/overview
- Kimi Code plugin docs: https://www.kimi.com/code/docs/en/kimi-code-cli/customization/plugins
- Kimi Code MCP docs: https://www.kimi.com/code/docs/en/kimi-code-cli/customization/mcp.html

Credential handling:
- Kimi Code CLI docs are local developer-surface docs and do not prove Kimi web supports arbitrary remote LocalBridge MCP installs.
- Do not paste plugin secrets, bearer tokens, or API keys into chat.

What LocalBridge currently provides:
- LocalBridge does not currently claim a Kimi web install flow.

Stop condition:
Do not proceed as if Kimi web is supported unless the user provides official Kimi web custom MCP connector documentation for arbitrary remote MCP servers.

Next step:
Ask the user for the exact Kimi surface and official docs they want to use. Do not run local Kimi Code instructions unless the user explicitly switches to Kimi Code.
```

## Not claimed platforms

Use for: Poe, MiniMax chat/web, DeepSeek web, You.com chat, unknown platforms without official arbitrary remote MCP connector docs.

```text
Platform: <selected platform>
Current LocalBridge status: Not claimed.

What this platform expects:
- Not enough official evidence has been verified to claim that this online product can connect to an arbitrary user-provided LocalBridge MCP server.

Where to create or configure it:
- No LocalBridge-supported setup link is currently documented for this platform.

Credential handling:
- Do not ask for API keys, tokens, or secrets yet.
- Do not ask the user to expose LocalBridge publicly.

What LocalBridge currently provides:
- No supported or protocol-compatible install path is currently claimed for this platform.

Stop condition:
Stop before installation.

Next step:
Please provide official documentation showing that this platform can connect to an arbitrary custom remote MCP server. I will review that documentation before suggesting any LocalBridge setup path.
```
