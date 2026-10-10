import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Stage 2 offline substrate only. NOT registered as an MCP tool, cannot
 * be enabled by MCP requests or by arbitrary environment variables.
 * The approved root and enabled bit must come from a trusted host owner.
 */
export interface CheckedPatchPolicy {
  readonly enabled: boolean;
  readonly approvedRoot: string;
  readonly maxFileBytes: number;
  readonly maxReplacementBytes: number;
}

export interface CheckedPatchRequest {
  readonly filename: string;
  readonly expectedSha256: string;
  readonly find: string;
  readonly replace: string;
}

export interface CheckedPatchResult {
  readonly oldSha256: string;
  readonly newSha256: string;
  readonly bytesWritten: number;
}

export class CheckedPatchDenied extends Error {
  constructor() { super('Scoped patch denied'); }
}

function deny(): never { throw new CheckedPatchDenied(); }
function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function requireFilename(filename: string): void {
  // Deliberately single-file and top-level only in this initial substrate.
  // This disallows symlink-containing parents, traversal and shell expansion.
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}\.txt$/.test(filename)) deny();
  if (filename === '.' || filename === '..') deny();
}

function approvedPolicy(policy: CheckedPatchPolicy): void {
  if (!policy.enabled || !path.isAbsolute(policy.approvedRoot)) deny();
  if (!Number.isSafeInteger(policy.maxFileBytes) || policy.maxFileBytes < 1 ||
    policy.maxFileBytes > 65536) deny();
  if (!Number.isSafeInteger(policy.maxReplacementBytes) ||
    policy.maxReplacementBytes < 1 || policy.maxReplacementBytes > 8192) deny();
}

function assertRegular(stat: import('node:fs').Stats): void {
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) deny();
}

/**
 * Atomic replacement of exactly one occurrence within a single approved text
 * fixture under a private directory. Other clients of this module serialize
 * on a same-file O_EXCL lock. Deliberately NOT qualified against an adversary
 * that can replace the entire approved root directory or mutate its inode
 * between final comparison and rename. Requires OS sandbox or trusted private
 * root before any future registration.
 */
export async function checkedPatchFixture(
  policy: CheckedPatchPolicy,
  request: CheckedPatchRequest
): Promise<CheckedPatchResult> {
  approvedPolicy(policy);
  requireFilename(request.filename);
  if (!/^[0-9a-f]{64}$/.test(request.expectedSha256)) deny();
  if (!request.find || request.find.length > policy.maxReplacementBytes ||
    request.replace.length > policy.maxReplacementBytes ||
    request.find.includes('\0') || request.replace.includes('\0')) deny();

  const root = await fs.realpath(policy.approvedRoot);
  const rootStat = await fs.lstat(root);
  if (!rootStat.isDirectory() || (rootStat.mode & 0o022) !== 0) deny();
  const filename = request.filename;
  const target = path.join(root, filename);
  const lockName = path.join(root, '.' + filename + '.lock');
  let lock: fs.FileHandle | undefined;
  let temp: string | undefined;
  try {
    // Never unlink a lock we didn't create, including on EEXIST.
    lock = await fs.open(lockName, constants.O_WRONLY | constants.O_CREAT |
      constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    const st = await fs.lstat(target);
    assertRegular(st);
    if (st.size > policy.maxFileBytes) deny();
    const handle = await fs.open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
    let original: Buffer;
    try {
      const held = await handle.stat();
      assertRegular(held);
      if (held.dev !== st.dev || held.ino !== st.ino || held.size > policy.maxFileBytes) deny();
      original = await handle.readFile();
    } finally {
      await handle.close();
    }
    if (original.byteLength > policy.maxFileBytes || original.includes(0)) deny();
    const originalHash = sha256(original);
    if (originalHash !== request.expectedSha256) deny();
    const text = original.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(original)) deny();
    const first = text.indexOf(request.find);
    if (first === -1 || text.indexOf(request.find, first + request.find.length) !== -1) deny();
    const updated = Buffer.from(text.slice(0, first) + request.replace +
      text.slice(first + request.find.length), 'utf8');
    if (updated.byteLength > policy.maxFileBytes) deny();

    temp = path.join(root, '.' + filename + '.' + randomUUID() + '.tmp');
    const output = await fs.open(temp, constants.O_CREAT | constants.O_EXCL |
      constants.O_WRONLY | constants.O_NOFOLLOW, st.mode & 0o600);
    try {
      await output.writeFile(updated);
      await output.sync();
    } finally {
      await output.close();
    }

    // Recheck target and root immediately before atomic rename. Cooperating
    // callers are serialized by lock; external root mutations remain an
    // explicitly unqualified threat in this initial offline substrate.
    const nowRoot = await fs.lstat(root);
    const nowFile = await fs.lstat(target);
    assertRegular(nowFile);
    if (nowRoot.dev !== rootStat.dev || nowRoot.ino !== rootStat.ino ||
      nowFile.dev !== st.dev || nowFile.ino !== st.ino ||
      nowFile.size > policy.maxFileBytes) deny();
    if (sha256(await fs.readFile(target)) !== originalHash) deny();
    await fs.rename(temp, target);
    temp = undefined;
    return {
      oldSha256: originalHash,
      newSha256: sha256(updated),
      bytesWritten: updated.byteLength
    };
  } catch (error) {
    if (error instanceof CheckedPatchDenied) throw error;
    // Do not report file existence, content, OS paths, user names or secrets.
    throw new CheckedPatchDenied();
  } finally {
    if (temp) await fs.rm(temp, { force: true }).catch(() => undefined);
    if (lock) {
      await lock.close();
      await fs.rm(lockName, { force: true }).catch(() => undefined);
    }
  }
}
