import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, ['--version']);
run('npm', ['run', 'build']);

if (process.platform === 'darwin') {
  run('/usr/bin/swiftc', ['-typecheck', 'runtime-app/DanielCommanderRuntime.swift']);
} else {
  console.log('P5_SWIFT_TYPECHECK_SKIPPED_NON_DARWIN');
}

run(process.execPath, ['dist/test/p5-runtime.integration.js']);
