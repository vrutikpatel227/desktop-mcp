import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function isLocalRequest(request: Request) {
  const host = request.headers.get('host') ?? '';
  const hostname = host.split(':')[0].toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function findSetupScript() {
  const candidates = [
    path.resolve(process.cwd(), 'scripts', 'setup-agent.ps1'),
    path.resolve(process.cwd(), '../scripts', 'setup-agent.ps1'),
    path.resolve(process.cwd(), '../../scripts', 'setup-agent.ps1')
  ];
  return candidates.find(fs.existsSync);
}

export async function POST(request: Request) {
  if (!isLocalRequest(request)) return NextResponse.json({ error: 'LOCAL_SETUP_ONLY' }, { status: 403 });
  try {
    const data = await request.json() as { code?: string };
    const code = String(data.code ?? '').trim();
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'PAIR_CODE_MUST_BE_6_DIGITS' }, { status: 400 });

    const script = findSetupScript();
    if (!script) return NextResponse.json({ error: 'SETUP_SCRIPT_NOT_FOUND', cwd: process.cwd() }, { status: 500 });

    const root = path.resolve(path.dirname(script), '..');
    const gateway = process.env.DESKTOP_MCP_GATEWAY_URL ?? 'http://127.0.0.1:8790';
    const logFile = path.join(process.env.TEMP ?? root, 'desktop-mcp-setup.log');
    const logHandle = fs.openSync(logFile, 'a');
    const child = spawn('powershell.exe', [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', script, '-GatewayUrl', gateway, '-PairCode', code,
      '-DeviceName', process.env.COMPUTERNAME ?? 'Desktop'
    ], { cwd: root, detached: true, windowsHide: true, stdio: ['ignore', logHandle, logHandle] });
    child.unref();
    fs.closeSync(logHandle);
    return NextResponse.json({ ok: true, message: 'Agent setup started on this PC.', pid: child.pid, logFile });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'LOCAL_SETUP_FAILED' }, { status: 500 });
  }
}
