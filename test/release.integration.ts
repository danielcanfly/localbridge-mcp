import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { MCP_SERVER_VERSION } from '../src/config.js';

const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
const ci = await fs.readFile('.github/workflows/ci.yml', 'utf8');
const codeql = await fs.readFile('.github/workflows/codeql.yml', 'utf8');
const preflight = await fs.readFile('scripts/release-preflight.sh', 'utf8');
const finalize = await fs.readFile('scripts/github-public-finalize.sh', 'utf8');
const changelog = await fs.readFile('CHANGELOG.md', 'utf8');
const processDoc = await fs.readFile('docs/RELEASE_PROCESS.md', 'utf8');
const p7 = await fs.readFile('docs/qualification/RELEASE_STATUS.md', 'utf8');

assert.equal(pkg.version, '0.2.0');
assert.equal(pkg.private, true);
assert.equal(MCP_SERVER_VERSION, pkg.version);
console.log('RELEASE_VERSION_PASS');

for (const workflow of [ci, codeql]) {
  for (const match of workflow.matchAll(/uses:\s*([^\s#]+)@([^\s#]+)/g)) {
    assert.match(match[2], /^[0-9a-f]{40}$/i, `unpinned action: ${match[0]}`);
  }
}
assert.match(ci, /# v7/);
assert.match(codeql, /github\.event\.repository\.visibility == 'public'/);
assert.match(codeql, /# v4/);
console.log('RELEASE_ACTION_SHA_PINNING_PASS');
console.log('RELEASE_CODEQL_PUBLIC_GATE_PASS');

assert.match(preflight, /git archive/);
assert.match(preflight, /npm audit/);
assert.match(preflight, /reachable-history privacy scan/i);
assert.match(preflight, /noreply/);
console.log('RELEASE_RELEASE_PREFLIGHT_CONTRACT_PASS');

assert.match(finalize, /OWNER_PUBLIC_VISIBILITY_GATE_PENDING/);
assert.match(finalize, /private-vulnerability-reporting/);
assert.match(finalize, /--protect-main/);
assert.doesNotMatch(finalize, /visibility[^\n]*public[^\n]*PATCH/i);
console.log('RELEASE_OWNER_VISIBILITY_GATE_PASS');

assert.match(changelog, /0\.1\.0-rc\.1/);
assert.match(processDoc, /source-only GitHub releases/i);
assert.match(p7, /READY_FOR_OWNER_PUBLIC_VISIBILITY_GATE/);
console.log('RELEASE_RELEASE_DOCS_PASS');

for (const path of [
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/pull_request_template.md',
  'docs/releases/v0.2.0.md'
]) {
  const stat = await fs.stat(path);
  assert.equal(stat.isFile(), true, `missing public project surface: ${path}`);
}
console.log('RELEASE_PUBLIC_PROJECT_SURFACE_PASS');

await assert.rejects(
  fs.stat('gate'),
  (error: any) => error?.code === 'ENOENT'
);
console.log('RELEASE_NO_QUALIFICATION_SCAFFOLD_PASS');
