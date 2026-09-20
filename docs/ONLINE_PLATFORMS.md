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

Do not begin by assuming ChatGPT. The installation path, credential source, connector URL, auth model, and tunnel model are platform-specific.

## Mandatory assistant behavior

After the user chooses a platform, an AI assistant must use the matching exact template from [docs/platforms/assistant-response-templates.md](platforms/assistant-response-templates.md).

Do **not** only ask for a tunnel ID, key, connector URL, or allowlist. First tell the user where to create or find the platform-specific credential, what permission or auth mode is expected, and what should not be pasted into chat.

Every platform response must include:

```text
Platform: <selected platform>
Current LocalBridge status: <Qualified / Protocol-compatible / Research-only / Not claimed>
What this platform expects: <OpenAI tunnel / remote MCP URL / OAuth / API key / bearer token / connected app / enterprise data store>
Where to create or configure it:
- <official setup URL 1>
- <official setup URL 2>
Credential handling:
- <what key/token/OAuth/client setting is needed, if any>
- <whether the user should avoid pasting secrets into chat>
What LocalBridge currently provides:
- <qualified OpenAI tunnel path / needs remote gateway / not claimed>
Stop condition:
- <when the assistant must stop before asking for secrets or installing>
Next step:
- <what the user should prepare or confirm>
```

If the selected platform is ChatGPT / OpenAI, always show the OpenAI Tunnels and Runtime API key links before asking for `Tunnel ID` or `Tunnels-only Runtime API key` readiness.

If the selected platform is not OpenAI, do not run the OpenAI-specific installer. Explain that most non-OpenAI online platforms expect a reachable remote MCP URL and that LocalBridge needs a platform-compatible gateway, tunnel, or adapter before the platform can connect.

Do not promise that any vendor key, tunnel, connector, tool call, or platform feature is free. Use cautious billing language and tell users to check the vendor's current billing policy.

## Compatibility language

Use these terms consistently:

- **Qualified**: tested by this repository's release and setup scripts.
- **Protocol-compatible target**: the platform documents support for custom remote MCP servers, but this repository has not yet qualified a setup flow for it.
- **Research-only / not claimed**: official docs were not sufficient to claim that the online product can connect to an arbitrary user-provided MCP server.
- **Out of scope**: local IDE, local CLI, or desktop-only MCP clients. LocalBridge may work with them, but this repository's online-platform installation docs do not target them.

## Current status

| Online platform | Status | What the user needs | Guide |
| --- | --- | --- | --- |
| ChatGPT / OpenAI | **Qualified** | OpenAI Secure MCP Tunnel ID, OpenAI runtime API key with Tunnels permission, `tunnel-client`, local allowlist | Use the ChatGPT/OpenAI template. |
| Claude.ai / Claude custom connectors | **Protocol-compatible target, not yet qualified here** | Remote MCP server URL, usually OAuth or connector auth | Use the Claude custom connector template. |
| Claude MCP tunnels | **Protocol-compatible research path** | Claude Console tunnel access, tunnel token/domain/CA material | Use the Claude MCP tunnels template. |
| Grok | **Protocol-compatible target, not yet qualified here** | Custom MCP connector URL and server auth if any | Use the Grok template. |
| Perplexity | **Protocol-compatible target, not yet qualified here** | Custom remote MCP connector URL and OAuth/API-key/bearer/open auth mode | Use the Perplexity template. |
| Gemini Apps | **Protocol-compatible target, not yet qualified here** | Custom connected app MCP server URL and Google account authorization | Use the Gemini Apps template. |
| Gemini Enterprise | **Protocol-compatible enterprise path, not yet qualified here** | StreamableHTTP endpoint, publicly trusted TLS, OAuth/client settings where required | Use the Gemini Enterprise template. |
| Mistral Le Chat / Work / Studio | **Protocol-compatible target, not yet qualified here** | Custom MCP connector server URL, visibility/admin settings, API key only where required | Use the Mistral template. |
| GitHub Copilot cloud/app | **Protocol-compatible narrow path, not yet qualified here** | Repository/app MCP configuration, remote MCP endpoint, GitHub secrets/variables | Use the Copilot template. |
| Kimi web | **Research-only, not yet install-qualified here** | Kimi plugin/package path that can declare MCP servers | Use the Kimi web template and stop unless official web connector docs are available. |
| Poe | **Not claimed** | N/A | Use the not-claimed template. |
| MiniMax chat/web | **Not claimed** | N/A | Use the not-claimed template. |
| DeepSeek web | **Not claimed** | N/A | Use the not-claimed template. |
| You.com chat | **Not claimed as an MCP client** | N/A | Use the not-claimed template. |

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

The canonical per-platform setup links and exact response templates now live in [docs/platforms/assistant-response-templates.md](platforms/assistant-response-templates.md).

For more prose explanation, see [docs/platforms/protocol-compatible-guides.md](platforms/protocol-compatible-guides.md).

## Recommended assistant response flow

When an AI assistant is asked to install LocalBridge MCP, it should first say:

```text
Which online platform are you connecting LocalBridge MCP to?

The qualified path is ChatGPT / OpenAI Secure MCP Tunnel. Other online platforms may support custom remote MCP servers, but they need a platform-specific remote URL, tunnel, gateway, or adapter path. I will choose commands only after you confirm the platform.
```

Then:

- If the user chooses **ChatGPT / OpenAI**, use the ChatGPT/OpenAI exact template, show the OpenAI setup links, then follow `docs/INSTALL_MACOS.md`.
- If the user chooses **Claude, Grok, Perplexity, Gemini, Mistral, GitHub Copilot cloud/app, or Kimi web**, use the matching exact template, show the platform setup links first, explain the expected connector URL/auth model, and stop if the user does not already have a reachable LocalBridge remote MCP URL or gateway.
- If the user chooses **Poe, MiniMax chat/web, DeepSeek web, You.com chat, or another unverified platform**, use the not-claimed template and ask for official custom MCP connector documentation before proceeding.
