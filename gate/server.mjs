import fs from 'node:fs/promises';
import path from 'node:path';
import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

const ROOT = '/tmp/daniel-commander-gate';

function safePath(name) {
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(name)) {
    throw new Error('Invalid test filename');
  }
  return path.join(ROOT, name);
}

function buildServer() {
  const server = new McpServer({
    name: 'daniel-commander-gate',
    version: '0.0.1'
  });

  server.registerTool(
    'dc_test_read',
    {
      description: 'Read one file from the isolated Daniel Commander Gate directory only.',
      inputSchema: z.object({
        filename: z.string().default('hello.txt')
      }),
      annotations: {
        title: 'Gate Read',
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      }
    },
    async ({ filename }) => {
      await fs.mkdir(ROOT, { recursive: true });
      const file = safePath(filename);
      const text = await fs.readFile(file, 'utf8');
      return { content: [{ type: 'text', text }] };
    }
  );

  server.registerTool(
    'dc_test_write',
    {
      description: 'Write one file inside the isolated Daniel Commander Gate directory only.',
      inputSchema: z.object({
        filename: z.string().default('result.txt'),
        content: z.string().max(4096)
      }),
      annotations: {
        title: 'Gate Write',
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false
      }
    },
    async ({ filename, content }) => {
      await fs.mkdir(ROOT, { recursive: true });
      const file = safePath(filename);
      await fs.writeFile(file, content, { encoding: 'utf8', mode: 0o600 });
      return {
        content: [{ type: 'text', text: 'WROTE ' + filename + ' (' + Buffer.byteLength(content) + ' bytes)' }]
      };
    }
  );

  return server;
}

await fs.mkdir(ROOT, { recursive: true });
await fs.writeFile(path.join(ROOT, 'hello.txt'), 'DANIEL_COMMANDER_GATE_READ_OK\n', { encoding: 'utf8', mode: 0o600 });
console.error('Daniel Commander Gate MCP ready on stdio');
serveStdio(buildServer);
