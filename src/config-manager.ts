import fs from 'node:fs/promises';
import path from 'node:path';
import { CONFIG_FILE } from './config.js';

export interface ServerConfig {
  blockedCommands: string[];
  defaultShell: string;
  allowedDirectories: string[];
  fileReadLineLimit: number;
  fileWriteLineLimit: number;
}

function defaultShell(): string {
  if (process.platform === 'win32') return 'powershell.exe';
  return process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/sh');
}

function defaults(): ServerConfig {
  return {
    blockedCommands: [
      'mkfs', 'format', 'mount', 'umount', 'fdisk', 'dd', 'parted', 'diskpart',
      'sudo', 'su', 'passwd', 'adduser', 'useradd', 'usermod', 'groupadd', 'chsh', 'visudo',
      'shutdown', 'reboot', 'halt', 'poweroff', 'init',
      'iptables', 'firewall', 'netsh', 'sfc', 'bcdedit', 'reg', 'net', 'sc', 'runas', 'cipher', 'takeown'
    ],
    defaultShell: defaultShell(),
    allowedDirectories: [],
    fileReadLineLimit: 1000,
    fileWriteLineLimit: 2000
  };
}

class ConfigManager {
  private config: ServerConfig | null = null;

  async init(): Promise<void> {
    if (this.config) return;
    try {
      const parsed = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8')) as Partial<ServerConfig>;
      this.config = { ...defaults(), ...parsed };
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
      this.config = defaults();
      await this.persist();
    }
  }

  private async persist(): Promise<void> {
    if (!this.config) return;
    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
    const tmp = `${CONFIG_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.config, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
    await fs.rename(tmp, CONFIG_FILE);
  }

  async getConfig(): Promise<ServerConfig> {
    await this.init();
    return structuredClone(this.config!);
  }

  async getValue<K extends keyof ServerConfig>(key: K): Promise<ServerConfig[K]> {
    await this.init();
    return this.config![key];
  }

  async setValue<K extends keyof ServerConfig>(key: K, value: ServerConfig[K]): Promise<void> {
    await this.init();
    this.config![key] = value;
    await this.persist();
  }

  async updateConfig(updates: Partial<ServerConfig>): Promise<ServerConfig> {
    await this.init();
    this.config = { ...this.config!, ...updates };
    await this.persist();
    return this.getConfig();
  }

  async resetConfig(): Promise<ServerConfig> {
    this.config = defaults();
    await this.persist();
    return this.getConfig();
  }
}

export const configManager = new ConfigManager();
