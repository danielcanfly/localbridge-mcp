import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Never exposed through MCP. Fixture-only, admin-injected recipes.
 * There is NO general purpose command_line/argv/env from an MCP request.
 * No claim of OS process sandbox, network prevention or client identity.
 */
export interface ScopedFixtureRecipe {
  readonly binary: string;
  readonly argv: readonly string[];
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
}
export interface ScopedFixturePolicy {
  readonly enabled: boolean;
  readonly approvedRoot: string;
  readonly recipes: Readonly<Record<string, ScopedFixtureRecipe>>;
}
export interface ScopedCheckResult {
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly outputExceeded: boolean;
  readonly stdout: string;
  readonly stderr: string;
}
export class ScopedCheckDenied extends Error {
  constructor() { super('Scoped fixture check denied'); }
}
const deny = (): never => { throw new ScopedCheckDenied(); };

export function createOfflineFixtureChecker(policy: ScopedFixturePolicy) {
  // This closure's immutable recipe copy cannot be modified via a per-call ID.
  // A future server MUST source it from separately authorized admin configuration.
  const registry = new Map(Object.entries(policy.recipes).map(([id, recipe]) => [
    id, { ...recipe, argv: [...recipe.argv] }
  ]));
  let running = false;

  return async (recipeId: string): Promise<ScopedCheckResult> => {
    if (!policy.enabled || !/^[a-z][a-z0-9_-]{0,39}$/.test(recipeId)) deny();
    const recipe = registry.get(recipeId);
    if (!recipe) throw new ScopedCheckDenied();
    if (running) deny();
    // Reserve the slot before any await, otherwise two simultaneous calls can
    // both pass a late concurrency check and spawn in parallel.
    running = true;
    try {
    if (!Number.isSafeInteger(recipe.timeoutMs) || recipe.timeoutMs < 50 ||
      recipe.timeoutMs > 5000 || !Number.isSafeInteger(recipe.maxOutputBytes) ||
      recipe.maxOutputBytes < 32 || recipe.maxOutputBytes > 8192) deny();
    if (!path.isAbsolute(recipe.binary) || recipe.argv.length > 8 ||
      recipe.argv.some(a => typeof a !== 'string' || a.length > 512)) deny();
    const root = await fs.realpath(policy.approvedRoot);
    const rootSt = await fs.stat(root);
    if (!rootSt.isDirectory() || (rootSt.mode & 0o022) !== 0) deny();
    const binary = await fs.realpath(recipe.binary);
    if (binary !== recipe.binary) deny(); // unreviewed symlink executable
    const st = await fs.stat(binary);
    if (!st.isFile() || !(st.mode & 0o111)) deny();

      return await new Promise<ScopedCheckResult>((resolve, reject) => {
        const child = spawn(binary, recipe.argv, {
          cwd: root,
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
          // POSIX: a new group allows timeout/overflow cleanup to include
          // descendants that inherited the original child's process group.
          // This is NOT an OS sandbox: setsid/new groups can still escape.
          detached: process.platform !== 'win32',
          env: { PATH: '/usr/bin:/bin', HOME: root, TMPDIR: root, XDG_CACHE_HOME: root }
        });
        let out = '';
        let err = '';
        let total = 0;
        let timedOut = false;
        let overflow = false;
        let finished = false;
        const killGroup = () => {
          // Only signal a process group created for THIS synthetic child.
          // Descendants sharing that group must not survive even a normal exit.
          if (process.platform !== 'win32' && child.pid && child.pid > 1) {
            try { process.kill(-child.pid, 'SIGKILL'); } catch { /* group already gone */ }
          }
        };
        const kill = () => {
          killGroup();
          try { child.kill('SIGKILL'); } catch { /* child already exited */ }
        };
        const timer = setTimeout(() => { timedOut = true; kill(); }, recipe.timeoutMs);
        const record = (buffer: Buffer, stream: 'stdout' | 'stderr') => {
          const remaining = Math.max(0, recipe.maxOutputBytes - total);
          const keep = buffer.subarray(0, remaining);
          total += buffer.length;
          if (stream === 'stdout') out += keep.toString('utf8');
          else err += keep.toString('utf8');
          if (total > recipe.maxOutputBytes) { overflow = true; kill(); }
        };
        child.stdout?.on('data', (buf: Buffer) => record(buf, 'stdout'));
        child.stderr?.on('data', (buf: Buffer) => record(buf, 'stderr'));
        child.on('error', () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          reject(new ScopedCheckDenied());
        });
        child.on('close', code => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          killGroup(); // normal parent exit must not orphan its group
          resolve({
            exitCode: code, timedOut, outputExceeded: overflow,
            stdout: out, stderr: err
          });
        });
      });
    } finally {
      running = false;
    }
  };
}
