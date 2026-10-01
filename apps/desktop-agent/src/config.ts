import os from 'node:os';

export const PORT = Number(process.env.DESKTOP_MCP_AGENT_PORT ?? 8788);
export const TOKEN = process.env.DESKTOP_MCP_AGENT_TOKEN ?? 'change-me';
export const WORKSPACE = process.env.DESKTOP_MCP_WORKSPACE ?? 'C:\\AI-Workspace';
export const MAX_OUTPUT = Number(process.env.DESKTOP_MCP_MAX_OUTPUT ?? 1_000_000);

export function configSummary() {
  return {
    port: PORT,
    workspace: WORKSPACE,
    hostname: os.hostname(),
    platform: process.platform
  };
}
