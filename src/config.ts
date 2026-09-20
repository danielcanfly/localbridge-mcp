import os from 'node:os';
import path from 'node:path';

export const USER_HOME = os.homedir();
export const CONFIG_DIR =
  process.env.LOCALBRIDGE_MCP_CONFIG_DIR || path.join(USER_HOME, '.config', 'localbridge-mcp');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
export const DEFAULT_COMMAND_TIMEOUT = 3000;
export const MCP_SERVER_VERSION = '0.2.0';
