import fs from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['server.mjs'],
  cwd: process.cwd()
});

const client = new Client({ name: 'daniel-gate-local-test', version: '0.0.1' });

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  console.log('TOOLS=' + tools.map(t => t.name).join(','));

  const read = await client.callTool({
    name: 'dc_test_read',
    arguments: { filename: 'hello.txt' }
  });
  console.log('READ=' + read.content?.map(x => x.type === 'text' ? x.text : '').join(''));

  const marker = 'DANIEL_COMMANDER_GATE_WRITE_OK';
  const write = await client.callTool({
    name: 'dc_test_write',
    arguments: { filename: 'result.txt', content: marker }
  });
  console.log('WRITE=' + write.content?.map(x => x.type === 'text' ? x.text : '').join(''));

  const actual = await fs.readFile('/tmp/daniel-commander-gate/result.txt', 'utf8');
  if (actual !== marker) throw new Error('write verification mismatch');
  console.log('VERIFY=' + actual);
} finally {
  await client.close();
}
