import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { configManager } from '../config-manager.js';

function expandHome(input: string): string {
  return input === '~' ? os.homedir() : input.startsWith('~/') ? path.join(os.homedir(), input.slice(2)) : input;
}

function isWithin(candidate: string, root: string): boolean {
  const rel = path.relative(root, candidate);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}

async function canonicalForAccess(input: string, forCreate = false): Promise<string> {
  const absolute = path.resolve(expandHome(input));
  const cfg = await configManager.getConfig();
  if (cfg.allowedDirectories.length === 0) throw new Error('No allowed directories configured');

  let canonical = absolute;
  try {
    canonical = await fs.realpath(absolute);
  } catch (error: any) {
    if (!forCreate || error?.code !== 'ENOENT') throw error;
    let probe = absolute;
    const missing: string[] = [];
    while (true) {
      try {
        const existing = await fs.realpath(probe);
        canonical = path.join(existing, ...missing.reverse());
        break;
      } catch (parentError: any) {
        if (parentError?.code !== 'ENOENT') throw parentError;
        const parent = path.dirname(probe);
        if (parent === probe) throw parentError;
        missing.push(path.basename(probe));
        probe = parent;
      }
    }
  }

  const roots = await Promise.all(cfg.allowedDirectories.map(async r => {
    const abs = path.resolve(expandHome(r));
    try { return await fs.realpath(abs); } catch { return abs; }
  }));

  if (!roots.some(root => isWithin(canonical, root))) {
    throw new Error(`Path is outside allowed directories: ${input}`);
  }
  return canonical;
}

export async function validatePath(input: string, forCreate = false): Promise<string> {
  return canonicalForAccess(input, forCreate);
}

export async function readFile(filePath: string, offset = 0, length?: number): Promise<string> {
  const file = await canonicalForAccess(filePath);
  const cfg = await configManager.getConfig();
  const data = await fs.readFile(file);
  if (data.subarray(0, Math.min(data.length, 8192)).includes(0)) {
    throw new Error('Binary files are not supported by the Daniel text core');
  }
  const lines = data.toString('utf8').split(/\r?\n/);
  const max = length ?? cfg.fileReadLineLimit;
  if (offset < 0) return lines.slice(Math.max(0, lines.length + offset)).join('\n');
  return lines.slice(offset, offset + max).join('\n');
}

export async function writeFile(filePath: string, content: string, mode: 'rewrite' | 'append' = 'rewrite'): Promise<void> {
  const file = await canonicalForAccess(filePath, true);
  await fs.mkdir(path.dirname(file), { recursive: true });
  if (mode === 'append') await fs.appendFile(file, content, 'utf8');
  else await fs.writeFile(file, content, { encoding: 'utf8', mode: 0o600 });
}

export async function listDirectory(dirPath: string): Promise<Array<{ name: string; type: 'file' | 'directory' | 'other' }>> {
  const dir = await canonicalForAccess(dirPath);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.map(e => ({
    name: e.name,
    type: e.isFile() ? 'file' : e.isDirectory() ? 'directory' : 'other'
  }));
}

export async function createDirectory(dirPath: string): Promise<void> {
  const dir = await canonicalForAccess(dirPath, true);
  await fs.mkdir(dir, { recursive: true });
}

export async function moveFile(source: string, destination: string): Promise<void> {
  const src = await canonicalForAccess(source);
  const dst = await canonicalForAccess(destination, true);
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.rename(src, dst);
}

export async function getFileInfo(filePath: string): Promise<{
  path: string;
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  modified: Date;
}> {
  const file = await canonicalForAccess(filePath);
  const st = await fs.stat(file);
  return {
    path: file,
    size: st.size,
    isFile: st.isFile(),
    isDirectory: st.isDirectory(),
    modified: st.mtime
  };
}
