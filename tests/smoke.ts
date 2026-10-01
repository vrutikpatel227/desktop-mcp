import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

process.env.DESKTOP_MCP_AGENT_TOKEN = 'change-me';
process.env.DESKTOP_MCP_WORKSPACE = 'C:\\Users\\Vrutik\\Desktop\\Desktop MCP Server\\workspace';

const root = 'C:\\Users\\Vrutik\\Desktop\\Desktop MCP Server';
const workspace = root + '\\workspace';
const client = new Client({ name: 'desktop-mcp-smoke', version: '0.1.0' });
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['tsx', 'apps/mcp-server/src/index.ts'],
  cwd: root
});

function textOf(value: any) {
  return String(value?.content?.[0]?.text ?? '');
}

try {
  await client.connect(transport);
  const listed = await client.listTools();
  const resources = await client.listResources();
  const prompts = await client.listPrompts();
  console.log('TOOLS=' + listed.tools.length);
  console.log('RESOURCES=' + resources.resources.length);
  console.log('PROMPTS=' + prompts.prompts.length);

  const health = await client.callTool({ name: 'agent.health', arguments: {} });
  console.log('HEALTH=' + textOf(health));

  const path = workspace + '\\smoke-test\\hello.txt';
  await client.callTool({
    name: 'filesystem.create_directory',
    arguments: { path: workspace + '\\smoke-test' }
  });
  await client.callTool({
    name: 'filesystem.write_file',
    arguments: { path, content: 'Desktop MCP smoke test' }
  });
  const read = await client.callTool({ name: 'filesystem.read_file', arguments: { path } });
  console.log('READ=' + textOf(read));
  await client.callTool({ name: 'filesystem.delete_file', arguments: { path } });

  const proc = await client.callTool({
    name: 'process.start',
    arguments: { command: 'Start-Sleep -Seconds 10' }
  });
  const procData = JSON.parse(textOf(proc));
  console.log('PROCESS=' + JSON.stringify(procData));
  const list = await client.callTool({ name: 'process.list', arguments: {} });
  console.log('PROCESS_LIST=' + textOf(list));
  await client.callTool({ name: 'process.stop', arguments: { id: procData.id } });

  const git = await client.callTool({
    name: 'git.status',
    arguments: { cwd: workspace + '\\git-test' }
  });
  console.log('GIT=' + textOf(git));

  const demoDir = workspace + '\\demo-project';
  await client.callTool({ name: 'filesystem.create_directory', arguments: { path: demoDir } });
  await client.callTool({ name: 'filesystem.write_file', arguments: {
    path: demoDir + '\\package.json',
    content: JSON.stringify({ name: 'demo-project', scripts: { dev: 'node server.js' }, dependencies: { react: '19.0.0', vite: '7.0.0' } })
  }});
  const project = await client.callTool({ name: 'project.detect', arguments: { cwd: demoDir } });
  console.log('PROJECT=' + textOf(project));

  const browser = await client.callTool({ name: 'browser.open_url', arguments: { url: 'http://127.0.0.1:8788/health' } });
  const browserData = JSON.parse(textOf(browser));
  console.log('BROWSER=' + JSON.stringify(browserData));
  const page = await client.callTool({ name: 'browser.get_page_text', arguments: { id: browserData.id } });
  console.log('PAGE=' + textOf(page));
  await client.callTool({ name: 'browser.close', arguments: { id: browserData.id } });

  await client.callTool({ name: 'secrets.set', arguments: { name: 'smoke-test', value: 'desktop-mcp-secret' } });
  const secret = await client.callTool({ name: 'secrets.get', arguments: { name: 'smoke-test' } });
  console.log('SECRET=' + textOf(secret));
  await client.callTool({ name: 'secrets.delete', arguments: { name: 'smoke-test' } });
} finally {
  await client.close();
}
