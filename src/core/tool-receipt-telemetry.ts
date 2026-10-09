/**
 * Opt-in, process-local MCP ingress/outcome receipts. Does not instrument
 * transport delivery, caller identity, upstream decisions, or tool arguments.
 */
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

export type ReceiptPhase =
  | 'RECEIVED'
  | 'HANDLER_OK'
  | 'HANDLER_LOCAL_ERROR'
  | 'HANDLER_THROW'
  | 'RESULT_SENT';

export type ErrorCategory =
  | 'NONE'
  | 'LOCAL_TOOL_ERROR'
  | 'TYPE_ERROR'
  | 'RANGE_ERROR'
  | 'REFERENCE_ERROR'
  | 'SYNTAX_ERROR'
  | 'OTHER_ERROR'
  | 'NON_ERROR_THROWN';

export interface ToolReceipt {
  readonly ingressId: string;
  readonly toolName: string;
  readonly startUtc: string;
  readonly endUtc: string | null;
  readonly durationMs: number | null;
  readonly phases: readonly ReceiptPhase[];
  readonly errorCategory: ErrorCategory;
  readonly sourceVersion: string;
  readonly epoch: string;
}

interface StoredReceipt {
  ingressId: string;
  toolName: string;
  startUtc: string;
  endUtc: string | null;
  durationMs: number | null;
  phases: ReceiptPhase[];
  errorCategory: ErrorCategory;
  sourceVersion: string;
  epoch: string;
  startMonotonic: number;
}

export interface ToolReceiptSnapshot {
  readonly enabled: true;
  readonly epoch: string;
  readonly sourceVersion: string;
  readonly capacity: number;
  readonly totalReceived: number;
  readonly totalResultReturned: number;
  readonly totalEvicted: number;
  readonly lostEventCount: number;
  readonly pendingRetained: number;
  readonly receipts: readonly ToolReceipt[];
}

export function coarseErrorCategory(error: unknown): ErrorCategory {
  // Fixed enum values only. Never read error.name, error.message or stack.
  if (!(error instanceof Error)) return 'NON_ERROR_THROWN';
  if (error instanceof TypeError) return 'TYPE_ERROR';
  if (error instanceof RangeError) return 'RANGE_ERROR';
  if (error instanceof ReferenceError) return 'REFERENCE_ERROR';
  if (error instanceof SyntaxError) return 'SYNTAX_ERROR';
  return 'OTHER_ERROR';
}

/** Strict max 256. No persistent logs, console output or event callbacks. */
export class ToolReceiptBuffer {
  readonly capacity: number;
  readonly epoch = randomUUID();
  readonly sourceVersion: string;
  private readonly receipts: StoredReceipt[] = [];
  private readonly byId = new Map<string, StoredReceipt>();
  private totalReceived = 0;
  private totalResultReturned = 0;
  private totalEvicted = 0;
  private lostEventCount = 0;

  constructor(options: { capacity?: number; sourceVersion: string }) {
    const capacity = options.capacity ?? 128;
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 256) {
      throw new RangeError('Receipt capacity must be an integer from 1 through 256');
    }
    this.capacity = capacity;
    // Source version is trusted build metadata, but still use strict syntax.
    this.sourceVersion = /^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$/.test(options.sourceVersion)
      ? options.sourceVersion
      : 'unknown';
  }

  /** Call synchronously before invoking the handler; ignores unknown tools. */
  begin(toolName: string, registryNames: readonly string[]): string | null {
    if (!registryNames.includes(toolName)) return null;
    const now = Date.now();
    const ingressId = 'req_' + randomUUID();
    const receipt: StoredReceipt = {
      ingressId,
      toolName,
      startUtc: new Date(now).toISOString(),
      endUtc: null,
      durationMs: null,
      phases: ['RECEIVED'],
      errorCategory: 'NONE',
      sourceVersion: this.sourceVersion,
      epoch: this.epoch,
      startMonotonic: performance.now()
    };
    if (this.receipts.length === this.capacity) {
      const evicted = this.receipts.shift()!;
      this.byId.delete(evicted.ingressId);
      this.totalEvicted++;
      if (evicted.endUtc === null) this.lostEventCount++;
    }
    this.receipts.push(receipt);
    this.byId.set(ingressId, receipt);
    this.totalReceived++;
    return ingressId;
  }

  outcome(id: string | null, phase: 'HANDLER_OK' | 'HANDLER_LOCAL_ERROR' | 'HANDLER_THROW', category: ErrorCategory = 'NONE'): void {
    if (id === null) return;
    const record = this.byId.get(id);
    if (!record) {
      this.lostEventCount++;
      return;
    }
    if (record.phases.length !== 1 || record.phases[0] !== 'RECEIVED') return;
    record.phases.push(phase);
    record.errorCategory = phase === 'HANDLER_LOCAL_ERROR' ? 'LOCAL_TOOL_ERROR'
      : phase === 'HANDLER_THROW' ? category : 'NONE';
    record.endUtc = new Date().toISOString();
    record.durationMs = Math.max(0, performance.now() - record.startMonotonic);
  }

  /** RESULT_SENT means safe() returned a result to the MCP SDK, not wire ACK. */
  resultReturned(id: string | null): void {
    if (id === null) return;
    const record = this.byId.get(id);
    if (!record) {
      this.lostEventCount++;
      return;
    }
    if (record.phases.length !== 2 || record.phases[2] === 'RESULT_SENT') return;
    record.phases.push('RESULT_SENT');
    this.totalResultReturned++;
  }

  snapshot(): ToolReceiptSnapshot {
    return {
      enabled: true,
      epoch: this.epoch,
      sourceVersion: this.sourceVersion,
      capacity: this.capacity,
      totalReceived: this.totalReceived,
      totalResultReturned: this.totalResultReturned,
      totalEvicted: this.totalEvicted,
      lostEventCount: this.lostEventCount,
      pendingRetained: this.receipts.filter(r => r.endUtc === null).length,
      receipts: this.receipts.map(({ startMonotonic: _unused, phases, ...rest }) =>
        ({ ...rest, phases: [...phases] }))
    };
  }
}

/**
 * The existing safe() wrapper delegates here. Metadata work is fail-open, so
 * it never changes handler execution, MCP result contents or error conversion.
 * Never inspect, serialize, hash or even enumerate args or return bodies.
 */
export function withToolReceipt<TArgs, TResult>(
  toolName: string,
  registryNames: readonly string[],
  handler: (args: TArgs) => Promise<TResult> | TResult,
  errorResult: (error: unknown) => TResult,
  buffer?: ToolReceiptBuffer
): (args: TArgs) => Promise<TResult> {
  return async (args: TArgs): Promise<TResult> => {
    let id: string | null = null;
    if (buffer) {
      try { id = buffer.begin(toolName, registryNames); } catch { /* telemetry must not affect handler */ }
    }
    try {
      const result = await handler(args);
      if (buffer) {
        try {
          // A hostile getter must not change the original return semantics.
          const isLocalError = (result as { isError?: unknown } | null)?.isError === true;
          buffer.outcome(id, isLocalError ? 'HANDLER_LOCAL_ERROR' : 'HANDLER_OK');
          buffer.resultReturned(id);
        } catch { /* telemetry must not affect handler */ }
      }
      return result;
    } catch (error) {
      // Preserve legacy error payload shape even when receipts are enabled.
      const converted = errorResult(error);
      if (buffer) {
        try {
          buffer.outcome(id, 'HANDLER_THROW', coarseErrorCategory(error));
          buffer.resultReturned(id);
        } catch { /* telemetry must not affect error conversion */ }
      }
      return converted;
    }
  };
}
