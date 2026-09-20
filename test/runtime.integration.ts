import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const files = {
  app: await fs.readFile('runtime-app/DanielCommanderRuntime.swift', 'utf8'),
  status: await fs.readFile('scripts/macos-runtime-status.sh', 'utf8'),
  service: await fs.readFile('scripts/macos-service.sh', 'utf8'),
  wrapper: await fs.readFile('scripts/macos-tunnel-wrapper.sh', 'utf8'),
  runner: await fs.readFile('scripts/test-runtime.mjs', 'utf8')
};

const privateMarkers = [os.homedir()];
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
console.log('RUNTIME_PRIVATE_RUNTIME_FILES_PASS');
console.log('RUNTIME_RUNTIME_APP_SUPERVISOR_PASS');
console.log('RUNTIME_TCC_PREFLIGHT_CONTRACT_PASS');

assert.match(files.app, /cleanupStaleTunnel\(\)/);
assert.match(files.app, /STALE_TUNNEL_CLEANUP/);
assert.match(files.app, /STALE_TUNNEL_REFUSED/);
assert.match(files.app, /processCommand\(pid:/);
assert.match(files.app, /var tccPreflightPassed = false/);
console.log('RUNTIME_ORPHAN_CLEANUP_CONTRACT_PASS');
console.log('RUNTIME_LOG_ROTATION_CONTRACT_PASS');

assert.match(files.service, /\.local\/share\/daniel-commander\/runtime/);
assert.match(files.service, /prune --omit=dev/);
assert.match(files.service, /Daniel Commander Runtime\.app/);
assert.match(files.service, /doctor --profile .*--health\.listen-addr 127\.0\.0\.1:0/);
assert.match(files.service, /"RunAtLoad": True/);
assert.match(files.service, /"KeepAlive": \{"SuccessfulExit": False\}/);
assert.match(files.service, /"ThrottleInterval": 10/);
assert.match(files.service, /macos-tunnel-wrapper\.sh/);
assert.match(files.service, /DANIEL_COMMANDER_REAL_TUNNEL_CLIENT/);
assert.match(files.service, /tunnel-client-supervised/);
assert.match(files.service, /bootstrap_service_with_retry/);
assert.match(files.service, /reload_service_from_plist/);
assert.match(files.service, /launchctl bootout \"\$DOMAIN\/\$LABEL\"/);
assert.match(files.service, /launchctl bootstrap \"\$DOMAIN\" \"\$PLIST\"/);
assert.doesNotMatch(files.service, /"WorkingDirectory": repo_root/);
assert.match(files.wrapper, /\/usr\/bin\/caffeinate -i -w "\$tunnel_pid"/);
assert.match(files.wrapper, /"\$REAL_TUNNEL_CLIENT" "\$@" &/);
assert.match(files.wrapper, /CAFFEINATE_PID_FILE/);
assert.match(files.wrapper, /trap forward_stop TERM INT/);
assert.match(files.status, /CAFFEINATE_COUNT=/);
assert.match(files.status, /CAFFEINATE_PID=/);
console.log('RUNTIME_ACTIVE_ONLY_CAFFEINATE_CONTRACT_PASS');
console.log('RUNTIME_LIVE_DOCTOR_OVERRIDE_PASS');
console.log('RUNTIME_DEPLOY_BUNDLE_CONTRACT_PASS');
console.log('RUNTIME_LAUNCHD_APP_CONTRACT_PASS');

assert.match(files.status, /TCC_PREFLIGHT=/);
assert.match(files.status, /\/healthz/);
assert.match(files.status, /\/readyz/);
assert.match(files.status, /RUNTIME_COMMIT=/);
console.log('RUNTIME_HEALTH_STATUS_CONTRACT_PASS');
console.log('RUNTIME_REPO_PRIVACY_CONTRACT_PASS');

const pkg = JSON.parse(await fs.readFile(path.resolve('package.json'), 'utf8'));
assert.match(pkg.scripts.test, /test:runtime/);
assert.match(pkg.scripts['test:runtime'], /scripts\/test-runtime\.mjs/);
assert.match(files.runner, /process\.platform === 'darwin'/);
assert.match(files.runner, /swiftc/);
console.log('RUNTIME_TEST_WIRING_PASS');