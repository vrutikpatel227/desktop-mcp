import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { listPlugins } from '../../plugins/src/registry.js';
import { classifyCommand } from '../../security/src/risk.js';
import { decide } from '../../policy-engine/src/policy.js';

const AGENT_URL = process.env.DESKTOP_MCP_AGENT_URL ?? 'http://127.0.0.1:8788';
const TOKEN = process.env.DESKTOP_MCP_AGENT_TOKEN ?? 'change-me';
const WORKSPACE = process.env.DESKTOP_MCP_WORKSPACE ?? 'C:\\AI-Workspace';

async function agent(operation: string, args: Record<string, unknown> = {}) {
  const deviceId = typeof args.deviceId === 'string' ? args.deviceId : undefined;
  if (deviceId && process.env.DESKTOP_MCP_GATEWAY_INTERNAL_TOKEN) {
    const gateway = process.env.DESKTOP_MCP_GATEWAY_URL ?? 'http://127.0.0.1:8790';
    const routedArgs = { ...args };
    delete routedArgs.deviceId;
    const routed = await fetch(gateway + '/api/devices/' + encodeURIComponent(deviceId) + '/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.DESKTOP_MCP_GATEWAY_INTERNAL_TOKEN },
      body: JSON.stringify({ operation, args: routedArgs })
    });
    if (!routed.ok) throw new Error('REMOTE_AGENT_HTTP_' + routed.status);
    const remote = await routed.json() as { success?: boolean; result?: unknown; error?: string };
    if (remote.success === false) throw new Error(remote.error ?? 'REMOTE_AGENT_ERROR');
    return Object.prototype.hasOwnProperty.call(remote, 'result') ? remote.result : remote;
  }
  const response = await fetch(AGENT_URL + '/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({ operation, args })
  });
  if (!response.ok) throw new Error('AGENT_HTTP_' + response.status);
  const data = await response.json() as { success: boolean; result?: unknown; error?: { code: string; message: string } };
  if (!data.success) throw new Error(data.error?.code ?? 'AGENT_ERROR');
  return data.result;
}

function textResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

export function createDesktopMcpServer() {
  const server = new McpServer({ name: 'desktop-mcp', version: '0.2.0' });
  server.registerTool('system.get_info', {
    description: 'Get local desktop system information.',
    inputSchema: z.object({})
  }, async () => textResult(await agent('system_info')));

  server.registerTool('agent.health', {
    description: 'Check whether the local Desktop Agent is online.',
    inputSchema: z.object({})
  }, async () => textResult(await agent('health')));

  server.registerTool('filesystem.list_directory', {
    description: 'List files and folders inside the approved workspace.',
    inputSchema: z.object({ path: z.string().default(WORKSPACE) })
  }, async ({ path }) => textResult(await agent('list_directory', { path })));

  server.registerTool('filesystem.read_file', {
    description: 'Read a UTF-8 text file inside the approved workspace.',
    inputSchema: z.object({ path: z.string() })
  }, async ({ path }) => textResult(await agent('read_file', { path })));

  server.registerTool('filesystem.create_directory', {
    description: 'Create a directory inside the approved workspace.',
    inputSchema: z.object({ path: z.string() })
  }, async ({ path }) => textResult(await agent('create_directory', { path })));
  server.registerTool('filesystem.write_file', {
    description: 'Create or overwrite a UTF-8 text file inside the approved workspace.',
    inputSchema: z.object({ path: z.string(), content: z.string() })
  }, async ({ path, content }) => textResult(await agent('write_file', { path, content })));

  server.registerTool('filesystem.delete_file', {
    description: 'Delete a file inside the approved workspace.',
    inputSchema: z.object({ path: z.string(), confirmed: z.boolean().default(false) })
  }, async ({ path, confirmed }) => textResult(await agent('delete_file', { path, confirmed })));

  server.registerTool('filesystem.delete_directory', {
    description: 'Delete a directory inside the approved workspace; requires confirmation.',
    inputSchema: z.object({ path: z.string(), confirmed: z.boolean().default(false) })
  }, async ({ path, confirmed }) => textResult(await agent('delete_directory', { path, confirmed })));

  server.registerTool('filesystem.move_file', {
    description: 'Move or rename a file inside the approved workspace.',
    inputSchema: z.object({ source: z.string(), destination: z.string() })
  }, async ({ source, destination }) => textResult(await agent('move_file', { source, destination })));

  server.registerTool('filesystem.copy_file', {
    description: 'Copy a file or directory inside the approved workspace.',
    inputSchema: z.object({ source: z.string(), destination: z.string() })
  }, async ({ source, destination }) => textResult(await agent('copy_file', { source, destination })));

  server.registerTool('filesystem.search_files', {
    description: 'Search filenames recursively inside an approved workspace.',
    inputSchema: z.object({ path: z.string().optional(), pattern: z.string().default('.*') })
  }, async ({ path, pattern }) => textResult(await agent('search_files', { path: path ?? WORKSPACE, pattern })));

  server.registerTool('filesystem.search_in_files', {
    description: 'Search text inside files recursively in an approved workspace.',
    inputSchema: z.object({ path: z.string().optional(), query: z.string().min(1) })
  }, async ({ path, query }) => textResult(await agent('search_in_files', { path: path ?? WORKSPACE, query })));

  server.registerTool('terminal.execute_powershell', {
    description: 'Execute a validated PowerShell command from the approved workspace.',
    inputSchema: z.object({ command: z.string().min(1).max(20000), confirmed: z.boolean().default(false) })
  }, async ({ command, confirmed }) => {
    const risk = classifyCommand(command);
    const policy = decide(risk, confirmed || process.env.DESKTOP_MCP_CONFIRM_MEDIUM === 'true');
    if (!policy.allowed) return textResult({ success: false, error: policy.reason, risk, requiresConfirmation: policy.requiresConfirmation });
    return textResult(await agent('execute_powershell', { command, confirmed }));
  });
  server.registerTool('process.start', {
    description: 'Start a long-running PowerShell process in the approved workspace.',
    inputSchema: z.object({ command: z.string().min(1).max(20000), cwd: z.string().optional(), confirmed: z.boolean().default(false) })
  }, async ({ command, cwd, confirmed }) => textResult(await agent('start_process', { command, cwd: cwd ?? WORKSPACE, confirmed })));

  server.registerTool('process.list', {
    description: 'List processes started by Desktop MCP.',
    inputSchema: z.object({})
  }, async () => textResult(await agent('list_processes')));

  server.registerTool('process.get', {
    description: 'Get status and recent logs for a managed process.',
    inputSchema: z.object({ id: z.string() })
  }, async ({ id }) => textResult(await agent('get_process', { id })));

  server.registerTool('process.stop', {
    description: 'Stop a managed process.',
    inputSchema: z.object({ id: z.string() })
  }, async ({ id }) => textResult(await agent('stop_process', { id })));
  server.registerTool('git.status', {
    description: 'Show Git branch and working tree status.',
    inputSchema: z.object({ cwd: z.string().optional() })
  }, async ({ cwd }) => textResult(await agent('git_status', { cwd: cwd ?? WORKSPACE })));

  server.registerTool('git.diff', {
    description: 'Show current Git diff.',
    inputSchema: z.object({ cwd: z.string().optional() })
  }, async ({ cwd }) => textResult(await agent('git_diff', { cwd: cwd ?? WORKSPACE })));

  server.registerTool('git.log', {
    description: 'Show recent Git commits.',
    inputSchema: z.object({ cwd: z.string().optional() })
  }, async ({ cwd }) => textResult(await agent('git_log', { cwd: cwd ?? WORKSPACE })));

  server.registerTool('git.add', {
    description: 'Stage all changes; requires Git write access.',
    inputSchema: z.object({ cwd: z.string().optional(), confirmed: z.boolean().default(false) })
  }, async ({ cwd, confirmed }) => textResult(await agent('git_add', { cwd: cwd ?? WORKSPACE, confirmed })));

  server.registerTool('git.commit', {
    description: 'Commit staged changes; requires Git write access.',
    inputSchema: z.object({ cwd: z.string().optional(), message: z.string().min(1).max(200), confirmed: z.boolean().default(false) })
  }, async ({ cwd, message, confirmed }) => textResult(await agent('git_commit', { cwd: cwd ?? WORKSPACE, message, confirmed })));
  server.registerTool('git.pull', {
    description: 'Pull Git changes; requires Git write access.',
    inputSchema: z.object({ cwd: z.string().optional(), confirmed: z.boolean().default(false) })
  }, async ({ cwd, confirmed }) => textResult(await agent('git_pull', { cwd: cwd ?? WORKSPACE, confirmed })));

  server.registerTool('git.push', {
    description: 'Push Git changes; requires Git write access.',
    inputSchema: z.object({ cwd: z.string().optional(), confirmed: z.boolean().default(false) })
  }, async ({ cwd, confirmed }) => textResult(await agent('git_push', { cwd: cwd ?? WORKSPACE, confirmed })));

  server.registerTool('browser.open_url', {
    description: 'Open a URL in an isolated Playwright browser session.',
    inputSchema: z.object({ url: z.string().url() })
  }, async ({ url }) => textResult(await agent('browser_open_url', { url })));

  server.registerTool('browser.get_page_text', {
    description: 'Extract visible text from a browser session.',
    inputSchema: z.object({ id: z.string() })
  }, async ({ id }) => textResult(await agent('browser_get_text', { id })));

  server.registerTool('browser.navigate', {
    description: 'Navigate an existing browser session to a safe URL.',
    inputSchema: z.object({ id: z.string(), url: z.string().url() })
  }, async ({ id, url }) => textResult(await agent('browser_navigate', { id, url })));

  server.registerTool('browser.select', {
    description: 'Select an option in a native HTML select control.',
    inputSchema: z.object({ id: z.string(), selector: z.string(), value: z.string() })
  }, async ({ id, selector, value }) => textResult(await agent('browser_select', { id, selector, value })));

  server.registerTool('browser.click', {
    description: 'Click a CSS selector in a browser session.',
    inputSchema: z.object({ id: z.string(), selector: z.string().min(1).max(1000) })
  }, async ({ id, selector }) => textResult(await agent('browser_click', { id, selector })));

  server.registerTool('browser.submit', {
    description: 'Submit the nearest HTML form for a selector in a browser session.',
    inputSchema: z.object({ id: z.string(), selector: z.string().min(1).max(1000) })
  }, async ({ id, selector }) => textResult(await agent('browser_submit', { id, selector })));

  server.registerTool('browser.type', {
    description: 'Fill a field in a browser session.',
    inputSchema: z.object({ id: z.string(), selector: z.string().min(1), text: z.string().max(10000) })
  }, async ({ id, selector, text }) => textResult(await agent('browser_type', { id, selector, text })));

  server.registerTool('browser.screenshot', {
    description: 'Capture a browser page screenshot.',
    inputSchema: z.object({ id: z.string() })
  }, async ({ id }) => textResult(await agent('browser_screenshot', { id })));

  server.registerTool('browser.wait', {
    description: 'Wait until a browser selector becomes visible.',
    inputSchema: z.object({ id: z.string(), selector: z.string().min(1), timeout: z.number().int().min(100).max(60000).default(15000) })
  }, async ({ id, selector, timeout }) => textResult(await agent('browser_wait', { id, selector, timeout })));

  server.registerTool('browser.close', {
    description: 'Close a browser session.',
    inputSchema: z.object({ id: z.string() })
  }, async ({ id }) => textResult(await agent('browser_close', { id })));

  server.registerTool('github.status', {
    description: 'Check the configured GitHub identity.',
    inputSchema: z.object({})
  }, async () => textResult(await agent('github_status')));

  server.registerTool('github.repositories', {
    description: 'List repositories visible to the configured GitHub token.',
    inputSchema: z.object({})
  }, async () => textResult(await agent('github_repositories')));

  server.registerTool('github.create_repository', {
    description: 'Create a GitHub repository. External writes must be enabled.',
    inputSchema: z.object({ name: z.string().min(1).max(100), description: z.string().max(500).optional(), private: z.boolean().default(true), confirmed: z.boolean().default(false) })
  }, async ({ name, description, private: isPrivate, confirmed }) => textResult(await agent('github_create_repository', { name, description, private: isPrivate, confirmed })));

  server.registerTool('github.pull_request', {
    description: 'Create a GitHub pull request. External writes must be enabled.',
    inputSchema: z.object({ owner: z.string(), repo: z.string(), title: z.string(), head: z.string(), base: z.string(), body: z.string().optional(), confirmed: z.boolean().default(false) })
  }, async ({ owner, repo, title, head, base, body, confirmed }) => textResult(await agent('github_pull_request', { owner, repo, title, head, base, body, confirmed })));

  server.registerTool('github.issue', {
    description: 'Create a GitHub issue using the configured token.',
    inputSchema: z.object({ owner: z.string(), repo: z.string(), title: z.string(), body: z.string().optional(), confirmed: z.boolean().default(false) })
  }, async ({ owner, repo, title, body, confirmed }) => textResult(await agent('github_issue', { owner, repo, title, body, confirmed })));

  server.registerTool('email.gmail_recent', {
    description: 'List recent Gmail message metadata using a configured OAuth access token.',
    inputSchema: z.object({ maxResults: z.number().int().min(1).max(50).default(10) })
  }, async ({ maxResults }) => textResult(await agent('gmail_recent', { maxResults })));

  server.registerTool('email.gmail_get', {
    description: 'Read Gmail message metadata for a message ID.',
    inputSchema: z.object({ id: z.string().min(1) })
  }, async ({ id }) => textResult(await agent('gmail_get', { id })));

  server.registerTool('email.gmail_send', {
    description: 'Send a Gmail message using a configured OAuth access token.',
    inputSchema: z.object({ to: z.string().email(), subject: z.string(), body: z.string(), confirmed: z.boolean().default(false) })
  }, async ({ to, subject, body, confirmed }) => textResult(await agent('gmail_send', { to, subject, body, confirmed })));

  server.registerTool('email.outlook_recent', {
    description: 'List recent Outlook messages using a configured Microsoft Graph OAuth access token.',
    inputSchema: z.object({ top: z.number().int().min(1).max(50).default(10) })
  }, async ({ top }) => textResult(await agent('outlook_recent', { top })));

  server.registerTool('email.outlook_get', {
    description: 'Read an Outlook message using Microsoft Graph.',
    inputSchema: z.object({ id: z.string().min(1) })
  }, async ({ id }) => textResult(await agent('outlook_get', { id })));

  server.registerTool('project.detect', {
    description: 'Detect the framework, package manager, scripts and port for a project.',
    inputSchema: z.object({ cwd: z.string().optional() })
  }, async ({ cwd }) => textResult(await agent('project_detect', { cwd: cwd ?? WORKSPACE })));

  server.registerTool('project.create', {
    description: 'Create a supported web project inside the approved workspace; requires confirmation.',
    inputSchema: z.object({
      kind: z.enum(['nextjs', 'vite-react']),
      parent: z.string().optional(),
      name: z.string().min(1).max(80),
      confirmed: z.boolean().default(false)
    })
  }, async ({ kind, parent, name, confirmed }) => textResult(await agent('project_create', {
    kind, parent: parent ?? WORKSPACE, name, confirmed
  })));

  server.registerTool('project.run', {
    description: 'Detect and start the development server for a project.',
    inputSchema: z.object({ cwd: z.string().optional() })
  }, async ({ cwd }) => textResult(await agent('project_run', { cwd: cwd ?? WORKSPACE })));

  server.registerTool('app.launch', {
    description: 'Launch an application from the safe application allowlist.',
    inputSchema: z.object({
      name: z.enum(['vscode', 'chrome', 'edge', 'powershell']),
      args: z.array(z.string()).optional()
    })
  }, async ({ name, args }) => textResult(await agent('app_launch', { name, args })));

  server.registerTool('app.close', {
    description: 'Close an application from the safe application allowlist.',
    inputSchema: z.object({
      name: z.enum(['vscode', 'chrome', 'edge', 'powershell'])
    })
  }, async ({ name }) => textResult(await agent('app_close', { name })));

  server.registerTool('app.focus', {
    description: 'Focus an application from the safe application allowlist.',
    inputSchema: z.object({
      name: z.enum(['vscode', 'chrome', 'edge', 'powershell'])
    })
  }, async ({ name }) => textResult(await agent('app_focus', { name })));

  server.registerTool('secrets.set', {
    description: 'Store a secret in the local encrypted secret store.',
    inputSchema: z.object({ name: z.string().min(1).max(100), value: z.string().min(1).max(10000) })
  }, async ({ name, value }) => textResult(await agent('secret_set', { name, value })));

  server.registerTool('secrets.get', {
    description: 'Retrieve a secret by name from the local secret store.',
    inputSchema: z.object({ name: z.string().min(1).max(100) })
  }, async ({ name }) => textResult(await agent('secret_get', { name })));

  server.registerTool('secrets.delete', {
    description: 'Delete a secret from the local secret store.',
    inputSchema: z.object({ name: z.string().min(1).max(100) })
  }, async ({ name }) => textResult(await agent('secret_delete', { name })));

  server.registerTool('device.execute', {
    description: 'Execute a supported Desktop MCP operation on a paired device.',
    inputSchema: z.object({
      deviceId: z.string().min(1),
      operation: z.string().min(1),
      args: z.record(z.string(), z.unknown()).optional()
    })
  }, async ({ deviceId, operation, args }) => textResult(await agent(operation, { ...(args ?? {}), deviceId })));

  server.registerTool('plugin.list', {
    description: 'List discovered plugin manifests. Untrusted plugins are not executable by default.',
    inputSchema: z.object({})
  }, async () => textResult(await listPlugins()));

  server.registerTool('system.metrics', {
    description: 'Return local execution metrics in Prometheus text format.',
    inputSchema: z.object({})
  }, async () => textResult(await agent('metrics')));

  server.registerTool('device.list', {
    description: 'List paired devices through the remote gateway when available.',
    inputSchema: z.object({})
  }, async () => {
    const gateway = process.env.DESKTOP_MCP_GATEWAY_URL;
    const internal = process.env.DESKTOP_MCP_GATEWAY_INTERNAL_TOKEN;
    if (!gateway || !internal) return textResult([{ id: 'local', name: 'Local Agent', online: true }]);
    const response = await fetch(gateway + '/api/devices', {
      headers: { authorization: 'Bearer ' + internal }
    });
    if (!response.ok) throw new Error('DEVICE_LIST_HTTP_' + response.status);
    return textResult(await response.json());
  });

  server.registerResource(
    'workspace',
    'workspace://root',
    { title: 'Approved workspace', mimeType: 'text/plain' },
    async uri => ({ contents: [{ uri: uri.href, mimeType: 'text/plain', text: WORKSPACE }] })
  );
  server.registerPrompt(
    'create_web_project',
    {
      title: 'Create Web Project',
      description: 'Create and run a web project inside the approved workspace.',
      argsSchema: z.object({ framework: z.string().default('Next.js') })
    },
    ({ framework }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: 'Create a production-ready ' + framework + ' project inside the approved workspace. Inspect first, create it, install dependencies, validate and report.'
        }
      }]
    })
  );

  return server;
}
