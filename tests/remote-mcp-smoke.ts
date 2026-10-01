import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const client = new Client({ name: 'desktop-mcp-remote-smoke', version: '0.2.0' });
const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:8790/mcp'), {
  requestInit: { headers: { authorization: 'Bearer change-me-admin' } }
});

try {
  await client.connect(transport);
  const tools = await client.listTools();
  console.log('REMOTE_TOOLS=' + tools.tools.length);
  const result = await client.callTool({ name: 'device.list', arguments: {} });
  console.log('REMOTE_DEVICE_LIST=' + JSON.stringify(result.content));
} finally {
  await client.close();
}
