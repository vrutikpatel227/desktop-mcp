import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const AGENT_URL = process.env.DESKTOP_MCP_AGENT_URL ?? 'http://127.0.0.1:8788';
const TOKEN = process.env.DESKTOP_MCP_AGENT_TOKEN ?? 'change-me';
const WORKSPACE = process.env.DESKTOP_MCP_WORKSPACE ?? 'C:\\AI-Workspace';

async function agent(operation: string, args: Record<string, unknown> = {}) {
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
}function createServer() {
  const server = new McpServer({
    name: process.env.DESKTOP_MCP_SERVER_NAME ?? 'desktop-mcp',
    version: process.env.DESKTOP_MCP_SERVER_VERSION ?? '0.1.0'
  });

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
    inputSchema: z.object({ path: z.string() })
  }, async ({ path }) => textResult(await agent('delete_file', { path })));

  server.registerTool('terminal.execute_powershell', {
    description: 'Execute a validated PowerShell command from the approved workspace.',
    inputSchema: z.object({ command: z.string().min(1).max(20000) })
  }, async ({ command }) => textResult(await agent('execute_powershell', { command })));

  server.registerTool('process.start', {
    description: 'Start a long-running PowerShell process in the approved workspace.',
    inputSchema: z.object({ command: z.string().min(1).max(20000), cwd: z.string().optional() })
  }, async ({ command, cwd }) => textResult(await agent('start_process', { command, cwd: cwd ?? WORKSPACE })));

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
    description: 'Stage all changes. Disabled by default unless Git write access is enabled.',
    inputSchema: z.object({ cwd: z.string().optional() })
  }, async ({ cwd }) => textResult(await agent('git_add', { cwd: cwd ?? WORKSPACE })));

  server.registerTool('git.commit', {
    description: 'Commit staged changes. Disabled by default unless Git write access is enabled.',
    inputSchema: z.object({ cwd: z.string().optional(), message: z.string().min(1).max(200) })
  }, async ({ cwd, message }) => textResult(await agent('git_commit', { cwd: cwd ?? WORKSPACE, message })));

  server.registerTool('git.pull', {
    description: 'Pull Git changes. Disabled by default unless Git write access is enabled.',
    inputSchema: z.object({ cwd: z.string().optional() })
  }, async ({ cwd }) => textResult(await agent('git_pull', { cwd: cwd ?? WORKSPACE })));

  server.registerTool('git.push', {
    description: 'Push Git changes. Disabled by default unless Git write access is enabled.',
    inputSchema: z.object({ cwd: z.string().optional() })
  }, async ({ cwd }) => textResult(await agent('git_push', { cwd: cwd ?? WORKSPACE })));

  server.registerResource(
    'workspace',
    'workspace://root',
    { title: 'Approved workspace', mimeType: 'text/plain' },
    async uri => ({
      contents: [{ uri: uri.href, mimeType: 'text/plain', text: WORKSPACE }]
    })
  );

  server.registerPrompt(
    'create_web_project',
    {
      title: 'Create Web Project',
      description: 'Guide an AI workflow to create and run a web project inside the approved workspace.',
      argsSchema: z.object({
        framework: z.string().default('Next.js')
      })
    },
    ({ framework }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: 'Create a production-ready ' + framework + ' project inside the approved workspace. Inspect the workspace first, create the project, install dependencies, run validation, and report the result.'
        }
      }]
    })
  );

  return server; 
}

serveStdio(createServer);