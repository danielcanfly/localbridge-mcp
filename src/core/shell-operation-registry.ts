import { randomUUID } from 'node:crypto';

/**
 * Bounded, per-server-process advisory correlation IDs for spawned commands.
 * These IDs are not capabilities, credentials, or a proof of MCP client identity.
 * All existing policies are enforced by the existing shell routes.
 */
export class ShellOperationRegistry {
  private readonly records = new Map<number, string>();
  private static readonly MAX_RECORDS = 128;

  register(pid: number): string {
    if (!Number.isSafeInteger(pid) || pid <= 0) {
      throw new Error('Cannot register operation without a valid process ID');
    }
    const id = randomUUID();
    // PID reuse must never inherit the previous operation's correlation ID.
    this.records.delete(pid);
    this.records.set(pid, id);
    while (this.records.size > ShellOperationRegistry.MAX_RECORDS) {
      const first = this.records.keys().next().value;
      if (first !== undefined) this.records.delete(first);
    }
    return id;
  }

  get(pid: number): string | undefined {
    return this.records.get(pid);
  }

  assertMatches(pid: number, provided?: string): void {
    // Old MCP clients omit the optional field; legacy PID-only access is
    // preserved. This is explicitly not an authorization boundary.
    if (provided === undefined) return;
    const expected = this.records.get(pid);
    if (!expected || expected !== provided) {
      throw new Error('Operation ID does not match this process');
    }
  }
}
