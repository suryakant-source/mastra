import { createTool } from '@mastra/core/tools';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v4';
import { MCPServer } from '../server';
import { connectClient, serveHTTP, textOf } from './harness.mock';
import type { ServedHTTP } from './harness.mock';

vi.setConfig({ testTimeout: 20_000, hookTimeout: 20_000 });

// #28240: a tool without an outputSchema whose `execute` returns `undefined` used to
// produce `content: [{ type: 'text', text: undefined }]`, which the MCP SDK rejects
// with a -32602 protocol error - the client saw an error even though the tool had
// already run. A void result now serialises as `null`, matching the agent loop (#27392).
const voidTool = createTool({
  id: 'voidTool',
  description: 'Fire-and-forget tool that returns nothing',
  inputSchema: z.object({}),
  execute: async () => undefined,
});

const objectTool = createTool({
  id: 'objectTool',
  description: 'Tool that returns an object',
  inputSchema: z.object({}),
  execute: async () => ({ ok: true }),
});

describe('MCPServer tools without an outputSchema', () => {
  let server: MCPServer;
  let served: ServedHTTP;
  let client: Awaited<ReturnType<typeof connectClient>>;

  beforeAll(async () => {
    server = new MCPServer({ name: 'UndefinedResultTestServer', version: '1.0.0', tools: { voidTool, objectTool } });
    served = await serveHTTP(server);
    client = await connectClient(served.url);
  });

  afterAll(async () => {
    await client.close();
    await served.close();
  });

  it('returns a null text result for a tool whose execute returns undefined', async () => {
    const result = await client.callTool({ name: 'voidTool', arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toBe('null');
  });

  it('still serialises a returned value as before', async () => {
    const result = await client.callTool({ name: 'objectTool', arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toBe(JSON.stringify({ ok: true }));
  });
});
