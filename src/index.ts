import os from 'node:os';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { configManager } from './config-manager.js';
import { createDanielCommanderServer } from './mcp/server.js';

try {
  process.cwd();
} catch {
  process.chdir(os.homedir());
  console.error(`Daniel Commander recovered invalid working directory -> ${process.cwd()}`);
}

await configManager.init();
console.error('Daniel Commander MCP ready on stdio');
serveStdio(() => createDanielCommanderServer());
