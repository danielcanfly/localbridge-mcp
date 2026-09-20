import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/server';
import { MCP_SERVER_VERSION } from '../config.js';
import { configManager } from '../config-manager.js';
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

export const LOCALBRIDGE_MCP_TOOL_NAMES = [
  'lb_read_text',
  'lb_read_many_texts',
  'lb_list_entries',
  'lb_stat_path',
  'lb_write_text',
  'lb_make_directory',
  'lb_move_path',
  'lb_patch_text_block',
  'lb_search_start',
  'lb_search_read',
  'lb_search_cancel',
  'lb_search_sessions',
  'lb_run_shell',
  'lb_shell_output',
  'lb_shell_input',
  'lb_shell_sessions',
  'lb_shell_kill'
] as const;

export function createLocalBridgeMCPServer(): McpServer {
  const server = new McpServer({
    name: 'localbridge-mcp',
    version: MCP_SERVER_VERSION
  });

  server.registerTool(
    'lb_read_text',
    {
      description: 'Read a UTF-8 text file inside configured allowed directories. Supports line offset and line count.',
      inputSchema: z.object({
        file_path: z.string().min(1),
        line_offset: z.number().int().default(0),
        line_count: z.number().int().positive().max(10000).optional()
      }),
      annotations: { title: 'LocalBridge read text', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ file_path, line_offset, line_count }) => textResult(await readFile(file_path, line_offset, line_count)))
  );

  server.registerTool(
    'lb_read_many_texts',
    {
      description: 'Read multiple UTF-8 text files inside configured allowed directories in one call.',
      inputSchema: z.object({
        file_paths: z.array(z.string().min(1)).min(1).max(50),
        line_offset: z.number().int().default(0),
        line_count: z.number().int().positive().max(10000).optional()
      }),
      annotations: { title: 'LocalBridge read many texts', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ file_paths, line_offset, line_count }) => {
      const results = await Promise.all(file_paths.map(async filePath => {
        try {
          return { file_path: filePath, content: await readFile(filePath, line_offset, line_count) };
        } catch (error) {
          return { file_path: filePath, error: error instanceof Error ? error.message : String(error) };
        }
      }));
      return jsonResult(results);
    })
  );

  server.registerTool(
    'lb_list_entries',
    {
      description: 'List files and directories inside an allowed directory.',
      inputSchema: z.object({ directory_path: z.string().min(1) }),
      annotations: { title: 'LocalBridge list entries', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ directory_path }) => jsonResult(await listDirectory(directory_path)))
  );

  server.registerTool(
    'lb_stat_path',
    {
      description: 'Return size, type, canonical path, and modification time for a file or directory.',
      inputSchema: z.object({ target_path: z.string().min(1) }),
      annotations: { title: 'LocalBridge stat path', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ target_path }) => jsonResult(await getFileInfo(target_path)))
  );

  server.registerTool(
    'lb_write_text',
    {
      description: 'Write or append UTF-8 text inside configured allowed directories. Rewrite mode replaces existing content.',
      inputSchema: z.object({
        file_path: z.string().min(1),
        text: z.string(),
        write_mode: z.enum(['rewrite', 'append']).default('rewrite')
      }),
      annotations: { title: 'LocalBridge write text', readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    safe(async ({ file_path, text, write_mode }) => {
      await writeFile(file_path, text, write_mode);
      const cfg = await configManager.getConfig();
      const lineCount = text.split('\n').length;
      const warning = lineCount > cfg.fileWriteLineLimit
        ? ` WARNING: write contained ${lineCount} lines; configured advisory threshold is ${cfg.fileWriteLineLimit}. Prefer smaller chunks for more reliable tool calls.`
        : '';
      return textResult(`WROTE ${file_path} (${Buffer.byteLength(text)} bytes, ${lineCount} lines, mode=${write_mode}).${warning}`);
    })
  );

  server.registerTool(
    'lb_make_directory',
    {
      description: 'Create a directory, including missing parent directories, inside configured allowed directories.',
      inputSchema: z.object({ directory_path: z.string().min(1) }),
      annotations: { title: 'LocalBridge make directory', readOnlyHint: false, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ directory_path }) => {
      await createDirectory(directory_path);
      return textResult(`CREATED ${directory_path}`);
    })
  );

  server.registerTool(
    'lb_move_path',
    {
      description: 'Move or rename a file or directory within configured allowed directories.',
      inputSchema: z.object({
        from_path: z.string().min(1),
        to_path: z.string().min(1)
      }),
      annotations: { title: 'LocalBridge move path', readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    safe(async ({ from_path, to_path }) => {
      await moveFile(from_path, to_path);
      return textResult(`MOVED ${from_path} -> ${to_path}`);
    })
  );

  server.registerTool(
    'lb_patch_text_block',
    {
      description: 'Replace a text block in a UTF-8 file. Uses exact replacement first and a bounded fuzzy fallback when one replacement is expected.',
      inputSchema: z.object({
        file_path: z.string().min(1),
        find_text: z.string(),
        replace_text: z.string(),
        expected_matches: z.number().int().positive().max(100).default(1)
      }),
      annotations: { title: 'LocalBridge patch text block', readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    safe(async ({ file_path, find_text, replace_text, expected_matches }) =>
      jsonResult(await editBlock(file_path, find_text, replace_text, expected_matches))
    )
  );

  server.registerTool(
    'lb_search_start',
    {
      description: 'Start an asynchronous ripgrep-backed filename or content search inside allowed directories.',
      inputSchema: z.object({
        search_root: z.string().min(1),
        query_text: z.string(),
        query_kind: z.enum(['files', 'content']),
        file_glob: z.string().optional(),
        case_insensitive: z.boolean().default(true),
        result_limit: z.number().int().positive().max(100000).optional(),
        include_dotfiles: z.boolean().default(false),
        context_line_count: z.number().int().min(0).max(20).default(0),
        deadline_ms: z.number().int().positive().max(300000).optional(),
        fixed_string: z.boolean().default(false)
      }),
      annotations: { title: 'LocalBridge search start', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async args => jsonResult(await searchManager.startSearch({
      rootPath: args.search_root,
      pattern: args.query_text,
      searchType: args.query_kind,
      filePattern: args.file_glob,
      ignoreCase: args.case_insensitive,
      maxResults: args.result_limit,
      includeHidden: args.include_dotfiles,
      contextLines: args.context_line_count,
      timeout: args.deadline_ms,
      literalSearch: args.fixed_string
    })))
  );

  server.registerTool(
    'lb_search_read',
    {
      description: 'Read a page of results from an existing search session.',
      inputSchema: z.object({
        search_id: z.string().min(1),
        result_offset: z.number().int().default(0),
        result_count: z.number().int().positive().max(10000).default(100)
      }),
      annotations: { title: 'LocalBridge search read', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ search_id, result_offset, result_count }) =>
      jsonResult(searchManager.readSearchResults(search_id, result_offset, result_count))
    )
  );

  server.registerTool(
    'lb_search_cancel',
    {
      description: 'Cancel an active search session.',
      inputSchema: z.object({ search_id: z.string().min(1) }),
      annotations: { title: 'LocalBridge search cancel', readOnlyHint: false, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ search_id }) => jsonResult({ stopped: searchManager.stopSearch(search_id) }))
  );

  server.registerTool(
    'lb_search_sessions',
    {
      description: 'List search sessions and their status.',
      inputSchema: z.object({}),
      annotations: { title: 'LocalBridge search sessions', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async () => jsonResult(searchManager.listSearches()))
  );

  server.registerTool(
    'lb_run_shell',
    {
      description: 'Start a shell command in a persistent local terminal session. The session can later receive stdin and expose paginated output. Commands are checked against the configured blocklist.',
      inputSchema: z.object({
        command_line: z.string().min(1),
        wait_ms: z.number().int().positive().max(300000).default(3000),
        shell_path: z.string().min(1).optional()
      }),
      annotations: { title: 'LocalBridge run shell', readOnlyHint: false, destructiveHint: true, openWorldHint: true }
    },
    safe(async ({ command_line, wait_ms, shell_path }) =>
      jsonResult(await startProcess(command_line, wait_ms, shell_path))
    )
  );

  server.registerTool(
    'lb_shell_output',
    {
      description: 'Read paginated stdout/stderr captured for an active or recently completed terminal session.',
      inputSchema: z.object({
        process_id: z.number().int().positive(),
        line_offset: z.number().int().default(0),
        line_count: z.number().int().positive().max(10000).default(1000)
      }),
      annotations: { title: 'LocalBridge shell output', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async ({ process_id, line_offset, line_count }) => jsonResult(readProcessOutput(process_id, line_offset, line_count)))
  );

  server.registerTool(
    'lb_shell_input',
    {
      description: 'Send a line of stdin to an active persistent terminal session.',
      inputSchema: z.object({
        process_id: z.number().int().positive(),
        stdin_text: z.string()
      }),
      annotations: { title: 'LocalBridge shell input', readOnlyHint: false, destructiveHint: true, openWorldHint: true }
    },
    safe(async ({ process_id, stdin_text }) => {
      if (!(await interactWithProcess(process_id, stdin_text))) throw new Error(`Process ${process_id} not found or stdin unavailable`);
      return textResult(`INPUT_SENT pid=${process_id}`);
    })
  );

  server.registerTool(
    'lb_shell_sessions',
    {
      description: 'List active and recently completed persistent terminal sessions.',
      inputSchema: z.object({}),
      annotations: { title: 'LocalBridge shell sessions', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    safe(async () => jsonResult(listSessions()))
  );

  server.registerTool(
    'lb_shell_kill',
    {
      description: 'Terminate an active terminal session by PID, escalating from SIGINT to SIGKILL if necessary.',
      inputSchema: z.object({ process_id: z.number().int().positive() }),
      annotations: { title: 'LocalBridge shell kill', readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    safe(async ({ process_id }) => {
      if (!forceTerminate(process_id)) throw new Error(`Process ${process_id} not found`);
      return textResult(`TERMINATION_REQUESTED pid=${process_id}`);
    })
  );

  return server;
}
