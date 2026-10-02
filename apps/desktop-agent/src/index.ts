import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import { copyFile, createDirectory, deleteDirectory, deleteFile, listDirectory, moveFile, readFile, searchFiles, searchInFiles, writeFile } from './filesystem.js';
import { configSummary, DEVICE_NAME, GATEWAY_URL, GATEWAY_WS_URL, MAX_OUTPUT, PAIR_CODE, PORT, saveUserConfig, TOKEN, WORKSPACE } from './config.js';
import { classifyCommand } from '../../../packages/security/src/risk.js';
import { decide } from '../../../packages/policy-engine/src/policy.js';
import { loadPolicy } from '../../../packages/policy-engine/src/store.js';
import { appendAudit } from '../../../packages/logging/src/audit.js';
import { getManaged, listManaged, startManaged, stopManaged, stopAllManaged } from '../../../packages/execution-engine/src/process-manager.js';
import { gitDiff, gitLog, gitStatus, gitWrite } from '../../../packages/tools/src/git.js';
import { openUrl, getPageText, navigate as browserNavigate, selectOption as browserSelect, click as browserClick, submit as submitBrowser, typeText as browserType, waitForElement, screenshot as browserScreenshot, close as browserClose } from '../../../packages/browser/src/session.js';
import { githubStatus, listRepositories, createIssue, createRepository, createPullRequest } from '../../../packages/integrations/src/github.js';
import { gmailRecent, gmailGetMessage, gmailSend, outlookRecent, outlookGetMessage } from '../../../packages/integrations/src/email.js';
import { getSecret, setSecret, deleteSecret } from '../../../packages/auth/src/secrets.js';
import { detectProject } from '../../../packages/project/src/detect.js';
import { createProject } from '../../../packages/project/src/create.js';
import { runProject } from '../../../packages/project/src/run.js';
import { launchApplication, closeApplication, focusApplication } from '../../../packages/tools/src/apps.js';
import { increment, prometheus } from '../../../packages/logging/src/metrics.js';

const execFileAsync = promisify(execFile);
type RequestBody = { id?: string; operation: string; args?: Record<string, unknown> };
let emergencyStopped = false;
const production = process.env.NODE_ENV === 'production';
if (production && TOKEN === 'change-me') throw new Error('PRODUCTION_AGENT_TOKEN_REQUIRED');
if (production && process.env.DESKTOP_MCP_GATEWAY_WS_URL && !process.env.DESKTOP_MCP_GATEWAY_WS_URL.startsWith('wss://')) throw new Error('PRODUCTION_WSS_REQUIRED');

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
  increment('agent_requests_total');
  const id = body.id ?? randomUUID();
  const args = body.args ?? {};
  if (emergencyStopped && !['health', 'system_info'].includes(body.operation)) {
    return { id, success: false, error: { code: 'EMERGENCY_STOP_ACTIVE', message: 'New executions are disabled.' } };
  }
  const runtimePolicy = await loadPolicy();
  if (runtimePolicy.disabledTools.some(tool => tool === body.operation || tool.endsWith('.' + body.operation))) {
    return { id, success: false, error: { code: 'TOOL_DISABLED', message: 'Tool disabled by policy.' } };
  }
  try {
    switch (body.operation) {
      case 'health': return { id, success: true, result: { ...configSummary(), workspace: WORKSPACE } };
      case 'list_directory': return { id, success: true, result: await listDirectory(String(args.path ?? WORKSPACE)) };
      case 'read_file': return { id, success: true, result: await readFile(String(args.path)) };
      case 'create_directory': return { id, success: true, result: await createDirectory(String(args.path)) };
      case 'write_file': return { id, success: true, result: await writeFile(String(args.path), String(args.content ?? '')) };
      case 'delete_file': {
        const policy = decide('high', args.confirmed === true);
        if (!policy.allowed) return { id, success: false, error: { code: 'CONFIRMATION_REQUIRED', message: policy.reason } };
        return { id, success: true, result: await deleteFile(String(args.path)) };
      }
      case 'delete_directory': {
        const policy = decide('high', args.confirmed === true);
        if (!policy.allowed) return { id, success: false, error: { code: 'CONFIRMATION_REQUIRED', message: policy.reason } };
        return { id, success: true, result: await deleteDirectory(String(args.path)) };
      }
      case 'move_file': return { id, success: true, result: await moveFile(String(args.source), String(args.destination)) };
      case 'copy_file': return { id, success: true, result: await copyFile(String(args.source), String(args.destination)) };
      case 'search_files': return { id, success: true, result: await searchFiles(String(args.path ?? WORKSPACE), String(args.pattern ?? '.*')) };
      case 'search_in_files': return { id, success: true, result: await searchInFiles(String(args.path ?? WORKSPACE), String(args.query ?? '')) };
      case 'system_info': return { id, success: true, result: { hostname: process.env.COMPUTERNAME, platform: process.platform, arch: process.arch, node: process.version, pid: process.pid } };
      case 'start_process': {
        const command = String(args.command ?? '');
        const risk = classifyCommand(command);
        const developerAutoConfirm = runtimePolicy.confirmationMode === 'developer' && risk === 'medium';
        const policy = decide(risk, args.confirmed === true || developerAutoConfirm || process.env.DESKTOP_MCP_CONFIRM_MEDIUM === 'true');
        if (!policy.allowed) return { id, success: false, error: { code: 'CONFIRMATION_REQUIRED', message: policy.reason } };
        return { id, success: true, result: startManaged(command, String(args.cwd ?? WORKSPACE)) };
      }
      case 'list_processes': return { id, success: true, result: listManaged() };
      case 'get_process': return { id, success: true, result: getManaged(String(args.id)) };
      case 'stop_process': return { id, success: true, result: { stopped: stopManaged(String(args.id)) } };
      case 'git_status': return { id, success: true, result: await gitStatus(String(args.cwd ?? WORKSPACE)) };
      case 'git_diff': return { id, success: true, result: await gitDiff(String(args.cwd ?? WORKSPACE)) };
      case 'git_log': return { id, success: true, result: await gitLog(String(args.cwd ?? WORKSPACE)) };
      case 'git_add': return { id, success: true, result: await gitWrite('add', String(args.cwd ?? WORKSPACE), undefined, args.confirmed === true) };
      case 'git_commit': return { id, success: true, result: await gitWrite('commit', String(args.cwd ?? WORKSPACE), String(args.message ?? 'Update from Desktop MCP'), args.confirmed === true) };
      case 'git_pull': return { id, success: true, result: await gitWrite('pull', String(args.cwd ?? WORKSPACE), undefined, args.confirmed === true) };
      case 'git_push': return { id, success: true, result: await gitWrite('push', String(args.cwd ?? WORKSPACE), undefined, args.confirmed === true) };
      case 'browser_open_url': return { id, success: true, result: await openUrl(String(args.url)) };
      case 'browser_get_text': return { id, success: true, result: await getPageText(String(args.id)) };
      case 'browser_navigate': return { id, success: true, result: await browserNavigate(String(args.id), String(args.url)) };
      case 'browser_select': return { id, success: true, result: await browserSelect(String(args.id), String(args.selector), String(args.value)) };
      case 'browser_click': return { id, success: true, result: await browserClick(String(args.id), String(args.selector)) };
      case 'browser_submit': return { id, success: true, result: await submitBrowser(String(args.id), String(args.selector)) };
      case 'browser_type': return { id, success: true, result: await browserType(String(args.id), String(args.selector), String(args.text)) };
      case 'browser_wait': return { id, success: true, result: await waitForElement(String(args.id), String(args.selector), Number(args.timeout ?? 15000)) };
      case 'browser_screenshot': return { id, success: true, result: await browserScreenshot(String(args.id)) };
      case 'browser_close': return { id, success: true, result: await browserClose(String(args.id)) };
      case 'github_status': return { id, success: true, result: await githubStatus() };
      case 'github_repositories': return { id, success: true, result: await listRepositories() };
      case 'github_create_repository':
        if (process.env.DESKTOP_MCP_ALLOW_EXTERNAL_WRITES !== 'true' || args.confirmed !== true) return { id, success: false, error: { code: 'EXTERNAL_WRITE_DISABLED', message: 'Enable external writes to create GitHub repositories.' } };
        return { id, success: true, result: await createRepository(String(args.name), String(args.description ?? ''), args.private !== false) };
      case 'github_pull_request':
        if (process.env.DESKTOP_MCP_ALLOW_EXTERNAL_WRITES !== 'true' || args.confirmed !== true) return { id, success: false, error: { code: 'EXTERNAL_WRITE_DISABLED', message: 'Enable external writes to create pull requests.' } };
        return { id, success: true, result: await createPullRequest(String(args.owner), String(args.repo), String(args.title), String(args.head), String(args.base), String(args.body ?? '')) };
      case 'github_issue':
        if (process.env.DESKTOP_MCP_ALLOW_EXTERNAL_WRITES !== 'true' || args.confirmed !== true) return { id, success: false, error: { code: 'EXTERNAL_WRITE_DISABLED', message: 'Enable external writes to create GitHub issues.' } };
        return { id, success: true, result: await createIssue(String(args.owner), String(args.repo), String(args.title), String(args.body ?? '')) };
      case 'gmail_recent': return { id, success: true, result: await gmailRecent(Number(args.maxResults ?? 10)) };
      case 'gmail_get': return { id, success: true, result: await gmailGetMessage(String(args.id)) };
      case 'gmail_send':
        if (process.env.DESKTOP_MCP_ALLOW_EXTERNAL_WRITES !== 'true' || args.confirmed !== true) return { id, success: false, error: { code: 'EXTERNAL_WRITE_DISABLED', message: 'Enable external writes to send email.' } };
        return { id, success: true, result: await gmailSend(String(args.to), String(args.subject), String(args.body)) };
      case 'outlook_recent': return { id, success: true, result: await outlookRecent(Number(args.top ?? 10)) };
      case 'outlook_get': return { id, success: true, result: await outlookGetMessage(String(args.id)) };
      case 'secret_set': await setSecret(String(args.name), String(args.value)); return { id, success: true, result: { saved: true, name: String(args.name) } };
      case 'secret_get': {
        const value = await getSecret(String(args.name));
        return { id, success: true, result: { name: String(args.name), configured: Boolean(value), masked: value ? '********' : null } };
      }
      case 'secret_delete': return { id, success: true, result: { deleted: await deleteSecret(String(args.name)) } };
      case 'project_detect': return { id, success: true, result: await detectProject(String(args.cwd ?? WORKSPACE)) };
      case 'project_create': {
        const policy = decide('medium', args.confirmed === true || runtimePolicy.confirmationMode === 'developer');
        if (!policy.allowed) return { id, success: false, error: { code: 'CONFIRMATION_REQUIRED', message: policy.reason } };
        return { id, success: true, result: await createProject(String(args.kind), String(args.parent ?? WORKSPACE), String(args.name)) };
      }
      case 'project_run': {
        const info = await detectProject(String(args.cwd ?? WORKSPACE));
        if (!info.devCommand) return { id, success: false, error: { code: 'DEV_COMMAND_NOT_FOUND', message: 'No dev/start script found.' } };
        const risk = classifyCommand(info.devCommand);
        const developerAutoConfirm = runtimePolicy.confirmationMode === 'developer' && risk === 'medium';
        const policy = decide(risk, args.confirmed === true || developerAutoConfirm || process.env.DESKTOP_MCP_CONFIRM_MEDIUM === 'true');
        if (!policy.allowed) return { id, success: false, error: { code: 'CONFIRMATION_REQUIRED', message: policy.reason } };
        return { id, success: true, result: await runProject(String(args.cwd ?? WORKSPACE)) };
      }
      case 'app_launch': return { id, success: true, result: await launchApplication(String(args.name), Array.isArray(args.args) ? args.args.map(String) : []) };
      case 'app_close': return { id, success: true, result: await closeApplication(String(args.name)) };
      case 'app_focus': return { id, success: true, result: await focusApplication(String(args.name)) };
      case 'metrics': return { id, success: true, result: prometheus() };
      case 'execute_powershell': return await executePowerShell(id, String(args.command ?? ''), args);
      default: return { id, success: false, error: { code: 'OPERATION_NOT_FOUND', message: body.operation } };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { id, success: false, error: { code: message, message } };
  }
}async function executePowerShell(id: string, command: string, currentArgs: Record<string, unknown> = {}) {
  const normalizedCommand = command.toLowerCase();
  const risk = classifyCommand(command);
  const runtimePolicy = await loadPolicy();
  if (runtimePolicy.blockedCommands.some(term => normalizedCommand.includes(term.toLowerCase()))) {
    await appendAudit(WORKSPACE, { timestamp: new Date().toISOString(), operation: 'execute_powershell', status: 'blocked', error: 'CUSTOM_COMMAND_BLOCKED' });
    return { id, success: false, error: { code: 'COMMAND_BLOCKED', message: 'Command blocked by policy.' } };
  }
  const decision = decide(risk, (currentArgs?.confirmed === true) || process.env.DESKTOP_MCP_CONFIRM_MEDIUM === 'true');
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
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true, service: 'desktop-agent', ...configSummary(), emergencyStopped });
  if (req.method === 'GET' && req.url === '/status') return json(res, 200, { ok: true, service: 'desktop-agent', ...configSummary(), emergencyStopped, processes: listManaged() });
  if (req.method === 'GET' && req.url === '/version') return json(res, 200, { name: 'desktop-mcp-agent', version: process.env.DESKTOP_MCP_AGENT_VERSION ?? '0.2.0', protocol: 'mcp' });
  if (req.method === 'GET' && req.url === '/metrics') {
    if (!authorized(req)) return json(res, 401, { error: 'AUTH_FAILED' });
    res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4' });
    return res.end(prometheus());
  }
  if (req.method === 'POST' && req.url === '/emergency-stop') {
    if (!authorized(req)) return json(res, 401, { error: 'AUTH_FAILED' });
    const stopped = stopAllManaged();
    emergencyStopped = true;
    return json(res, 200, { stopped, emergencyStopped: true });
  }
  if (req.method !== 'POST' || req.url !== '/execute') return json(res, 404, { error: 'NOT_FOUND' });
  if (!authorized(req)) return json(res, 401, { error: 'AUTH_FAILED' });
  try { return json(res, 200, await execute(await readBody(req))); }
  catch { return json(res, 400, { error: 'INVALID_JSON' }); }
});

server.listen(PORT, '127.0.0.1', () => {
  console.error('Desktop Agent listening on 127.0.0.1:' + PORT);
});

async function ensureRemoteIdentity() {
  const gatewayHttp = GATEWAY_URL;
  let deviceId = process.env.DESKTOP_MCP_DEVICE_ID ?? await getSecret('device-id');
  let deviceToken = process.env.DESKTOP_MCP_DEVICE_TOKEN ?? await getSecret('device-token');
  const pairCode = PAIR_CODE;
  if (gatewayHttp && pairCode) {
    const response = await fetch(gatewayHttp + '/api/pair/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: pairCode,
        name: DEVICE_NAME,
        platform: process.platform
      })
    });
    if (!response.ok) throw new Error('PAIRING_HTTP_' + response.status);
    const result = await response.json() as { device: { id: string }; token: string };
    deviceId = result.device.id;
    deviceToken = result.token;
    await setSecret('device-id', deviceId);
    await setSecret('device-token', deviceToken);
    saveUserConfig({ pairCode: undefined, deviceName: DEVICE_NAME });
    console.error('Desktop Agent paired as ' + deviceId);
  }
  return { deviceId, deviceToken };
}

async function startRemoteConnection() {
  const gateway = GATEWAY_WS_URL;
  if (!gateway) return;
  const identity = await ensureRemoteIdentity();
  if (!identity.deviceId || !identity.deviceToken) {
    console.error('Remote mode configured but no device identity is available.');
    return;
  }
  const { deviceId, deviceToken } = identity;

  const connect = () => {
    const socket = new WebSocket(gateway);
    let heartbeat: NodeJS.Timeout | undefined;
    socket.on('open', () => {
      console.error('Remote gateway connection opened: ' + gateway);
      socket.send(JSON.stringify({
        type: 'agent_hello',
        deviceId,
        token: deviceToken,
        platform: process.platform,
        name: process.env.COMPUTERNAME ?? 'Desktop'
      }));
      heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'heartbeat', deviceId }));
      }, 30_000);
    });
    socket.on('message', async raw => {
      let requestId = 'unknown';
      try {
        const msg = JSON.parse(String(raw)) as { type?: string; id?: string; operation?: string; args?: Record<string, unknown> };
        requestId = msg.id ?? 'unknown';
        if (msg.type !== 'execute' || !msg.id || !msg.operation) return;
        const result = await execute({ id: msg.id, operation: msg.operation, args: msg.args });
        if (result.success) {
          socket.send(JSON.stringify({ type: 'result', id: msg.id, result: result.result }));
        } else {
          const errorCode = 'error' in result && result.error ? result.error.code : 'AGENT_ERROR';
          socket.send(JSON.stringify({ type: 'result', id: msg.id, error: errorCode }));
        }
      } catch (error) {
        socket.send(JSON.stringify({ type: 'result', id: requestId, error: error instanceof Error ? error.message : String(error) }));
      }
    });
    socket.on('close', (code, reason) => {
      if (heartbeat) clearInterval(heartbeat);
      console.error('Remote gateway connection closed: ' + code + ' ' + reason.toString());
      setTimeout(connect, 5000);
    });
    socket.on('error', error => console.error('Remote gateway WebSocket error: ' + (error instanceof Error ? error.message : String(error))));
  };

  connect();
}

void startRemoteConnection().catch(error => console.error('Remote connection failed:', error instanceof Error ? error.message : String(error)));
