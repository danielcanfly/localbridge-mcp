import { commandManager } from './command-manager.js';
import { terminalManager } from './terminal-manager.js';

export async function startProcess(command: string, timeoutMs = 1000, shell?: string) {
  if (!(await commandManager.validateCommand(command))) {
    throw new Error('Command blocked by LocalBridge MCP policy');
  }
  return terminalManager.executeCommand(command, timeoutMs, shell, true);
}

export function readProcessOutput(pid: number, offset = 0, length = 1000) {
  const result = terminalManager.readOutputPaginated(pid, offset, length);
  if (!result) throw new Error(`Process ${pid} not found`);
  return result;
}

export async function interactWithProcess(pid: number, input: string): Promise<boolean> {
  if (!(await commandManager.validateCommand(input))) {
    throw new Error('Terminal input blocked by LocalBridge MCP policy');
  }
  return terminalManager.sendInputToProcess(pid, input);
}

export function forceTerminate(pid: number): boolean {
  return terminalManager.forceTerminate(pid);
}

export function listSessions(): {
  active: Array<{ pid: number; isBlocked: boolean; runtime: number }>;
  completed: Array<{ pid: number; exitCode: number | null; startTime: Date; endTime: Date }>;
} {
  return {
    active: terminalManager.listActiveSessions(),
    completed: terminalManager.listCompletedSessions().map(session => ({
      pid: session.pid,
      exitCode: session.exitCode,
      startTime: session.startTime,
      endTime: session.endTime
    }))
  };
}
