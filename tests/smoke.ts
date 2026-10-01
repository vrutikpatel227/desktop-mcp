import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

process.env.DESKTOP_MCP_AGENT_TOKEN = 'change-me';
process.env.DESKTOP_MCP_WORKSPACE = 'C:\\Users\\Vrutik\\Desktop\\Desktop MCP Server\\workspace';

const client = new Client({ name: 'desktop-mcp-smoke', version: '0.1.0' });
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['tsx', 'apps/mcp-server/src/index.ts'],
  cwd: 'C:\\Users\\Vrutik\\Desktop\\Desktop MCP Server'
});

try {
  await client.connect(transport);
  const listed = await client.listTools();
  console.log('TOOLS=' + listed.tools.length);
  console.log(listed.tools.map(tool => tool.name).join(','));
  const result = await client.callTool({
    name: 'agent.health',
    arguments: {}
  });
  console.log('HEALTH=' + JSON.stringify(result.content));
  const created = await client.callTool({
    name: 'filesystem.create_directory',
    arguments: { path: 'C:\\Users\\Vrutik\\Desktop\\Desktop MCP Server\\workspace\\smoke-test' }
  });
  console.log('CREATE=' + JSON.stringify(created.content));
} finally {
  await client.close();
}
