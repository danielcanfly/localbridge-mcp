# ChatGPT UI gates for Secure MCP Tunnel

This guide covers the final ChatGPT-side gate after LocalBridge MCP and `tunnel-client` are already healthy.

A healthy local install is not enough by itself. ChatGPT must also expose the developer-mode app creation surface that can select an OpenAI Secure MCP Tunnel.

## Expected ChatGPT-side surface

OpenAI's Secure MCP Tunnel documentation says to connect from ChatGPT by going to ChatGPT Plugins, selecting the plus button to create a developer-mode app, choosing Tunnel under Connection, and then selecting an available tunnel or pasting a valid `tunnel_id`.

OpenAI's developer-mode Help Center article also says custom app creation can be under Workspace settings or user settings, depending on plan and workspace. It describes paths such as Workspace settings > Apps > Create and user settings > Apps > Create, and also describes developer mode as a workspace permission.

If the user only sees the general installed-plugins/extensions management list and does not see a plus button, developer-mode app creation, Apps > Create, or a Tunnel connection type, stop. Do not tell the user to paste a tunnel ID into a field that is not present.

## Important UI distinction

Do not confuse these surfaces:

- **Settings > Security and login > Developer mode toggle**: this confirms developer mode is enabled for the user account or workspace surface that exposes the toggle. It is not the app creation screen by itself.
- **Settings > Plugins / Extensions > general installed app list**: this lists installed or browsable apps/connectors. It may not show app creation.
- **Settings > Plugins / Extensions > Developer mode row**: if visible, this is often the next place to inspect for developer-mode apps or app creation. Tell the user to click it before assuming the feature is missing.
- **OpenAI Platform tunnel edit page**: this verifies the tunnel exists and can be associated with an organization/workspace. It is not the ChatGPT app creation screen.

If the user has developer mode enabled and the Platform tunnel is associated with the only available ChatGPT workspace, but the ChatGPT UI still does not show app creation or Tunnel connection, treat the remaining blocker as a ChatGPT UI rollout/workspace surface issue, not a LocalBridge installation failure.

## Common reasons the Tunnel UI is missing

Check these in order:

1. **Wrong page**: The user may be looking at the general plugins/extensions management list rather than the developer-mode app creation surface.
2. **Developer-mode row not opened**: If the Plugins / Extensions page contains a Developer mode row, ask the user to open that row and look for Create, plus, or draft developer apps.
3. **Developer mode not enabled**: ChatGPT developer mode is a separate workspace permission and setting.
4. **Plan or workspace does not expose full MCP app creation**: OpenAI Help Center states that full MCP support is rolling out in beta to Business, Enterprise, and Edu. Pro users can build apps using Apps SDK and connect MCPs with read/fetch permissions in developer mode; UI availability may vary. Do not assume Plus, Pro, Business, Enterprise, or a personal workspace has the same UI.
5. **Workspace mismatch**: The tunnel may be associated only with a Platform organization and not with the target ChatGPT workspace.
6. **Permission mismatch**: The app creator may have Tunnels Read but not Tunnels Use.
7. **Propagation delay**: New tunnel role assignments may take time to propagate.
8. **Existing developer-mode app should be edited instead of created**: If the user previously created a successful test app, ask them to look for that developer app definition and edit its connection rather than creating a new one.

## What the assistant should say when the UI is missing

Use this response shape:

```text
The local install is healthy, but the ChatGPT UI gate is not open yet.

The page you are showing is the installed plugins/extensions management list. I do not see the developer-mode app creation surface, the plus button, Apps > Create, or a Tunnel connection field.

Please check:
1. In Settings > Plugins / Extensions, click the Developer mode / 開發人員模式 row if it is visible.
2. If that row opens developer apps, look for Create, plus, draft apps, or an existing developer-mode app you can edit.
3. Do not use Settings > Security and login > Developer mode as the app creation screen. That page only confirms the toggle.
4. Confirm the tunnel is associated with the same ChatGPT workspace, not only the Platform organization.
5. Confirm your user has Tunnels Read + Use in the Platform organization.
6. If no Create / plus / Tunnel surface exists after those checks, treat this as a ChatGPT workspace/UI availability issue and stop before reinstalling LocalBridge.

Do not reinstall LocalBridge yet. The local runtime is already healthy. The missing piece is the ChatGPT-side developer-mode app UI or workspace permission.
```

## Do not overclaim

Do not say that every ChatGPT user will see the Tunnel option. UI availability depends on plan, workspace, developer-mode access, permissions, and rollout state.

Do not claim the user can finish ChatGPT UI setup from the general plugins list if there is no create button or Tunnel connection type visible.

Do not assume the problem is plan level if the user shows developer mode enabled and previously created successful test apps. First check whether the user is on the wrong settings subpage or needs to open an existing Developer mode row/app definition.

## Local install remains valid

If `scripts/macos-service.sh status` reports `HEALTH=ok` and `READY=ok`, and `tunnel-client doctor` returns `RESULT ok`, do not rerun the whole installation just because the ChatGPT UI is missing. Treat this as a ChatGPT workspace/UI gate, not a LocalBridge runtime failure.
