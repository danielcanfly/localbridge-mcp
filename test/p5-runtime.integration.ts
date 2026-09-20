import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const files = {
  app: await fs.readFile('runtime-app/DanielCommanderRuntime.swift', 'utf8'),
  status: await fs.readFile('scripts/macos-runtime-status.sh', 'utf8'),
  service: await fs.readFile('scripts/macos-service.sh', 'utf8'),
  runner: await fs.readFile('scripts/test-p5.mjs', 'utf8')
};

const privateMarkers = [path.basename(os.homedir())];
const secretLikePatterns = [
  new RegExp(['tunnel', '_'].join('') + '[0-9a-f]{16,}', 'i'),
  new RegExp(['asdk', '_app_'].join('') + '[0-9a-z_-]{16,}', 'i')
];

for (const [name, content] of Object.entries(files)) {
  for (const marker of privateMarkers) {
    assert.equal(content.includes(marker), false, `private marker in ${name}: ${marker}`);
  }
  for (const pattern of secretLikePatterns) {
    assert.equal(pattern.test(content), false, `secret-like value in ${name}: ${pattern}`);
  }
}

assert.match(files.app, /preflightAllowedDirectories/);
assert.match(files.app, /contentsOfDirectory\(atPath:/);
assert.match(files.app, /Process\(\)/);
assert.match(files.app, /resolveExecutable/);
assert.match(files.app, /TUNNEL_CHILD_EXIT/);
assert.match(files.app, /rotateLogs\(\)/);
assert.match(files.app, /SIGTERM/);
assert.match(files.app, /posixPermissions: 0o600/);
console.log('P5_PRIVATE_RUNTIME_FILES_PASS');
console.log('P5_RUNTIME_APP_SUPERVISOR_PASS');
console.log('P5_TCC_PREFLIGHT_CONTRACT_PASS');

assert.match(files.app, /cleanupStaleTunnel\(\)/);
assert.match(files.app, /STALE_TUNNEL_CLEANUP/);
assert.match(files.app, /STALE_TUNNEL_REFUSED/);
assert.match(files.app, /processCommand\(pid:/);
assert.match(files.app, /var tccPreflightPassed = false/);
console.log('P5_ORPHAN_CLEANUP_CONTRACT_PASS');
console.log('P5_LOG_ROTATION_CONTRACT_PASS');

assert.match(files.service, /\.local\/share\/daniel-commander\/runtime/);
assert.match(files.service, /prune --omit=dev/);
assert.match(files.service, /Daniel Commander Runtime\.app/);
assert.match(files.service, /doctor --profile .*--health\.listen-addr 127\.0\.0\.1:0/);
assert.match(files.service, /"RunAtLoad": True/);
assert.match(files.service, /"KeepAlive": \{"SuccessfulExit": False\}/);
assert.match(files.service, /"ThrottleInterval": 10/);
assert.doesNotMatch(files.service, /"WorkingDirectory": repo_root/);
console.log('P5_LIVE_DOCTOR_OVERRIDE_PASS');
console.log('P5_DEPLOY_BUNDLE_CONTRACT_PASS');
console.log('P5_LAUNCHD_APP_CONTRACT_PASS');

assert.match(files.status, /TCC_PREFLIGHT=/);
assert.match(files.status, /\/healthz/);
assert.match(files.status, /\/readyz/);
assert.match(files.status, /RUNTIME_COMMIT=/);
console.log('P5_HEALTH_STATUS_CONTRACT_PASS');
console.log('P5_REPO_PRIVACY_CONTRACT_PASS');

const pkg = JSON.parse(await fs.readFile(path.resolve('package.json'), 'utf8'));
assert.match(pkg.scripts.test, /test:p5/);
assert.match(pkg.scripts['test:p5'], /scripts\/test-p5\.mjs/);
assert.match(files.runner, /process\.platform === 'darwin'/);
assert.match(files.runner, /swiftc/);
console.log('P5_TEST_WIRING_PASS');
