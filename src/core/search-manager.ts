// Derived from wonderwhy-er/DesktopCommanderMCP search-manager.ts @ 092ce0b841e86455f12e41f4dc36399a7522ecb5
// Office-document search and product instrumentation were intentionally removed.
import { spawn, type ChildProcess } from 'node:child_process';
import { validatePath } from './filesystem.js';
import { getRipgrepPath } from './ripgrep-resolver.js';

export interface SearchResult {
  file: string;
  line?: number;
  match?: string;
  type: 'file' | 'content';
}

export interface SearchOptions {
  rootPath: string;
  pattern: string;
  searchType: 'files' | 'content';
  filePattern?: string;
  ignoreCase?: boolean;
  maxResults?: number;
  includeHidden?: boolean;
  contextLines?: number;
  timeout?: number;
  literalSearch?: boolean;
}

interface Session {
  id: string;
  process: ChildProcess;
  results: SearchResult[];
  buffer: string;
  complete: boolean;
  error?: string;
  start: number;
}

export class SearchManager {
  private sessions = new Map<string, Session>();
  private counter = 0;

  async startSearch(options: SearchOptions): Promise<{
    sessionId: string;
    results: SearchResult[];
    isComplete: boolean;
  }> {
    const rootPath = await validatePath(options.rootPath);
    const rg = await getRipgrepPath();
    const id = `search_${++this.counter}_${Date.now()}`;
    const proc = spawn(rg, this.buildArgs({ ...options, rootPath }), { windowsHide: true });
    if (!proc.pid) throw new Error('Failed to start ripgrep');

    const session: Session = {
      id,
      process: proc,
      results: [],
      buffer: '',
      complete: false,
      start: Date.now()
    };
    this.sessions.set(id, session);

    proc.stdout?.on('data', (b: Buffer) => {
      session.buffer += b.toString();
      this.consume(session, options.searchType, false);
      if (
        options.maxResults &&
        session.results.length >= options.maxResults &&
        !proc.killed
      ) {
        proc.kill('SIGTERM');
      }
    });
    proc.stderr?.on('data', (b: Buffer) => {
      session.error = (session.error || '') + b.toString();
    });
    proc.on('close', () => {
      this.consume(session, options.searchType, true);
      session.complete = true;
    });
    proc.on('error', err => {
      session.error = err.message;
      session.complete = true;
    });

    if (options.timeout) {
      const timer = setTimeout(() => {
        if (!session.complete && !proc.killed) proc.kill('SIGTERM');
      }, options.timeout);
      timer.unref();
      proc.once('close', () => clearTimeout(timer));
    }

    await new Promise(resolve => setTimeout(resolve, 40));
    return {
      sessionId: id,
      results: [...session.results],
      isComplete: session.complete
    };
  }

  readSearchResults(
    sessionId: string,
    offset = 0,
    length = 100
  ): {
    results: SearchResult[];
    totalResults: number;
    isComplete: boolean;
    error?: string;
    hasMoreResults: boolean;
  } {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error(`Search session ${sessionId} not found`);
    const start = offset < 0 ? Math.max(0, s.results.length + offset) : offset;
    const results = s.results.slice(start, start + length);
    return {
      results,
      totalResults: s.results.length,
      isComplete: s.complete,
      error: s.error,
      hasMoreResults: start + results.length < s.results.length
    };
  }

  stopSearch(sessionId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s) return false;
    if (!s.process.killed && !s.complete) s.process.kill('SIGTERM');
    s.complete = true;
    return true;
  }

  listSearches(): Array<{
    sessionId: string;
    isComplete: boolean;
    resultCount: number;
    runtimeMs: number;
  }> {
    const now = Date.now();
    return [...this.sessions.values()].map(s => ({
      sessionId: s.id,
      isComplete: s.complete,
      resultCount: s.results.length,
      runtimeMs: now - s.start
    }));
  }

  private consume(s: Session, type: 'files' | 'content', final: boolean): void {
    const lines = s.buffer.split('\n');
    s.buffer = final ? '' : (lines.pop() || '');
    for (const line of lines) {
      if (!line.trim()) continue;
      if (type === 'files') {
        s.results.push({ file: line.trim(), type: 'file' });
        continue;
      }
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'match') {
          const sub = parsed.data?.submatches?.[0];
          s.results.push({
            file: parsed.data.path.text,
            line: parsed.data.line_number,
            match: sub?.match?.text || parsed.data.lines.text.trim(),
            type: 'content'
          });
        } else if (parsed.type === 'context') {
          s.results.push({
            file: parsed.data.path.text,
            line: parsed.data.line_number,
            match: parsed.data.lines.text.trim(),
            type: 'content'
          });
        }
      } catch {}
    }
  }

  private buildArgs(o: SearchOptions): string[] {
    const args: string[] = [];
    if (o.searchType === 'content') {
      args.push('--json', '--line-number');
      if (o.literalSearch) args.push('-F');
      if (o.contextLines && o.contextLines > 0) {
        args.push('-C', String(o.contextLines));
      }
      if (o.ignoreCase !== false) args.push('-i');
      if (o.filePattern) {
        for (const g of o.filePattern.split('|').map(x => x.trim()).filter(Boolean)) {
          args.push('-g', g);
        }
      }
      if (o.includeHidden) args.push('--hidden');
      args.push('--', o.pattern, o.rootPath);
    } else {
      args.push('--files');
      if (o.includeHidden) args.push('--hidden');
      const flag = o.ignoreCase !== false ? '--iglob' : '--glob';
      const glob = /[*?\[\]{}]/.test(o.pattern) ? o.pattern : `*${o.pattern}*`;
      args.push(flag, glob, o.rootPath);
    }
    return args;
  }
}

export const searchManager = new SearchManager();
