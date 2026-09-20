# Online platform setup flow reference

This guide records the practical setup flow an AI assistant should give after a user names an online platform.

It is a flow reference, not an end-to-end qualification claim. Use the status language from `docs/ONLINE_PLATFORMS.md` and the exact wording guardrails from `assistant-response-templates.md`.

## Universal flow rules

1. Ask the target online platform first.
2. Show platform setup links before asking for values.
3. Tell the user where the platform UI normally creates or configures the connector.
4. Distinguish vendor credentials from LocalBridge gateway credentials.
5. Do not ask the user to paste secrets into chat.
6. Do not reuse OpenAI Secure MCP Tunnel IDs for non-OpenAI platforms.
7. Do not expose shell-capable LocalBridge tools over an unauthenticated public MCP URL.
8. If a platform needs a remote MCP URL and the user only has local LocalBridge, stop and explain that a gateway, tunnel, or adapter is still missing.
9. Do not promise that any key, connector, tunnel, tool call, or platform feature is free.

## ChatGPT / OpenAI Secure MCP Tunnel

Status: **Qualified** for the macOS persistent runtime path.

### UI path

1. Open `https://chatgpt.com/plugins`.
2. Ensure Developer Mode is enabled.
3. When Developer Mode is enabled, a `+` button appears next to the plugin search box.
4. Click `+` to open the new developer-mode app form.
5. Fill the form:
   - Icon: optional; PNG only; the UI recommends 256 x 256 px and a small file.
   - Name: `LocalBridge MCP`.
   - Description: `Self-hosted MCP bridge for local files, search, editing, shell sessions, Git, and SSH.`
   - Connection: choose `Tunnel` / `通道`, not Server URL.
   - Available tunnel: choose `localbridge-mcp (tunnel_...)` or the user's matching tunnel entry.
   - Authentication: choose `None` / `No authentication` / `無` if available. Do not choose OAuth for the current LocalBridge stdio-over-tunnel path.
   - Advanced OAuth settings: leave unset for the current LocalBridge stdio-over-tunnel path.
   - Risk acknowledgement: the user must explicitly acknowledge the warning before continuing.
6. Save or create the app.
7. Start a new chat, enable the new app, and run a read-only smoke test first.

### Why authentication should be None for the current LocalBridge path

The OpenAI tunnel carries requests from ChatGPT to the local `tunnel-client`, which forwards them to a local stdio MCP server. The current LocalBridge runtime does not expose OAuth metadata URLs through the stdio target. If the ChatGPT app form is set to OAuth, ChatGPT may look for OAuth discovery or authorization settings that LocalBridge does not provide in this path.

Use OAuth only if a future LocalBridge gateway intentionally exposes OAuth metadata and an authorization flow.

### Read-only smoke test

After the app is created, ask the user to open a new ChatGPT conversation and run:

```text
Use LocalBridge MCP only for read-only inspection. Do not modify anything. List the files in /Users/<username>/Documents/GitHub/localbridge-mcp.
```

If tool discovery or invocation fails, check local service health first:

```bash
cd /Users/<username>/Documents/GitHub/localbridge-mcp
./scripts/macos-service.sh status
/opt/homebrew/bin/tunnel-client doctor \
  --profile localbridge-prod \
  --profile-dir "$HOME/.config/tunnel-client" \
  --health.listen-addr 127.0.0.1:0
```

Do not rerun the installer when `HEALTH=ok`, `READY=ok`, and `tunnel-client doctor` returns `RESULT ok`. Treat remaining failures as app binding, tool permission, or ChatGPT UI issues.

## Claude.ai / Claude custom connector

Status: **Protocol-compatible target, not yet LocalBridge-qualified here.**

### Platform flow

1. Open Claude connector settings or the custom connector flow documented by Claude.
2. Add a custom connector using a remote MCP server URL.
3. If the connector requires OAuth, configure the OAuth client settings required by Claude and the MCP server.
4. Complete the user sign-in and permission grant in Claude.
5. Test with a low-risk read-only tool first.

### LocalBridge implication

Claude connects from Anthropic's cloud infrastructure to a remote MCP server. A local stdio LocalBridge server is not enough. LocalBridge needs a Claude-reachable remote gateway or an Anthropic tunnel path before Claude can call it.

### Stop condition

If the user does not already have a Claude-reachable LocalBridge MCP URL or a Claude-compatible gateway, stop before asking for OAuth secrets or connector values.

## Claude MCP tunnels

Status: **Protocol-compatible research path, not yet LocalBridge-qualified here.**

### Platform flow

1. Open Claude Console.
2. Use the MCP tunnels area if it is available to the user's account.
3. Create or configure a tunnel and collect the non-secret tunnel domain/identifier.
4. Keep tunnel tokens, CA material, and client secrets out of chat.
5. Configure a local/private MCP server behind the Claude tunnel agent.
6. Test with a read-only tool.

### LocalBridge implication

This is not the OpenAI Secure MCP Tunnel. OpenAI tunnel IDs and runtime keys are not Claude tunnel credentials.

### Stop condition

Stop if the user does not have Claude MCP tunnel access or the required Anthropic tunnel setup material.

## Grok

Status: **Protocol-compatible target, not yet LocalBridge-qualified here.**

### Platform flow

1. For Grok web, sign in and use the `+` button / Connectors entry, then choose add connector when available.
2. For Grok Business or Enterprise, an admin may need to open the xAI console, choose the team, then navigate to Grok Business → Connectors.
3. Add a custom MCP connector.
4. Provide a public or privately reachable MCP server URL.
5. If the server is local, expose it through a tunneling service or another reachable endpoint.
6. Configure any server-side auth required by the MCP server.
7. Test read-only tools first.

### LocalBridge implication

Grok needs a URL reachable by Grok's servers. LocalBridge v0.2.1 does not yet ship a Grok-qualified remote gateway. Do not put an OpenAI tunnel ID into Grok.

### Stop condition

If the user only has local LocalBridge and no Grok-reachable MCP URL, stop before asking for bearer tokens or gateway secrets.

## Perplexity

Status: **Protocol-compatible target, not yet LocalBridge-qualified here.**

### Platform flow

1. Use Perplexity's custom connector / Bring Your Own Connector flow if available on the user's plan or workspace.
2. Add a custom remote connector.
3. Provide the MCP server URL.
4. Choose the connector auth mode required by the server: OAuth, API key, bearer token, or open authentication.
5. For LocalBridge, do not use open authentication because LocalBridge can expose shell-capable tools.
6. Test read-only tools first.

### LocalBridge implication

Perplexity expects a remote MCP URL. LocalBridge v0.2.1 does not yet provide a Perplexity-qualified remote gateway.

### Stop condition

If the user does not have a Perplexity-reachable LocalBridge MCP URL, stop before asking for connector secrets.

## Gemini Apps

Status: **Protocol-compatible target, not yet LocalBridge-qualified here.**

### Platform flow

1. Open Gemini web app settings.
2. Open Connected Apps.
3. Add or connect a custom app by linking an MCP server URL.
4. Complete Google account permission or connected-app authorization if prompted.
5. Test with a low-risk read-only tool.

### LocalBridge implication

Gemini Apps expects a custom app MCP server URL. It may not require the user to create a traditional API key, but the MCP server should still require authentication if it exposes LocalBridge tools.

### Stop condition

If the user does not have a Gemini-reachable LocalBridge MCP URL, stop before asking for connected-app credentials.

## Gemini Enterprise

Status: **Protocol-compatible enterprise path, not yet LocalBridge-qualified here.**

### Platform flow

1. Open Gemini Enterprise admin / data source setup.
2. Create a custom MCP server data store.
3. Use a remote MCP endpoint that supports StreamableHTTP.
4. Use TLS with a publicly trusted certificate.
5. Configure OAuth details where required, such as client ID, client secret, authorization URL, token URL, and scopes.
6. Ensure organization policy or VPC-SC configuration allows the custom MCP source where applicable.
7. Test with read-only actions first.

### LocalBridge implication

A local stdio server and an OpenAI tunnel are not enough for Gemini Enterprise. LocalBridge needs a StreamableHTTP remote gateway with trusted TLS and enterprise-compatible auth.

### Stop condition

Stop unless the user has enterprise admin access and a public-trusted-TLS StreamableHTTP MCP endpoint plan.

## Mistral Le Chat / Work / Studio

Status: **Protocol-compatible target, not yet LocalBridge-qualified here.**

### Platform flow

1. Open Mistral Work, Le Chat, or Studio connector management depending on the user's surface.
2. Add a connector from the directory or register a custom MCP connector.
3. For custom connectors, provide a name, MCP server URL, and visibility scope.
4. Configure any server-side auth or API key required by the MCP server or Studio automation path.
5. Validate or debug the connector in Studio when available.
6. Use the connector in a conversation, agent, workflow, or API call where supported.
7. Test read-only tools first.

### LocalBridge implication

Mistral expects an MCP-compatible server URL. LocalBridge v0.2.1 does not yet provide a Mistral-qualified remote gateway.

### Stop condition

If the user does not have a Mistral-reachable LocalBridge MCP URL, stop before asking for connector secrets.

## GitHub Copilot cloud/app

Status: **Protocol-compatible narrow path, not yet LocalBridge-qualified here.**

### Platform flow

1. Open the target GitHub repository or app configuration.
2. Configure MCP servers for Copilot cloud agent or Copilot code review, not a general chat connector.
3. Add a supported remote MCP endpoint.
4. Add required secrets or variables using GitHub's documented naming rules, such as `COPILOT_MCP_...` where applicable.
5. Avoid OAuth-based remote MCP servers for Copilot cloud agent/code review where GitHub documents that OAuth is not currently supported.
6. Use a read-only or heavily constrained tool profile for code review.

### LocalBridge implication

Copilot cloud/app integration is repository/cloud-agent oriented. Do not expose write-capable shell tools to code review without a strict read-only LocalBridge profile.

### Stop condition

Stop unless the user has a supported remote endpoint and an appropriate read-only or constrained LocalBridge profile.

## Kimi web

Status: **Research-only / not yet install-qualified here.**

### Platform flow

1. Confirm the exact Kimi surface: Kimi Web, Kimi Work, or Kimi Code.
2. For Kimi web/plugin paths, use Kimi's plugin builder or plugin marketplace when available.
3. Kimi documentation says plugins can include MCP and Skills, but this repository does not yet claim a complete arbitrary-remote-LocalBridge setup for Kimi Web.
4. Kimi Code CLI MCP docs are local developer-surface docs; do not use them as proof that Kimi Web can connect to arbitrary remote LocalBridge MCP.
5. Ask for official Kimi web/plugin documentation for the exact target surface before proceeding.

### LocalBridge implication

Kimi may support MCP inside plugins, but LocalBridge needs a Kimi-compatible plugin/package and a secure remote MCP endpoint before any install flow can be claimed.

### Stop condition

Stop unless the user provides official Kimi web/plugin documentation showing arbitrary custom remote MCP server support for the intended surface.

## Not claimed platforms

Use for Poe, MiniMax chat/web, DeepSeek web, You.com consumer chat, or any platform where official docs do not show arbitrary user-provided remote MCP server support.

### Flow

1. Do not ask for keys or tokens.
2. Do not ask the user to expose LocalBridge publicly.
3. Ask for official custom remote MCP connector documentation.
4. Review the docs before suggesting any LocalBridge setup path.
