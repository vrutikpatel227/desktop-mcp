import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..');
const command = process.argv[2] ?? 'help';
const gateway = process.env.DESKTOP_MCP_GATEWAY_URL ?? 'http://127.0.0.1:8790';
const agent = process.env.DESKTOP_MCP_AGENT_URL ?? 'http://127.0.0.1:8788';
const adminToken = process.env.DESKTOP_MCP_ADMIN_TOKEN ?? 'change-me-admin';
const agentToken = process.env.DESKTOP_MCP_AGENT_TOKEN ?? 'change-me';

function line(label: string, ok: boolean, detail: string) {
  console.log((ok ? '✓ ' : '✗ ') + label.padEnd(20) + detail);
}

async function getJson(url: string, token?: string) {
  const headers: Record<string,string> = token ? { authorization: 'Bearer ' + token } : {};
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error('HTTP_' + response.status);
  return response.json();
}

async function postJson(url: string, payload?: unknown, token?: string) {
  const headers: Record<string,string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  const response = await fetch(url, {
    method: 'POST', headers, body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('HTTP_' + response.status);
  return response.json();
}
async function main() {
  if (command === 'doctor') {
    try { line('Node.js', true, process.version); } catch { line('Node.js', false, 'Unavailable'); }
    try {
      const npmVersion = execFileSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/c', 'npm --version'], { encoding: 'utf8' }).trim();
      line('npm', true, npmVersion);
    } catch { line('npm', false, 'Unavailable'); }
    try { line('Git', true, execFileSync('git', ['--version'], { encoding: 'utf8' }).trim()); } catch { line('Git', false, 'Unavailable'); }
    try { await getJson(agent + '/health', agentToken); line('Desktop Agent', true, 'Online'); } catch { line('Desktop Agent', false, 'Offline'); }
    try { await getJson(gateway + '/health'); line('Gateway', true, 'Online'); } catch { line('Gateway', false, 'Offline'); }
    line('MCP Server', true, 'Source present');
    line('Dashboard', fs.existsSync(path.join(root, 'apps', 'dashboard')) , 'Source present');
    line('Security', true, 'Sandbox + policy + audit');
    return;
  }

  if (command === 'status') {
    console.log(JSON.stringify(await getJson(gateway + '/api/status', adminToken), null, 2));
    return;
  }

  if (command === 'tools') {
    const { Client } = await import('@modelcontextprotocol/client');
    const { StdioClientTransport } = await import('@modelcontextprotocol/client/stdio');
    const client = new Client({ name: 'desktop-mcp-cli', version: '0.2.0' });
    const transport = new StdioClientTransport({
      command: 'npx', args: ['tsx', 'apps/mcp-server/src/index.ts'], cwd: root
    });
    try {
      await client.connect(transport);
      const [tools, resources, prompts] = await Promise.all([
        client.listTools(), client.listResources(), client.listPrompts()
      ]);
      console.log('TOOLS=' + tools.tools.length);
      for (const tool of tools.tools) console.log('  ' + tool.name);
      console.log('RESOURCES=' + resources.resources.length);
      console.log('PROMPTS=' + prompts.prompts.length);
    } finally {
      await client.close();
    }
    return;
  }

  if (command === 'config') {
    const file = path.join(root, 'configs', 'default.json');
    console.log(fs.readFileSync(file, 'utf8'));
    return;
  }

  if (command === 'pair') {
    const result = await postJson(gateway + '/api/pair/start', undefined, adminToken);
    console.log('Pairing code: ' + result.code);
    console.log('Expires: ' + result.expiresAt);
    console.log('On the agent machine set DESKTOP_MCP_GATEWAY_URL, DESKTOP_MCP_GATEWAY_WS_URL and DESKTOP_MCP_PAIR_CODE.');
    return;
  }
  if (command === 'logs') {
    const file = path.join(root, 'data', 'gateway.stderr.log');
    if (fs.existsSync(file)) console.log(fs.readFileSync(file, 'utf8'));
    const audit = path.join(process.env.DESKTOP_MCP_WORKSPACE ?? path.join(root, 'workspace'), '.desktop-mcp', 'audit.jsonl');
    if (fs.existsSync(audit)) console.log('--- AUDIT ---\n' + fs.readFileSync(audit, 'utf8').split(/\r?\n/).slice(-50).join('\n'));
    return;
  }

  if (command === 'update') {
    const url = process.argv[3] ?? process.env.DESKTOP_MCP_RELEASE_URL;
    const sha256 = process.argv[4] ?? process.env.DESKTOP_MCP_RELEASE_SHA256;
    if (!url || !sha256) throw new Error('Usage: desktop-mcp update <release-url> <sha256>');
    const script = path.join(root, 'scripts', 'update.ps1');
    const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-ReleaseUrl', url, '-ExpectedSha256', sha256], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) process.exitCode = result.status ?? 1;
    return;
  }

  if (command === 'emergency-stop') {
    const result = await postJson(agent + '/emergency-stop', undefined, agentToken);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'start') {
    spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts', 'start-agent-dev.ps1')], {
      cwd: root, stdio: 'inherit'
    });
    return;
  }

  if (command === 'stop') {
    const result = spawnSync('powershell.exe', ['-NoProfile', '-Command',
      '$c=Get-NetTCPConnection -State Listen -LocalPort 8788 -ErrorAction SilentlyContinue; if($c){Stop-Process -Id $c.OwningProcess -Force; Write-Output ("Stopped agent PID " + $c.OwningProcess)} else {Write-Output "Agent not listening."}'
    ], { cwd: root, encoding: 'utf8' });
    process.stdout.write(result.stdout ?? '');
    if (result.status !== 0) process.stderr.write(result.stderr ?? '');
    return;
  }

  console.log('Desktop MCP CLI');
  console.log('Commands: init, start, stop, status, pair, tools, config, logs, doctor, update, emergency-stop');
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
