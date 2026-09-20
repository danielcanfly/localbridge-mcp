# Architecture status

Current preferred path:

ChatGPT -> OpenAI Secure MCP Tunnel -> tunnel-client on the user's machine
-> stdio LocalBridge MCP -> local filesystem/search/edit/terminal -> SSH targets.

Cloudflare + authenticated Streamable HTTP remains the fallback only if the
ChatGPT account cannot execute write-capable tools through Secure MCP Tunnel.

Oracle VM is an SSH target, not the LocalBridge MCP execution host.
