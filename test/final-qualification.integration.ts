import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'localbridge-mcp-p9-'));
const configDir = path.join(sandbox, 'config');
const workspace = path.join(sandbox, 'workspace');
await fs.mkdir(workspace, { recursive: true });
process.env.LOCALBRIDGE_MCP_CONFIG_DIR = configDir;

const { configManager } = await import('../src/config-manager.js');
const core = await import('../src/core/index.js');

await configManager.updateConfig({
  allowedDirectories: [workspace],
  defaultShell: process.platform === 'win32' ? 'powershell.exe' : (process.platform === 'darwin' ? '/bin/zsh' : '/bin/sh'),
  blockedCommands: ['sudo', 'shutdown']
});

async function waitForSearch(sessionId: string, attempts = 80) {
  let page = core.searchManager.readSearchResults(sessionId, 0, 1000);
  for (let i = 0; i < attempts && !page.isComplete; i++) {
    await new Promise(resolve => setTimeout(resolve, 25));
    page = core.searchManager.readSearchResults(sessionId, 0, 1000);
  }
  return page;
}

async function waitUntil(predicate: () => boolean, attempts = 80) {
  for (let i = 0; i < attempts; i++) {
    if (predicate()) return true;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return predicate();
}

try {
  const crlfPath = path.join(workspace, 'crlf.txt');
  await fs.writeFile(crlfPath, Buffer.from('first\r\ntarget\r\nlast\r\n', 'utf8'));
  const edit = await core.editBlock(crlfPath, 'target', 'TARGET');
  assert.deepEqual({ replacements: edit.replacements, fuzzy: edit.fuzzy }, { replacements: 1, fuzzy: false });
  assert.equal((await fs.readFile(crlfPath)).toString('utf8'), 'first\r\nTARGET\r\nlast\r\n');
  console.log('FINAL_LINE_ENDING_PRESERVATION_PASS');

  const searchDir = path.join(workspace, 'search');
  await fs.mkdir(searchDir);
  await fs.writeFile(path.join(searchDir, 'alpha.txt'), 'AlphaCase\nregex-token-123\nliteral a.c value\n');
  await fs.writeFile(path.join(searchDir, 'beta.log'), 'alphacase\nregex-token-456\n');
  for (let i = 0; i < 8; i++) {
    await fs.writeFile(path.join(searchDir, `page-${i}.txt`), `page-needle ${i}\n`);
  }

  const regex = await core.searchManager.startSearch({
    rootPath: searchDir,
    pattern: 'regex-token-[0-9]+',
    searchType: 'content',
    literalSearch: false,
    ignoreCase: false
  });
  const regexPage = await waitForSearch(regex.sessionId);
  assert.equal(regexPage.results.filter((r: any) => r.match?.includes('regex-token')).length, 2);

  const literal = await core.searchManager.startSearch({
    rootPath: searchDir,
    pattern: 'a.c',
    searchType: 'content',
    literalSearch: true,
    ignoreCase: false
  });
  const literalPage = await waitForSearch(literal.sessionId);
  assert.equal(literalPage.results.length, 1);
  assert.match(literalPage.results[0].match || '', /a\.c/);

  const caseSensitive = await core.searchManager.startSearch({
    rootPath: searchDir,
    pattern: 'alphacase',
    searchType: 'content',
    literalSearch: true,
    ignoreCase: false
  });
  const caseSensitivePage = await waitForSearch(caseSensitive.sessionId);
  assert.equal(caseSensitivePage.results.length, 1);
  assert.match(caseSensitivePage.results[0].file, /beta\.log$/);

  const caseInsensitive = await core.searchManager.startSearch({
    rootPath: searchDir,
    pattern: 'alphacase',
    searchType: 'content',
    literalSearch: true,
    ignoreCase: true
  });
  const caseInsensitivePage = await waitForSearch(caseInsensitive.sessionId);
  assert.equal(caseInsensitivePage.results.length, 2);

  const files = await core.searchManager.startSearch({
    rootPath: searchDir,
    pattern: '*.log',
    searchType: 'files',
    ignoreCase: false
  });
  const filesPage = await waitForSearch(files.sessionId);
  assert.deepEqual(filesPage.results.map((r: any) => path.basename(r.file)), ['beta.log']);

  const paged = await core.searchManager.startSearch({
    rootPath: searchDir,
    pattern: 'page-needle',
    searchType: 'content',
    literalSearch: true,
    ignoreCase: false
  });
  await waitForSearch(paged.sessionId);
  const pageOne = core.searchManager.readSearchResults(paged.sessionId, 0, 3);
  const pageTwo = core.searchManager.readSearchResults(paged.sessionId, 3, 3);
  const pageTail = core.searchManager.readSearchResults(paged.sessionId, -2, 2);
  assert.equal(pageOne.results.length, 3);
  assert.equal(pageOne.hasMoreResults, true);
  assert.equal(pageTwo.results.length, 3);
  assert.equal(pageTail.results.length, 2);
  assert.equal(pageOne.totalResults, 8);

  const cancel = await core.searchManager.startSearch({
    rootPath: searchDir,
    pattern: 'page-needle',
    searchType: 'content',
    literalSearch: true,
    ignoreCase: false,
    timeout: 5000
  });
  assert.equal(core.searchManager.stopSearch(cancel.sessionId), true);
  assert.equal(core.searchManager.readSearchResults(cancel.sessionId, 0, 10).isComplete, true);
  assert.equal(core.searchManager.stopSearch('search_missing_for_p9'), false);
  console.log('FINAL_SEARCH_MATRIX_PASS');

  const completed = await core.startProcess(
    `node -e "console.log('P9_STDOUT_READY'); console.error('P9_STDERR_READY')"`,
    5000
  );
  assert.equal(completed.isBlocked, false);
  let completedOutput = core.readProcessOutput(completed.pid, -20, 20);
  assert.equal(completedOutput.isComplete, true);
  assert.equal(completedOutput.exitCode, 0);
  assert.match(completedOutput.lines.join('\n'), /P9_STDOUT_READY/);
  assert.match(completedOutput.lines.join('\n'), /P9_STDERR_READY/);
  assert(core.listSessions().completed.some((s: any) => s.pid === completed.pid && s.exitCode === 0));
  completedOutput = core.readProcessOutput(completed.pid, 0, 20);
  assert.match(completedOutput.lines.join('\n'), /P9_STDOUT_READY|P9_STDERR_READY/);
  console.log('FINAL_TERMINAL_STDERR_COMPLETED_READABILITY_PASS');

  const slowCommand = (label: string) =>
    `node -e "console.log('${label}_READY'); setInterval(()=>{}, 1000)"`;
  const first = await core.startProcess(slowCommand('P9_FIRST'), 750);
  const second = await core.startProcess(slowCommand('P9_SECOND'), 750);
  assert.equal(first.pid > 0, true);
  assert.equal(second.pid > 0, true);
  assert.notEqual(first.pid, second.pid);
  assert(core.listSessions().active.some((s: any) => s.pid === first.pid));
  assert(core.listSessions().active.some((s: any) => s.pid === second.pid));
  assert.match(core.readProcessOutput(first.pid, -20, 20).lines.join('\n'), /P9_FIRST_READY/);
  assert.match(core.readProcessOutput(second.pid, -20, 20).lines.join('\n'), /P9_SECOND_READY/);
  assert.equal(core.forceTerminate(first.pid), true);
  assert.equal(core.forceTerminate(second.pid), true);
  const gone = await waitUntil(() => !core.listSessions().active.some((s: any) => s.pid === first.pid || s.pid === second.pid));
  assert.equal(gone, true);
  console.log('FINAL_MULTIPLE_SIMULTANEOUS_SESSIONS_PASS');
} finally {
  await fs.rm(sandbox, { recursive: true, force: true });
}
