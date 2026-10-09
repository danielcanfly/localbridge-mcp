// Derived from wonderwhy-er/DesktopCommanderMCP @ 092ce0b841e86455f12e41f4dc36399a7522ecb5
// MIT licensed. See LICENSE and THIRD_PARTY_NOTICES.md.
/**
 * REPL and Process State Detection Utilities
 * Detects when processes are waiting for input vs finished vs running
 */

export interface ProcessState {
  isWaitingForInput: boolean;
  isFinished: boolean;
  isRunning: boolean;
  detectedPrompt?: string;
  lastOutput: string;
}

// Common REPL prompt patterns
const REPL_PROMPTS = {
  python: ['>>> ', '... '],
  node: ['> ', '... '],
  r: ['> ', '+ '],
  julia: ['julia> ', '       '], // julia continuation is spaces
  shell: ['$ ', '# ', '% ', 'bash-', 'zsh-'],
  mysql: ['mysql> ', '    -> '],
  postgres: ['=# ', '-# '],
  redis: ['redis> '],
  mongo: ['> ', '... ']
};

/**
 * Analyze process output to determine current state
 *
 * Output can suggest that an interactive process is waiting for input, but it
 * can never prove that the child exited. Only the process close/error handlers
 * in TerminalManager have authoritative lifecycle signals.
 */
export function analyzeProcessState(output: string, pid?: number): ProcessState {
  if (!output || output.trim().length === 0) {
    return {
      isWaitingForInput: false,
      isFinished: false,
      isRunning: true,
      lastOutput: output
    };
  }

  const lines = output.split('\n');
  const lastLine = lines[lines.length - 1] || '';
  // Check for REPL prompts (waiting for input)
  const allPrompts = Object.values(REPL_PROMPTS).flat();
  // Only a complete, unterminated prompt line is evidence of interactive input.
  // Generic shell tokens (> / $ / # / %) are indistinguishable from printed text.
  const strongPrompts = allPrompts.filter(prompt => !['> ', '$ ', '# ', '% ', '+ ', '... ', '       ', 'bash-', 'zsh-'].includes(prompt));
  const detectedPrompt = !output.endsWith('\n') && strongPrompts.find(prompt => lastLine === prompt);

  if (detectedPrompt) {
    return {
      isWaitingForInput: true,
      isFinished: false,
      isRunning: true,
      detectedPrompt,
      lastOutput: output
    };
  }

  // Without an authoritative process close/error signal, the child may still
  // be running regardless of what its stdout/stderr happens to say.
  return {
    isWaitingForInput: false,
    isFinished: false,
    isRunning: true,
    lastOutput: output
  };
}

/**
 * Clean output by removing prompts and input echoes
 */
export function cleanProcessOutput(output: string, inputSent?: string): string {
  let cleaned = output;

  // Remove input echo if provided
  if (inputSent) {
    const inputLines = inputSent.split('\n');
    inputLines.forEach(line => {
      if (line.trim()) {
        cleaned = cleaned.replace(new RegExp(`^${escapeRegExp(line.trim())}\\s*\n?`, 'm'), '');
      }
    });
  }

  // Remove common prompt patterns from output
  cleaned = cleaned.replace(/^>>>\s*/gm, '');  // Python >>>
  cleaned = cleaned.replace(/^>\s*/gm, '');    // Node.js/Shell >
  cleaned = cleaned.replace(/^\.{3}\s*/gm, ''); // Python ...
  cleaned = cleaned.replace(/^\+\s*/gm, '');   // R +

  // Remove trailing prompts
  cleaned = cleaned.replace(/\n>>>\s*$/, '');
  cleaned = cleaned.replace(/\n>\s*$/, '');
  cleaned = cleaned.replace(/\n\+\s*$/, '');

  return cleaned.trim();
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format process state for user display
 */
export function formatProcessStateMessage(state: ProcessState, pid: number): string {
  if (state.isWaitingForInput) {
    return `Process ${pid} is waiting for input${state.detectedPrompt ? ` (detected: "${state.detectedPrompt.trim()}")` : ''}`;
  } else if (state.isFinished) {
    return `Process ${pid} has finished execution`;
  } else {
    return `Process ${pid} is running`;
  }
}
