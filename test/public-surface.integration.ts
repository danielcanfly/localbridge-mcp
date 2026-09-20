import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const service = await fs.readFile('scripts/macos-service.sh', 'utf8');
const common = await fs.readFile('scripts/macos-common.sh', 'utf8');
const setupCore = await fs.readFile('scripts/setup-core.sh', 'utf8');
const setupMac = await fs.readFile('scripts/setup-macos.sh', 'utf8');
const doctor = await fs.readFile('scripts/doctor.sh', 'utf8');
const readme = await fs.readFile('README.md', 'utf8');
const security = await fs.readFile('SECURITY.md', 'utf8');
const portability = await fs.readFile('docs/PORTABILITY.md', 'utf8');
const workflow = await fs.readFile('.github/workflows/ci.yml', 'utf8');
const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));

assert.doesNotMatch(service, /\/opt\/homebrew\/bin\/(?:node|npm|tunnel-client)/);
assert.match(common, /\/opt\/homebrew\/bin/);
assert.match(common, /\/usr\/local\/bin/);
assert.match(service, /LOCALBRIDGE_MCP_NODE/);
assert.match(service, /LOCALBRIDGE_MCP_TUNNEL_CLIENT/);
console.log('PUBLIC_DYNAMIC_TOOL_DISCOVERY_PASS');

assert.match(setupCore, /Node\.js >=20/);
assert.match(setupCore, /npm.*ci|NPM_BIN.*ci/s);
assert.match(setupCore, /allowedDirectories/);
assert.doesNotMatch(setupCore, /tunnel-client/);
console.log('PUBLIC_PORTABLE_CORE_SETUP_PASS');

assert.match(setupMac, /--tunnel-id/);
assert.match(setupMac, /--api-key-ref/);
assert.match(setupMac, /file:\/\/\*|file:\/\*/);
assert.match(setupMac, /does not provide a shared hosted relay/i);
assert.doesNotMatch(setupMac, /--api-key\s/);
console.log('PUBLIC_MACOS_REMOTE_SETUP_PASS');

assert.match(doctor, /DOCTOR_CORE_PASS/);
assert.match(readme, /does \*\*not\*\* provide a hosted relay/i);
assert.match(security, /does not sandbox arbitrary terminal commands/i);
assert.match(portability, /Linux is qualified for the portable stdio core/i);
console.log('PUBLIC_PUBLIC_DOCS_PASS');

assert.match(workflow, /ubuntu-latest/);
assert.match(workflow, /macos-latest/);
assert.match(workflow, /actions\/checkout@[0-9a-f]{40} # v7/);
assert.match(workflow, /actions\/setup-node@[0-9a-f]{40} # v7/);
assert.match(workflow, /npm test/);
console.log('PUBLIC_CI_MATRIX_PASS');

assert.equal(pkg.private, true);
assert.match(pkg.scripts.test, /test:public/);
assert.match(pkg.scripts['test:public'], /public-surface\.integration/);
console.log('PUBLIC_SOURCE_DISTRIBUTION_CONTRACT_PASS');

const sourceFiles = [
  service, common, setupCore, setupMac, doctor, readme, security, portability
];
const machinePathPatterns = [
  /\/Users\/[^/<>"'\\s]+\//,
  /\/home\/[^/<>"'\\s]+\//,
  /[A-Za-z]:\\\\Users\\\\[^\\\\<>"'\\s]+\\\\/
];
for (const content of sourceFiles) {
  for (const pattern of machinePathPatterns) {
    assert.equal(pattern.test(content), false, `machine-specific path found: ${pattern}`);
  }
}
console.log('PUBLIC_NO_MACHINE_IDENTITY_PASS');