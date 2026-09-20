import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'daniel-commander-p4-'));
const configDir = path.join(sandbox, 'config');
const workspace = path.join(sandbox, 'workspace');
await fs.mkdir(workspace, { recursive: true });
process.env.DANIEL_COMMANDER_CONFIG_DIR = configDir;

const { configManager } = await import('../src/config-manager.js');
const core = await import('../src/core/index.js');

await configManager.init();
const defaults = await configManager.getConfig();
assert.deepEqual(defaults.allowedDirectories, []);
await assert.rejects(
  () => core.readFile(path.join(workspace, 'not-allowed.txt')),
  /No allowed directories configured/
);
console.log('P4_FAIL_CLOSED_DEFAULT_PASS');

await configManager.updateConfig({
  allowedDirectories: [workspace],
  defaultShell: process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh',
  blockedCommands: ['sudo', 'shutdown', 'reboot']
});

const allowed = path.join(workspace, 'allowed.txt');
await core.writeFile(allowed, 'P4_ALLOWED_OK\n');
assert.match(await core.readFile(allowed), /P4_ALLOWED_OK/);

if (process.platform !== 'win32') {
  await assert.rejects(() => core.readFile('/etc/hosts'), /outside allowed directories/i);
}
console.log('P4_EXPLICIT_ALLOWLIST_PASS');

const interactive = await core.startProcess(
  `node -e "process.stdin.setEncoding('utf8'); console.log('READY>'); process.stdin.on('data',d=>console.log('ECHO:'+d.trim()))"`,
  3000
);
assert(interactive.pid > 0);

await assert.rejects(
  () => core.interactWithProcess(interactive.pid, 'sudo -n true'),
  /blocked by Daniel Commander policy/i
);

assert.equal(await core.interactWithProcess(interactive.pid, 'hello-p4'), true);
let out = core.readProcessOutput(interactive.pid, -20, 20);
for (let i = 0; i < 40 && !out.lines.join('\n').includes('ECHO:hello-p4'); i++) {
  await new Promise(resolve => setTimeout(resolve, 50));
  out = core.readProcessOutput(interactive.pid, -20, 20);
}
assert.match(out.lines.join('\n'), /ECHO:hello-p4/);
assert.equal(core.forceTerminate(interactive.pid), true);
console.log('P4_STDIN_POLICY_PASS');


const sourceRoot = path.resolve('src');
const sourceFiles: string[] = [];
async function collectTs(dir: string): Promise<void> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectTs(full);
    else if (entry.isFile() && entry.name.endsWith('.ts')) sourceFiles.push(full);
  }
}
await collectTs(sourceRoot);
for (const file of sourceFiles) {
  const content = await fs.readFile(file, 'utf8');
  assert.equal(/console\.(log|info)\s*\(/.test(content), false, 'stdout logging is forbidden in stdio MCP runtime: ' + file);
}
console.log('P4_STDIO_STDOUT_CLEAN_PASS');

await fs.rm(sandbox, { recursive: true, force: true });
console.log('P4_POLICY_BASELINE_PASS');
