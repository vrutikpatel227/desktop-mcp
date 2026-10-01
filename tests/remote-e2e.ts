import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs/promises';

const root = 'C:\\Users\\Vrutik\\Desktop\\Desktop MCP Server';
const gateway = 'http://127.0.0.1:8790';
const admin = 'change-me-admin';
const dataDir = root + '\\data\\e2e-device';
const workspace = root + '\\workspace\\e2e-device';

await fs.rm(dataDir, { recursive: true, force: true });
await fs.rm(workspace, { recursive: true, force: true });
await fs.mkdir(workspace, { recursive: true });

const start = await fetch(gateway + '/api/pair/start', {
  method: 'POST',
  headers: { authorization: 'Bearer ' + admin }
});
if (!start.ok) throw new Error('PAIR_START_' + start.status);
const pair = await start.json() as { code: string };

const env = {
  ...process.env,
  DESKTOP_MCP_AGENT_PORT: '8893',
  DESKTOP_MCP_WORKSPACE: workspace,
  DESKTOP_MCP_AGENT_TOKEN: 'change-me',
  DESKTOP_MCP_GATEWAY_URL: gateway,
  DESKTOP_MCP_GATEWAY_WS_URL: 'ws://127.0.0.1:8790/agent',
  DESKTOP_MCP_PAIR_CODE: pair.code,
  DESKTOP_MCP_DATA_DIR: dataDir,
  DESKTOP_MCP_DEVICE_NAME: 'E2E Remote Device'
} as NodeJS.ProcessEnv;

const child: ChildProcess = spawn('cmd.exe', ['/d', '/s', '/c', 'npm run dev:agent'], { cwd: root, env, windowsHide: true });
let logs = '';
child.stdout?.on('data', d => { logs += d.toString(); });
child.stderr?.on('data', d => { logs += d.toString(); });

try {
  let devices: any[] = [];
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const res = await fetch(gateway + '/api/devices', { headers: { authorization: 'Bearer ' + admin } });
    devices = res.ok ? await res.json() : [];
    if (devices.some(d => d.name === 'E2E Remote Device' && d.online)) break;
  }
  const target = devices.find(d => d.name === 'E2E Remote Device' && d.online);
  if (!target) throw new Error('REMOTE_DEVICE_NOT_ONLINE\n' + logs);

  const payload = { operation: 'system_info', args: {} };
  const exec = await fetch(gateway + '/api/devices/' + encodeURIComponent(target.id) + '/execute', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + admin, 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!exec.ok) throw new Error('REMOTE_EXEC_' + exec.status);
  const rawResult = await exec.json();
  const result = rawResult?.result ?? rawResult;
  if (!result || result.platform !== 'win32' || !result.node || typeof result.pid !== 'number') throw new Error('REMOTE_RESULT_INVALID ' + JSON.stringify(rawResult));
  console.log('REMOTE_E2E_PASS device=' + target.id);
  console.log('RESULT=' + JSON.stringify(result));
} finally {
  child.kill();
  await new Promise(r => setTimeout(r, 300));
}
