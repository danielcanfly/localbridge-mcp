import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/server';
import {
  createDirectory,
  editBlock,
  forceTerminate,
  getFileInfo,
  interactWithProcess,
  listDirectory,
  listSessions,
  moveFile,
  readFile,
  readProcessOutput,
  searchManager,
  startProcess,
  writeFile
} from '../core/index.js';

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

function textResult(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function jsonResult(value: unknown): ToolResult {
  return textResult(JSON.stringify(value, null, 2));
}

function errorResult(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

function safe<TArgs>(fn: (args: TArgs) => Promise<ToolResult> | ToolResult) {
  return async (args: TArgs): Promise<ToolResult> => {
    try {
      return await fn(args);
    } catch (error) {
      return errorResult(error);
    }
  };
}

export const DANIEL_COMMANDER_TOOL_NAMES = [
  'read_file',
  'read_multiple_files',
  'list_directory',
  'get_file_info',
  'write_file',
  'create_directory',
  'move_file',
  'edit_block',
  'start_search',
  'get_more_search_results',
  'stop_search',
  'list_searches',
  'start_process',
  'read_process_output',
  'interact_with_process',
  'list_sessions',
  'force_terminate'
] as const;

export function createDanielCommanderServer(): McpServer {
  const server = new McpServer({
    name: 'daniel-commander',
    version: '0.1.0-dev'
  });

  server.registerTool(
    'read_file',
    {
      description: 'Read a UTF-8 text file inside configured allowed directories. Supports line offset and length.',
      inputSchema: z.object({
        path: z.string().min(1),
        offset: z.number().int().default(0),
        length: z.number().int().positive().max(10000).optional()
      }),
      annotations: { title: 'Read file', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ path, offset, length }) => textResult(await readFile(path, offset, length)))
  );

  server.registerTool(
    'read_multiple_files',
    {
      description: 'Read multiple UTF-8 text files inside configured allowed directories in one call.',
      inputSchema: z.object({
        paths: z.array(z.string().min(1)).min(1).max(50),
        offset: z.number().int().default(0),
        length: z.number().int().positive().max(10000).optional()
      }),
      annotations: { title: 'Read multiple files', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ paths, offset, length }) => {
      const results = await Promise.all(paths.map(async path => {
        try {
          return { path, content: await readFile(path, offset, length) };
        } catch (error) {
          return { path, error: error instanceof Error ? error.message : String(error) };
        }
      }));
      return jsonResult(results);
    })
  );

  server.registerTool(
    'list_directory',
    {
      description: 'List files and directories inside an allowed directory.',
      inputSchema: z.object({ path: z.string().min(1) }),
      annotations: { title: 'List directory', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ path }) => jsonResult(await listDirectory(path)))
  );

  server.registerTool(
    'get_file_info',
    {
      description: 'Return size, type, canonical path, and modification time for a file or directory.',
      inputSchema: z.object({ path: z.string().min(1) }),
      annotations: { title: 'Get file info', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ path }) => jsonResult(await getFileInfo(path)))
  );

  server.registerTool(
    'write_file',
    {
      description: 'Write or append UTF-8 text inside configured allowed directories. Rewrite mode replaces existing content.',
      inputSchema: z.object({
        path: z.string().min(1),
        content: z.string(),
        mode: z.enum(['rewrite', 'append']).default('rewrite')
      }),
      annotations: { title: 'Write file', readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    safe(async ({ path, content, mode }) => {
      await writeFile(path, content, mode);
      return textResult(`WROTE ${path} (${Buffer.byteLength(content)} bytes, mode=${mode})`);
    })
  );

  server.registerTool(
    'create_directory',
    {
      description: 'Create a directory, including missing parent directories, inside configured allowed directories.',
      inputSchema: z.object({ path: z.string().min(1) }),
      annotations: { title: 'Create directory', readOnlyHint: false, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ path }) => {
      await createDirectory(path);
      return textResult(`CREATED ${path}`);
    })
  );

  server.registerTool(
    'move_file',
    {
      description: 'Move or rename a file or directory within configured allowed directories.',
      inputSchema: z.object({
        source: z.string().min(1),
        destination: z.string().min(1)
      }),
      annotations: { title: 'Move file', readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    safe(async ({ source, destination }) => {
      await moveFile(source, destination);
      return textResult(`MOVED ${source} -> ${destination}`);
    })
  );

  server.registerTool(
    'edit_block',
    {
      description: 'Replace a text block in a UTF-8 file. Uses exact replacement first and a bounded fuzzy fallback when one replacement is expected.',
      inputSchema: z.object({
        path: z.string().min(1),
        old_string: z.string(),
        new_string: z.string(),
        expected_replacements: z.number().int().positive().max(100).default(1)
      }),
      annotations: { title: 'Edit block', readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    safe(async ({ path, old_string, new_string, expected_replacements }) =>
      jsonResult(await editBlock(path, old_string, new_string, expected_replacements))
    )
  );

  server.registerTool(
    'start_search',
    {
      description: 'Start an asynchronous ripgrep-backed filename or content search inside allowed directories.',
      inputSchema: z.object({
        root_path: z.string().min(1),
        pattern: z.string(),
        search_type: z.enum(['files', 'content']),
        file_pattern: z.string().optional(),
        ignore_case: z.boolean().default(true),
        max_results: z.number().int().positive().max(100000).optional(),
        include_hidden: z.boolean().default(false),
        context_lines: z.number().int().min(0).max(20).default(0),
        timeout_ms: z.number().int().positive().max(300000).optional(),
        literal_search: z.boolean().default(false)
      }),
      annotations: { title: 'Start search', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async args => jsonResult(await searchManager.startSearch({
      rootPath: args.root_path,
      pattern: args.pattern,
      searchType: args.search_type,
      filePattern: args.file_pattern,
      ignoreCase: args.ignore_case,
      maxResults: args.max_results,
      includeHidden: args.include_hidden,
      contextLines: args.context_lines,
      timeout: args.timeout_ms,
      literalSearch: args.literal_search
    })))
  );

  server.registerTool(
    'get_more_search_results',
    {
      description: 'Read a page of results from an existing search session.',
      inputSchema: z.object({
        session_id: z.string().min(1),
        offset: z.number().int().default(0),
        length: z.number().int().positive().max(10000).default(100)
      }),
      annotations: { title: 'Get search results', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ session_id, offset, length }) =>
      jsonResult(searchManager.readSearchResults(session_id, offset, length))
    )
  );

  server.registerTool(
    'stop_search',
    {
      description: 'Stop an active search session.',
      inputSchema: z.object({ session_id: z.string().min(1) }),
      annotations: { title: 'Stop search', readOnlyHint: false, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ session_id }) => jsonResult({ stopped: searchManager.stopSearch(session_id) }))
  );

  server.registerTool(
    'list_searches',
    {
      description: 'List search sessions and their status.',
      inputSchema: z.object({}),
      annotations: { title: 'List searches', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async () => jsonResult(searchManager.listSearches()))
  );

  server.registerTool(
    'start_process',
    {
      description: 'Start a shell command in a persistent local terminal session. The session can later receive stdin and expose paginated output. Commands are checked against the configured blocklist.',
      inputSchema: z.object({
        command: z.string().min(1),
        timeout_ms: z.number().int().positive().max(300000).default(3000),
        shell: z.string().min(1).optional()
      }),
      annotations: { title: 'Start process', readOnlyHint: false, destructiveHint: true, openWorldHint: true }
    },
    safe(async ({ command, timeout_ms, shell }) =>
      jsonResult(await startProcess(command, timeout_ms, shell))
    )
  );

  server.registerTool(
    'read_process_output',
    {
      description: 'Read paginated stdout/stderr captured for an active or recently completed terminal session.',
      inputSchema: z.object({
        pid: z.number().int().positive(),
        offset: z.number().int().default(0),
        length: z.number().int().positive().max(10000).default(1000)
      }),
      annotations: { title: 'Read process output', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ pid, offset, length }) => jsonResult(readProcessOutput(pid, offset, length)))
  );

  server.registerTool(
    'interact_with_process',
    {
      description: 'Send a line of stdin to an active persistent terminal session.',
      inputSchema: z.object({
        pid: z.number().int().positive(),
        input: z.string()
      }),
      annotations: { title: 'Interact with process', readOnlyHint: false, destructiveHint: true, openWorldHint: true }
    },
    safe(async ({ pid, input }) => {
      if (!interactWithProcess(pid, input)) throw new Error(`Process ${pid} not found or stdin unavailable`);
      return textResult(`INPUT_SENT pid=${pid}`);
    })
  );

  server.registerTool(
    'list_sessions',
    {
      description: 'List active and recently completed persistent terminal sessions.',
      inputSchema: z.object({}),
      annotations: { title: 'List terminal sessions', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async () => jsonResult(listSessions()))
  );

  server.registerTool(
    'force_terminate',
    {
      description: 'Terminate an active terminal session by PID, escalating from SIGINT to SIGKILL if necessary.',
      inputSchema: z.object({ pid: z.number().int().positive() }),
      annotations: { title: 'Force terminate', readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    safe(async ({ pid }) => {
      if (!forceTerminate(pid)) throw new Error(`Process ${pid} not found`);
      return textResult(`TERMINATION_REQUESTED pid=${pid}`);
    })
  );

  return server;
}
