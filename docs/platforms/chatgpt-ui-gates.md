# ChatGPT UI gates for Secure MCP Tunnel

This guide covers the final ChatGPT-side gate after LocalBridge MCP and `tunnel-client` are already healthy.

A healthy local install is not enough by itself. ChatGPT must also expose the developer-mode app creation surface that can select an OpenAI Secure MCP Tunnel.

## Expected ChatGPT-side surface

OpenAI's Secure MCP Tunnel documentation says to connect from ChatGPT by going to ChatGPT Plugins, selecting the plus button to create a developer-mode app, choosing Tunnel under Connection, and then selecting an available tunnel or pasting a valid `tunnel_id`.

If the user only sees the general installed-plugins list and does not see a plus button, developer-mode app creation, or a Tunnel connection type, stop. Do not tell the user to paste a tunnel ID into a field that is not present.

## Common reasons the Tunnel UI is missing

Check these in order:

1. **Wrong page**: The user may be looking at the general plugins/extensions management list rather than the developer-mode app creation surface.
2. **Developer mode not enabled**: ChatGPT developer mode is a separate workspace permission and setting.
3. **Plan or workspace does not expose full MCP app creation**: OpenAI Help Center states that full MCP support is rolling out in beta to Business, Enterprise, and Edu. Pro users can build apps using Apps SDK and connect MCPs with read/fetch permissions in developer mode; UI availability may vary. Do not assume Plus or a personal workspace has the same UI.
4. **Workspace mismatch**: The tunnel may be associated only with a Platform organization and not with the target ChatGPT workspace.
5. **Permission mismatch**: The app creator may have Tunnels Read but not Tunnels Use.
6. **Propagation delay**: New tunnel role assignments may take time to propagate.

## What the assistant should say when the UI is missing

Use this response shape:

```text
The local install is healthy, but the ChatGPT UI gate is not open yet.

The page you are showing is the installed plugins/extensions management list. I do not see the developer-mode app creation surface, the plus button, or a Tunnel connection field.

Please check:
1. Open Settings and look for Developer Mode / 開發人員模式.
2. Enable developer mode if your workspace exposes it.
3. Confirm your ChatGPT plan/workspace supports custom MCP apps or developer-mode apps.
4. Confirm the tunnel is associated with the same ChatGPT workspace, not only the Platform organization.
5. Confirm your user has Tunnels Read + Use in the Platform organization.

Do not reinstall LocalBridge yet. The local runtime is already healthy. The missing piece is the ChatGPT-side developer-mode app UI or workspace permission.
```

## Do not overclaim

Do not say that every ChatGPT user will see the Tunnel option. UI availability depends on plan, workspace, developer-mode access, permissions, and rollout state.

Do not claim the user can finish ChatGPT UI setup from the general plugins list if there is no create button or Tunnel connection type visible.

## Local install remains valid

If `scripts/macos-service.sh status` reports `HEALTH=ok` and `READY=ok`, and `tunnel-client doctor` returns `RESULT ok`, do not rerun the whole installation just because the ChatGPT UI is missing. Treat this as a ChatGPT workspace/UI gate, not a LocalBridge runtime failure.
