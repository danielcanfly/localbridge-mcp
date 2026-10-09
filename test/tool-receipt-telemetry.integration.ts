import assert from 'node:assert/strict';
import { LOCALBRIDGE_MCP_TOOL_NAMES } from '../src/mcp/server.js';
import {
  ToolReceiptBuffer,
  withToolReceipt,
  type ToolReceiptSnapshot
} from '../src/core/tool-receipt-telemetry.js';

type FakeResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };
const names = LOCALBRIDGE_MCP_TOOL_NAMES;
const fakeErrorResult = (error: unknown): FakeResult => ({
  content: [{ type: 'text', text: 'Error: ' + (error instanceof Error ? error.message : String(error)) }],
  isError: true
});
const result = (text: string, isError?: boolean): FakeResult => ({
  content: [{ type: 'text', text }],
  ...(isError === undefined ? {} : { isError })
});
function assertComplete(snapshot: ToolReceiptSnapshot): void {
  for (const entry of snapshot.receipts) {
    assert.equal(entry.phases[0], 'RECEIVED');
    assert.equal(entry.phases.length, 3);
    assert.equal(entry.phases[2], 'RESULT_SENT');
    assert(entry.durationMs !== null && entry.durationMs >= 0);
    assert.equal(entry.epoch, snapshot.epoch);
    assert.equal(entry.sourceVersion, snapshot.sourceVersion);
    assert.match(entry.startUtc, /Z$/);
    assert.match(entry.endUtc!, /Z$/);
    assert(new Date(entry.endUtc!).valueOf() >= new Date(entry.startUtc).valueOf());
  }
}

// T01: Synthetic fake handler: ingress occurs synchronously before handler.
assert.equal(names.length, 17);
assert.equal(new Set(names).size, 17);
const buffer = new ToolReceiptBuffer({ capacity: 128, sourceVersion: '0.2.2' });
const fakeArgs = Object.freeze({ user_operation_id: 'client-spoofed', command_line: 'NEVER_EXECUTE' });
const invoked: string[] = [];
const handler = withToolReceipt('lb_run_shell', names, async (args: typeof fakeArgs) => {
  assert.equal(args, fakeArgs);
  const received = buffer.snapshot();
  assert.equal(received.totalReceived, 1);
  assert.equal(received.receipts[0].phases.join(','), 'RECEIVED');
  invoked.push('called');
  return result('FAKE_OK');
}, fakeErrorResult, buffer);
assert.deepEqual(await handler(fakeArgs), result('FAKE_OK'));
assert.deepEqual(invoked, ['called']);
const success = buffer.snapshot();
assert.equal(success.totalReceived, 1);
assert.equal(success.totalResultReturned, 1);
assert.equal(success.receipts[0].phases.join(','), 'RECEIVED,HANDLER_OK,RESULT_SENT');
assert.match(success.receipts[0].ingressId, /^req_[a-f0-9-]{36}$/);
assert.notEqual(success.receipts[0].ingressId, fakeArgs.user_operation_id);
assertComplete(success);

// T02: Error-as-result remains distinct from thrown error and client-only denial.
const localReturn = withToolReceipt('lb_read_text', names,
  () => result('FAKE_INTERNAL_ERROR', true), fakeErrorResult, buffer);
assert.equal((await localReturn(fakeArgs)).isError, true);
const thrown = withToolReceipt('lb_read_text', names,
  () => { throw new TypeError('private raw-message /Users/person/myfile SECRET_CREDENTIAL'); },
  fakeErrorResult, buffer);
const thrownResult = await thrown(fakeArgs);
assert.equal(thrownResult.isError, true);
assert.match(thrownResult.content[0].text, /^Error: private raw-message/);
let snap = buffer.snapshot();
assert.equal(snap.totalReceived, 3);
assert.equal(snap.receipts[1].phases[1], 'HANDLER_LOCAL_ERROR');
assert.equal(snap.receipts[1].errorCategory, 'LOCAL_TOOL_ERROR');
assert.equal(snap.receipts[2].phases[1], 'HANDLER_THROW');
assert.equal(snap.receipts[2].errorCategory, 'TYPE_ERROR');
assertComplete(snap);
const beforeClientOnlyRefusal = snap.totalReceived;
// A hypothetical upstream rejection simply never calls the local wrapper.
const fakeUpstreamRefusal = { clientDenied: true };
assert.equal(fakeUpstreamRefusal.clientDenied, true);
assert.equal(buffer.snapshot().totalReceived, beforeClientOnlyRefusal);

// T03: Default disabled: output and fake behavior identical, no new MCP tools.
// Existing core/MCP integration suite independently checks schema/hints with stdio.
const noReceipt = withToolReceipt('lb_run_shell', names,
  (args: typeof fakeArgs) => result(args.command_line), fakeErrorResult);
assert.deepEqual(await noReceipt(fakeArgs), result(fakeArgs.command_line));
const noReceiptThrow = withToolReceipt('lb_run_shell', names,
  () => { throw new Error('unchanged legacy response'); }, fakeErrorResult);
assert.deepEqual(await noReceiptThrow(fakeArgs), fakeErrorResult(new Error('unchanged legacy response')));
assert.equal(buffer.snapshot().totalReceived, 3);

// T04: privacy: no metadata introspection of args/result/error object.
const forbidden = [
  'VERY_PRIVATE_SECRET', '/Users/fake/private/config',
  'ssh-only.internal', 'user@example.com', 'cmd --credentials',
  'clienttoken-not-server', 'RAW_STDERR', 'AUTHORIZATION_HEADER'
];
const secretArgs = Object.freeze({
  command_line: 'cmd --credentials VERY_PRIVATE_SECRET',
  user_operation_id: 'clienttoken-not-server',
  sshHost: 'ssh-only.internal',
  file_path: '/Users/fake/private/config',
  secret: 'AUTHORIZATION_HEADER'
});
let argReads = 0;
const trappedArgs = new Proxy(secretArgs, {
  ownKeys() { argReads++; throw new Error('must not enumerate input'); },
  get(target, key, receiver) { argReads++; return Reflect.get(target, key, receiver); }
});
const privacy = new ToolReceiptBuffer({ capacity: 10, sourceVersion: 'a_BOGUS_/Users/fake/private/config' });
const privateResult = result('RAW_STDERR user@example.com VERY_PRIVATE_SECRET');
const privateHandler = withToolReceipt('lb_write_text', names, () => privateResult, fakeErrorResult, privacy);
assert.equal(await privateHandler(trappedArgs), privateResult);
assert.equal(argReads, 0);
const privateThrow = withToolReceipt('lb_write_text', names,
  () => { throw new Error(forbidden.join(' ')); }, fakeErrorResult, privacy);
await privateThrow(trappedArgs);
const privateLocalError = withToolReceipt('lb_write_text', names,
  () => result('RAW_STDERR', true), fakeErrorResult, privacy);
await privateLocalError(trappedArgs);
assertComplete(privacy.snapshot());
const serialized = JSON.stringify(privacy.snapshot());
for (const value of forbidden) assert.equal(serialized.includes(value), false, 'receipt revealed forbidden fixture');
assert.equal(serialized.includes('raw-message'), false);
assert.equal(privacy.snapshot().sourceVersion, 'unknown');
// Unknown tool never receives a trusted name or ID; handler still executes.
await withToolReceipt('fake_remote_supplied_name', names, () => result('ok'), fakeErrorResult, privacy)(trappedArgs);
assert.equal(privacy.snapshot().totalReceived, 3);

// T05: Bounded 1000 fake requests; neither payload nor receipt count can grow.
const small = new ToolReceiptBuffer({ capacity: 31, sourceVersion: '0.2.2' });
const many = withToolReceipt('lb_stat_path', names, (args: { i: number }) => result('SYNTHETIC_' + args.i),
  fakeErrorResult, small);
for (let i = 0; i < 1000; i++) await many({ i });
snap = small.snapshot();
assert.equal(snap.totalReceived, 1000);
assert.equal(snap.totalResultReturned, 1000);
assert.equal(snap.totalEvicted, 969);
assert.equal(snap.lostEventCount, 0);
assert.equal(snap.receipts.length, 31);
assertComplete(snap);
assert(JSON.stringify(snap).length < 17000);

// T06: async concurrency and nesting: one independently-generated ID per call.
const racing = new ToolReceiptBuffer({ capacity: 256, sourceVersion: '0.2.2' });
const nested = withToolReceipt('lb_list_entries', names, async (args: { n: number }) => {
  await Promise.resolve();
  return result('child ' + args.n);
}, fakeErrorResult, racing);
const outer = withToolReceipt('lb_read_many_texts', names, async (args: { n: number }) => {
  await nested({ n: args.n + 1000 });
  await Promise.resolve();
  return result('parent ' + args.n);
}, fakeErrorResult, racing);
const parallel = await Promise.all(Array.from({ length: 90 }, (_, n) => outer({ n })));
assert.equal(parallel.length, 90);
assert(parallel.every((r, n) => r.content[0].text === 'parent ' + n));
snap = racing.snapshot();
assert.equal(snap.totalReceived, 180);
assert.equal(snap.totalResultReturned, 180);
assert.equal(new Set(snap.receipts.map(r => r.ingressId)).size, 180);
assertComplete(snap);

// T07: pressure while one handler is pending: record loss, never falsely finish.
const eviction = new ToolReceiptBuffer({ capacity: 1, sourceVersion: '0.2.2' });
let resolveSlow!: (r: FakeResult) => void;
const slow = withToolReceipt('lb_read_text', names,
  () => new Promise<FakeResult>(resolve => { resolveSlow = resolve; }), fakeErrorResult, eviction);
const pending = slow(fakeArgs);
await withToolReceipt('lb_read_text', names, () => result('later'), fakeErrorResult, eviction)(fakeArgs);
resolveSlow(result('delayed'));
await pending;
assert.equal(eviction.snapshot().totalReceived, 2);
assert.equal(eviction.snapshot().totalEvicted, 1);
assert(eviction.snapshot().lostEventCount >= 1);
assert.equal(eviction.snapshot().totalResultReturned, 1);
assertComplete(eviction.snapshot());

// T08: error classes/metrics cannot infer platform or native caller identity.
assert.equal(serialized.includes('PLATFORM_DENIED'), false);
assert.equal(serialized.includes('clientSession'), false);
assert.throws(() => new ToolReceiptBuffer({ capacity: 257, sourceVersion: '0.2.2' }), RangeError);
console.log('LB10_T01_T08_FAKE_ONLY_PASS');
