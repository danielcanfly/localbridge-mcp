import type { ChildProcess } from 'node:child_process';

export interface ProcessInfo {
  pid: number;
  command: string;
  cpu: string;
  memory: string;
}

export interface TerminalSession {
  pid: number;
  process: ChildProcess;
  outputLines: string[];
  lastReadIndex: number;
  isBlocked: boolean;
  startTime: Date;
  bufferedChars: number;
  evictedLines: number;
  evictedChars: number;
}

export interface CommandExecutionResult {
  pid: number;
  output: string;
  isBlocked: boolean;
  timingInfo?: TimingInfo;
}

export interface TimingInfo {
  startTime: number;
  endTime: number;
  totalDurationMs: number;
  exitReason: 'early_exit_quick_pattern' | 'early_exit_periodic_check' | 'process_exit' | 'timeout';
  firstOutputTime?: number;
  lastOutputTime?: number;
  timeToFirstOutputMs?: number;
  outputEvents?: OutputEvent[];
}

export interface OutputEvent {
  timestamp: number;
  deltaMs: number;
  source: 'stdout' | 'stderr';
  length: number;
  snippet: string;
  matchedPattern?: string;
}

export interface ActiveSession {
  pid: number;
  isBlocked: boolean;
  runtime: number;
}

export interface CompletedSession {
  pid: number;
  output: string;
  exitCode: number | null;
  startTime: Date;
  endTime: Date;
}

export interface CoreResult {
  content: string;
  isError?: boolean;
}
