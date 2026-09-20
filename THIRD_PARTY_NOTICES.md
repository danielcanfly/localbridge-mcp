# Third-party notices

LocalBridge MCP is licensed under the Apache License 2.0. This file preserves required third-party MIT notices for selected upstream-derived execution-core routines.

LocalBridge MCP includes or adapts selected MIT-licensed execution-core routines from the project listed below. Required notices are retained here and in relevant source headers.

## Desktop Commander MCP

- Project: Desktop Commander MCP
- Upstream: https://github.com/wonderwhy-er/DesktopCommanderMCP
- Pinned baseline: `092ce0b841e86455f12e41f4dc36399a7522ecb5`
- License: MIT
- Used for selected local execution-core routines, including terminal session behavior, command policy helpers, process-state detection, fuzzy text matching, ripgrep resolution, and search-session mechanics.

LocalBridge MCP removes upstream product UI, hosted remote-device behavior, telemetry upload paths, analytics/feedback upload paths, office-document integrations, and unrelated marketing/product assets. LocalBridge MCP adds its own MCP surface, fail-closed configuration, macOS Runtime.app, launchd service management, Secure MCP Tunnel deployment path, active-only sleep-prevention lifecycle, release preflight, and qualification matrix.

## Upstream MIT license notice

```text
MIT License

Copyright (c) 2024-2025 Eduard Ruzga and Desktop Commander Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
