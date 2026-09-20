# ChatGPT UI gates for Secure MCP Tunnel

This guide covers the final ChatGPT-side gate after LocalBridge MCP and `tunnel-client` are already healthy.

A healthy local install is not enough by itself. ChatGPT must also expose the developer-mode app creation surface that can select an OpenAI Secure MCP Tunnel.

## Correct ChatGPT-side entry point

The currently verified ChatGPT web path is:

```text
https://chatgpt.com/plugins
```

Then:

1. Enable Developer Mode / 開發者模式.
2. Return to the Plugins / 外掛程式 page.
3. When Developer Mode is enabled, a `+` button appears next to the plugin search box.
4. Click the `+` button.
5. The `New plugin` / `新外掛程式` form opens.
6. Choose `Tunnel` / `通道` under Connection / 連線.
7. Select the available tunnel, for example `localbridge-mcp (tunnel_...)`.

Do not send users only to `chatgpt.com/#settings/Connectors` if they need to create a developer-mode MCP app. The practical creation surface is the Plugins page with Developer Mode enabled and the `+` button visible.

## Fill the ChatGPT new-plugin form for LocalBridge

Use these values for the current LocalBridge stdio-over-OpenAI-tunnel path:

```text
Icon:
Optional. PNG only. 256 x 256 px is recommended by the UI. Keep it small.

Name:
LocalBridge MCP

Description:
Self-hosted MCP bridge for local files, search, editing, shell sessions, Git, and SSH.

Connection / 連線:
Tunnel / 通道

Available tunnel / 可用通道:
Select the matching LocalBridge tunnel, for example:
localbridge-mcp (tunnel_...)

Authentication / 驗證:
None / No authentication / 無, if available.

Advanced OAuth settings / 進階 OAuth 設定:
Leave unset for the current LocalBridge stdio-over-tunnel path.

Risk acknowledgement:
The user must check the acknowledgement box before saving.
```

Do **not** select OAuth for the current LocalBridge path unless a future LocalBridge gateway intentionally exposes OAuth metadata and an OAuth authorization flow. The current LocalBridge tunnel target is a local stdio MCP server; `tunnel-client doctor` can legitimately report OAuth metadata as skipped for stdio targets.

## Expected ChatGPT-side surface

OpenAI's Secure MCP Tunnel documentation says to connect from ChatGPT by going to ChatGPT Plugins, selecting the plus button to create a developer-mode app, choosing Tunnel under Connection, and then selecting an available tunnel or pasting a valid `tunnel_id`.

OpenAI's developer-mode Help Center article also says custom app creation can be under Workspace settings or user settings, depending on plan and workspace. It describes paths such as Workspace settings > Apps > Create and user settings > Apps > Create, and also describes developer mode as a workspace permission.

If the user only sees the general installed-plugins/extensions management list and does not see a plus button, developer-mode app creation, Apps > Create, or a Tunnel connection type, stop. Do not tell the user to paste a tunnel ID into a field that is not present.

## Important UI distinction

Do not confuse these surfaces:

- **`https://chatgpt.com/plugins` with Developer Mode enabled**: this is the verified path where the plugin search box can show a `+` button for creating a developer-mode app.
- **Settings > Security and login > Developer mode toggle**: this confirms developer mode is enabled for the user account or workspace surface that exposes the toggle. It is not the app creation screen by itself.
- **Settings > Plugins / Extensions > general installed app list**: this lists installed or browsable apps/connectors. It may not show app creation.
- **Settings > Plugins / Extensions > Developer mode row**: if visible, this may be only a shortcut to the Security and login developer-mode toggle. If clicking it redirects to Security and login, treat it as a toggle shortcut, not an app creation surface.
- **Settings search for Apps / 應用程式 / Create / 建立**: this is another place to check when the plugin page does not show `+`.
- **User settings or Workspace settings > Apps > Create**: OpenAI Help Center describes this as an app creation path when the workspace exposes it.
- **OpenAI Platform tunnel edit page**: this verifies the tunnel exists and can be associated with an organization/workspace. It is not the ChatGPT app creation screen.

If the user has developer mode enabled and the Platform tunnel is associated with the only available ChatGPT workspace, but the ChatGPT UI still does not show app creation or Tunnel connection, treat the remaining blocker as a ChatGPT UI rollout/workspace surface issue, not a LocalBridge installation failure.

## Common reasons the Tunnel UI is missing

Check these in order:

1. **Wrong page**: The user may be looking at settings instead of `https://chatgpt.com/plugins`.
2. **Developer mode not enabled**: The `+` button next to plugin search may only appear after Developer Mode is enabled.
3. **Developer-mode row is only a toggle shortcut**: If the Plugins / Extensions page contains a Developer mode row but it redirects to Security and login, stop treating it as the app creation path.
4. **Apps > Create is not exposed**: Search Settings for Apps, 應用程式, Create, 建立, MCP, connector, or 連接器. If no app creation surface appears, do not invent one.
5. **Plan or workspace does not expose full MCP app creation**: OpenAI Help Center states that full MCP support is rolling out in beta to Business, Enterprise, and Edu. Pro users can build apps using Apps SDK and connect MCPs with read/fetch permissions in developer mode; UI availability may vary. Do not assume Plus, Pro, Business, Enterprise, or a personal workspace has the same UI.
6. **Workspace mismatch**: The tunnel may be associated only with a Platform organization and not with the target ChatGPT workspace.
7. **Permission mismatch**: The app creator may have Tunnels Read but not Tunnels Use.
8. **Propagation delay**: New tunnel role assignments may take time to propagate.
9. **Existing developer-mode app should be edited instead of created**: If the user previously created a successful test app, ask them to look for that developer app definition and edit its connection rather than creating a new one.

## What the assistant should say when the UI is missing

Use this response shape:

```text
The local install is healthy, but the ChatGPT app creation UI is not visible yet.

First open https://chatgpt.com/plugins with Developer Mode enabled. Look next to the plugin search box for a `+` button. That plus button opens the New plugin / 新外掛程式 form where Connection can be set to Tunnel / 通道.

If there is no `+` button:
1. Confirm Developer Mode is enabled.
2. Refresh the page or sign out and back in.
3. Search settings for Apps, 應用程式, Create, 建立, MCP, connector, or 連接器.
4. If you previously created a successful developer-mode test app, look for that app definition or draft and edit it instead of creating a new one.
5. Confirm the tunnel is associated with the same ChatGPT workspace, not only the Platform organization.
6. Confirm your user has Tunnels Read + Use in the Platform organization.
7. If no Create / plus / Tunnel surface exists after those checks, treat this as a ChatGPT workspace/UI availability issue and stop before reinstalling LocalBridge.

Do not reinstall LocalBridge yet. The local runtime is already healthy. The missing piece is the ChatGPT-side app creation UI or workspace permission.
```

## Do not overclaim

Do not say that every ChatGPT user will see the Tunnel option. UI availability depends on plan, workspace, developer-mode access, permissions, and rollout state.

Do not claim the user can finish ChatGPT UI setup from the general plugins list or developer-mode toggle page if there is no create button or Tunnel connection type visible.

Do not assume the problem is plan level if the user shows developer mode enabled and previously created successful test apps. First check whether the user is on the wrong settings subpage, whether `https://chatgpt.com/plugins` shows the developer-mode `+` button, whether Apps > Create is hidden elsewhere, or whether an existing developer-mode app definition should be edited.

## Local install remains valid

If `scripts/macos-service.sh status` reports `HEALTH=ok` and `READY=ok`, and `tunnel-client doctor` returns `RESULT ok`, do not rerun the whole installation just because the ChatGPT UI is missing. Treat this as a ChatGPT workspace/UI gate, not a LocalBridge runtime failure.
