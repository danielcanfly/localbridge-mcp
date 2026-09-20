import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'daniel-commander-p2-'));
const configDir = path.join(sandbox, 'config');
const workspace = path.join(sandbox, 'workspace');
await fs.mkdir(workspace, { recursive: true });
process.env.DANIEL_COMMANDER_CONFIG_DIR = configDir;

const { configManager } = await import('../src/config-manager.js');
const core = await import('../src/core/index.js');

await configManager.updateConfig({
  allowedDirectories: [workspace],
  defaultShell: process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh',
  blockedCommands: ['sudo', 'shutdown']
});

const nested = path.join(workspace, 'nested');
await core.createDirectory(nested);
const deep = path.join(workspace, 'deep', 'a', 'b');
await core.createDirectory(deep);
await core.writeFile(path.join(deep, 'deep.txt'), 'DEEP_OK\n');
assert.match(await core.readFile(path.join(deep, 'deep.txt')), /DEEP_OK/);

const file = path.join(nested, 'notes.txt');
await core.writeFile(file, 'alpha\nbeta\ngamma\n');
assert.equal(await core.readFile(file, 1, 1), 'beta');
assert.match(await core.readFile(file, -2), /gamma/);

await core.writeFile(file, 'delta\n', 'append');
assert.match(await core.readFile(file), /delta/);

const info = await core.getFileInfo(file);
assert.equal(info.isFile, true);
assert.equal(info.size > 0, true);

const listing = await core.listDirectory(nested);
assert.equal(listing.some((x: any) => x.name === 'notes.txt' && x.type === 'file'), true);

const moved = path.join(nested, 'notes-renamed.txt');
await core.moveFile(file, moved);
assert.equal((await core.getFileInfo(moved)).isFile, true);

const exact = await core.editBlock(moved, 'beta', 'BETA');
assert.deepEqual({ replacements: exact.replacements, fuzzy: exact.fuzzy }, { replacements: 1, fuzzy: false });
assert.match(await core.readFile(moved), /BETA/);

const fuzzyFile = path.join(nested, 'fuzzy.txt');
await core.writeFile(fuzzyFile, 'prefix\nThe quick brown fox jumps over the log.\nsuffix\n');
const fuzzy = await core.editBlock(
  fuzzyFile,
  'The quick brown f0x jumps over the log.',
  'The quick brown fox jumps over the dog.'
);
assert.equal(fuzzy.fuzzy, true);
assert.equal((fuzzy.similarity || 0) >= 0.7, true);
assert.match(await core.readFile(fuzzyFile), /jumps over the dog/);

const fileSearch = await core.searchManager.startSearch({
  rootPath: workspace,
  pattern: 'notes-renamed',
  searchType: 'files',
  ignoreCase: true
});
for (let i = 0; i < 40; i++) {
  const page = core.searchManager.readSearchResults(fileSearch.sessionId, 0, 100);
  if (page.isComplete) break;
  await new Promise(r => setTimeout(r, 25));
}
const fileResults = core.searchManager.readSearchResults(fileSearch.sessionId, 0, 100);
assert.equal(fileResults.results.some((r: any) => r.file.endsWith('notes-renamed.txt')), true);

const contentSearch = await core.searchManager.startSearch({
  rootPath: workspace,
  pattern: 'BETA',
  searchType: 'content',
  literalSearch: true,
  ignoreCase: false
});
for (let i = 0; i < 40; i++) {
  const page = core.searchManager.readSearchResults(contentSearch.sessionId, 0, 100);
  if (page.isComplete) break;
  await new Promise(r => setTimeout(r, 25));
}
const contentResults = core.searchManager.readSearchResults(contentSearch.sessionId, 0, 100);
assert.equal(contentResults.results.some((r: any) => r.file.endsWith('notes-renamed.txt')), true);
assert.equal(core.searchManager.listSearches().length >= 2, true);

await assert.rejects(() => core.startProcess('sudo -n true', 250), /blocked/i);
await assert.rejects(() => core.startProcess('echo "$(sudo -n true)"', 250), /blocked/i);

const quick = await core.startProcess("printf 'TERM_OK\\n'", 3000);
assert.match(quick.output, /TERM_OK/);

const paged = await core.startProcess("printf 'L1\\nL2\\nL3\\nL4\\n'", 3000);
const page = core.readProcessOutput(paged.pid, 1, 2);
assert.deepEqual(page.lines, ['L2', 'L3']);
assert.equal(page.remaining >= 1, true);

const interactive = await core.startProcess(
  `node -e "process.stdin.setEncoding('utf8'); console.log('READY>'); process.stdin.on('data',d=>console.log('ECHO:'+d.trim()))"`,
  750
);
assert.equal(interactive.pid > 0, true);
assert.equal(core.interactWithProcess(interactive.pid, 'hello'), true);
await new Promise(r => setTimeout(r, 200));
const out = core.readProcessOutput(interactive.pid, 0, 100);
assert.match(out.lines.join('\n'), /ECHO:hello/);
assert.equal(core.listSessions().active.some((s: any) => s.pid === interactive.pid), true);
assert.equal(core.forceTerminate(interactive.pid), true);

if (process.platform !== 'win32') {
  const escape = path.join(workspace, 'escape');
  await fs.symlink('/etc', escape);
  await assert.rejects(() => core.readFile(path.join(escape, 'hosts')), /outside allowed directories/i);
}

console.log('P2_FILESYSTEM_PASS');
console.log('P2_EDIT_EXACT_PASS');
console.log('P2_EDIT_FUZZY_PASS');
console.log('P2_SEARCH_PASS');
console.log('P2_COMMAND_BLOCKLIST_PASS');
console.log('P2_TERMINAL_PERSISTENCE_PASS');
console.log('P2_ALLOWED_DIRECTORY_ESCAPE_PASS');
console.log('P2_HEADLESS_CORE_PASS');

await fs.rm(sandbox, { recursive: true, force: true });
