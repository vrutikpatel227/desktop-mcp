import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { createDirectory, deleteFile, listDirectory, readFile, writeFile } from './filesystem.js';
import { configSummary, MAX_OUTPUT, PORT, TOKEN, WORKSPACE } from './config.js';
import { classifyCommand } from '../../../packages/security/src/risk.js';
import { decide } from '../../../packages/policy-engine/src/policy.js';
import { appendAudit } from '../../../packages/logging/src/audit.js';
import { getManaged, listManaged, startManaged, stopManaged } from '../../../packages/execution-engine/src/process-manager.js';
import { gitDiff, gitLog, gitStatus, gitWrite } from '../../../packages/tools/src/git.js';

const execFileAsync = promisify(execFile);
type RequestBody = { id?: string; operation: string; args?: Record<string, unknown> };

function authorized(req: http.IncomingMessage) {
  return req.headers.authorization === 'Bearer ' + TOKEN;
}

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readBody(req: http.IncomingMessage): Promise<RequestBody> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as RequestBody;
}async function execute(body: RequestBody) {
  const id = body.id ?? randomUUID();
  const args = body.args ?? {};
  try {
    switch (body.operation) {
      case 'health': return { id, success: true, result: { ...configSummary(), workspace: WORKSPACE } };
      case 'list_directory': return { id, success: true, result: await listDirectory(String(args.path ?? WORKSPACE)) };
      case 'read_file': return { id, success: true, result: await readFile(String(args.path)) };
      case 'create_directory': return { id, success: true, result: await createDirectory(String(args.path)) };
      case 'write_file': return { id, success: true, result: await writeFile(String(args.path), String(args.content ?? '')) };
      case 'delete_file': return { id, success: true, result: await deleteFile(String(args.path)) };
      case 'system_info': return { id, success: true, result: { hostname: process.env.COMPUTERNAME, platform: process.platform, arch: process.arch, node: process.version, pid: process.pid } };
      case 'start_process': return { id, success: true, result: startManaged(String(args.command ?? ''), String(args.cwd ?? WORKSPACE)) };
      case 'list_processes': return { id, success: true, result: listManaged() };
      case 'get_process': return { id, success: true, result: getManaged(String(args.id)) };
      case 'stop_process': return { id, success: true, result: { stopped: stopManaged(String(args.id)) } };
      case 'git_status': return { id, success: true, result: await gitStatus(String(args.cwd ?? WORKSPACE)) };
      case 'git_diff': return { id, success: true, result: await gitDiff(String(args.cwd ?? WORKSPACE)) };
      case 'git_log': return { id, success: true, result: await gitLog(String(args.cwd ?? WORKSPACE)) };
      case 'git_add': return { id, success: true, result: await gitWrite('add', String(args.cwd ?? WORKSPACE)) };
      case 'git_commit': return { id, success: true, result: await gitWrite('commit', String(args.cwd ?? WORKSPACE), String(args.message ?? 'Update from Desktop MCP')) };
      case 'git_pull': return { id, success: true, result: await gitWrite('pull', String(args.cwd ?? WORKSPACE)) };
      case 'git_push': return { id, success: true, result: await gitWrite('push', String(args.cwd ?? WORKSPACE)) };
      case 'execute_powershell': return await executePowerShell(id, String(args.command ?? ''));
      default: return { id, success: false, error: { code: 'OPERATION_NOT_FOUND', message: body.operation } };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { id, success: false, error: { code: message, message } };
  }
}async function executePowerShell(id: string, command: string) {
  const risk = classifyCommand(command);
  const decision = decide(risk, process.env.DESKTOP_MCP_CONFIRM_MEDIUM === 'true');
  if (!decision.allowed) {
    await appendAudit(WORKSPACE, { timestamp: new Date().toISOString(), operation: 'execute_powershell', status: 'blocked', error: decision.reason });
    return { id, success: false, error: { code: 'COMMAND_BLOCKED', message: decision.reason } };
  }
  try {
    const result = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      cwd: WORKSPACE, windowsHide: true, timeout: 120000, maxBuffer: MAX_OUTPUT
    });
    await appendAudit(WORKSPACE, { timestamp: new Date().toISOString(), operation: 'execute_powershell', status: 'success' });
    return { id, success: true, result: { output: (result.stdout + (result.stderr ? '\n' + result.stderr : '')).slice(0, MAX_OUTPUT) } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendAudit(WORKSPACE, { timestamp: new Date().toISOString(), operation: 'execute_powershell', status: 'error', error: message });
    return { id, success: false, error: { code: 'COMMAND_FAILED', message } };
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true, service: 'desktop-agent', ...configSummary() });
  if (req.method !== 'POST' || req.url !== '/execute') return json(res, 404, { error: 'NOT_FOUND' });
  if (!authorized(req)) return json(res, 401, { error: 'AUTH_FAILED' });
  try { return json(res, 200, await execute(await readBody(req))); }
  catch { return json(res, 400, { error: 'INVALID_JSON' }); }
});

server.listen(PORT, '127.0.0.1', () => console.error('Desktop Agent listening on 127.0.0.1:' + PORT));