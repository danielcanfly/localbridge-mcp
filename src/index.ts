import os from 'node:os';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { configManager } from './config-manager.js';
import { createLocalBridgeMCPServer } from './mcp/server.js';

try {
  process.cwd();
} catch {
  process.chdir(os.homedir());
  console.error(`LocalBridge MCP recovered invalid working directory -> ${process.cwd()}`);
}

await configManager.init();
console.error('LocalBridge MCP ready on stdio');
serveStdio(() => createLocalBridgeMCPServer());
