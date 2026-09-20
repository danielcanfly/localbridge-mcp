# Online platform guides

Start with [protocol-compatible-guides.md](protocol-compatible-guides.md), then use [assistant-response-templates.md](assistant-response-templates.md) for exact per-platform responses and [platform-flow-reference.md](platform-flow-reference.md) for step-by-step platform UI flows.

For ChatGPT / OpenAI, also read [chatgpt-ui-gates.md](chatgpt-ui-gates.md) before telling a user to create or bind a Tunnel connector in ChatGPT. The verified creation path is `https://chatgpt.com/plugins`: enable Developer Mode, then use the `+` button next to plugin search to open the `New plugin` form, choose `Tunnel` / `通道`, select the LocalBridge tunnel, and use `None` / no authentication for the current LocalBridge stdio-over-tunnel path.

These guides route online-platform installs by target platform and document:

- platform status: qualified, protocol-compatible, research-only, or not claimed;
- where users create platform credentials, connector URLs, tunnels, OAuth configuration, or enterprise data-store settings;
- whether the platform expects a vendor key, OAuth flow, bearer token, connected app, tunnel token, or no user-created key;
- whether LocalBridge currently provides a compatible transport for that platform;
- what an AI session should say and do after the user names the target platform;
- exact response templates that prevent the assistant from asking for secrets before showing setup links;
- step-by-step platform UI flows for ChatGPT/OpenAI, Claude, Grok, Perplexity, Gemini, Mistral, GitHub Copilot, and Kimi;
- ChatGPT UI gates, including developer-mode app creation visibility, workspace association, and Tunnels Read + Use permissions.

The currently qualified path is ChatGPT / OpenAI Secure MCP Tunnel on macOS. Other online platforms are documented as protocol-compatible or research-only unless a full end-to-end qualification exists.
