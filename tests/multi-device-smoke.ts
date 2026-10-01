import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs/promises';

const root = 'C:\\Users\\Vrutik\\Desktop\\Desktop MCP Server';
const gateway = 'http://127.0.0.1:8790';
const admin = 'change-me-admin';
const dataDir = root + '\\data\\multi-device-e2e';
const workspace = root + '\\workspace\\multi-device-e2e';
await fs.rm(dataDir, { recursive: true, force: true });
await fs.rm(workspace, { recursive: true, force: true });
await fs.mkdir(workspace, { recursive: true });

const pairRes = await fetch(gateway + '/api/pair/start', {
  method: 'POST', headers: { authorization: 'Bearer ' + admin }
});
if (!pairRes.ok) throw new Error('PAIR_START_' + pairRes.status);
const pair = await pairRes.json() as { code: string };

const env = {
  ...process.env,
  DESKTOP_MCP_AGENT_PORT: '8892',
  DESKTOP_MCP_WORKSPACE: workspace,
  DESKTOP_MCP_AGENT_TOKEN: 'change-me',
  DESKTOP_MCP_GATEWAY_URL: gateway,
  DESKTOP_MCP_GATEWAY_WS_URL: 'ws://127.0.0.1:8790/agent',
  DESKTOP_MCP_PAIR_CODE: pair.code,
  DESKTOP_MCP_DATA_DIR: dataDir,
  DESKTOP_MCP_DEVICE_NAME: 'Multi Device E2E'
} as NodeJS.ProcessEnv;

const child: ChildProcess = spawn('cmd.exe', ['/d', '/s', '/c', 'npm run dev:agent'], { cwd: root, env, windowsHide: true });
try {
  let devices: any[] = [];
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const res = await fetch(gateway + '/api/devices', { headers: { authorization: 'Bearer ' + admin } });
    devices = res.ok ? await res.json() : [];
    if (devices.some(d => d.name === 'Multi Device E2E' && d.online)) break;
  }
  const target = devices.find(d => d.name === 'Multi Device E2E' && d.online);
  if (!target) throw new Error('NO_ONLINE_DEVICE');

  const rootClient = await import('@modelcontextprotocol/client');
  const client = new rootClient.Client({ name: 'multi-device-e2e-client', version: '0.2.0' });
  const transport = new rootClient.StreamableHTTPClientTransport(new URL(gateway + '/mcp'), {
    requestInit: { headers: { authorization: 'Bearer ' + admin } }
  });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    const devicesTool = await client.callTool({ name: 'device.list', arguments: {} });
    const raw = String((devicesTool as any).content?.[0]?.text ?? '');
    if (tools.tools.length < 25 || !raw.includes(target.id)) throw new Error('MCP_DEVICE_DISCOVERY_FAILED');
    const remote = await client.callTool({ name: 'device.execute', arguments: { deviceId: target.id, operation: 'system_info', args: {} } });
    const result = JSON.parse(String((remote as any).content?.[0]?.text ?? '{}'));
    if (result.platform !== 'win32') throw new Error('REMOTE_EXEC_FAILED');
    console.log('MULTI_DEVICE_PASS device=' + target.id);
    console.log('TOOLS=' + tools.tools.length);
    console.log('REMOTE=' + JSON.stringify(result));
  } finally {
    await client.close();
  }
} finally {
  child.kill();
  await new Promise(r => setTimeout(r, 300));
}
