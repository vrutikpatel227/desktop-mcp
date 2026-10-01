import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const configDir = process.env.APPDATA ? path.join(process.env.APPDATA, 'DesktopMCP') : path.join(os.homedir(), '.desktop-mcp');
const configFile = path.join(configDir, 'config.json');
type UserConfig = { gatewayUrl?: string; gatewayWsUrl?: string; pairCode?: string; deviceName?: string; workspace?: string };
function readUserConfig(): UserConfig {
  try { return JSON.parse(fs.readFileSync(configFile, 'utf8')) as UserConfig; } catch { return {}; }
}
export const USER_CONFIG = readUserConfig();
export const GATEWAY_URL = process.env.DESKTOP_MCP_GATEWAY_URL ?? USER_CONFIG.gatewayUrl;
export const GATEWAY_WS_URL = process.env.DESKTOP_MCP_GATEWAY_WS_URL ?? USER_CONFIG.gatewayWsUrl;
export const PAIR_CODE = process.env.DESKTOP_MCP_PAIR_CODE ?? USER_CONFIG.pairCode;
export const DEVICE_NAME = process.env.DESKTOP_MCP_DEVICE_NAME ?? USER_CONFIG.deviceName ?? os.hostname();
export const PORT = Number(process.env.DESKTOP_MCP_AGENT_PORT ?? 8788);
export const TOKEN = process.env.DESKTOP_MCP_AGENT_TOKEN ?? 'change-me';
export const WORKSPACE = process.env.DESKTOP_MCP_WORKSPACE ?? USER_CONFIG.workspace ?? 'C:\\AI-Workspace';
export const MAX_OUTPUT = Number(process.env.DESKTOP_MCP_MAX_OUTPUT ?? 1_000_000);

export function saveUserConfig(next: Partial<UserConfig>) {
  const current = readUserConfig();
  const merged = { ...current, ...next };
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify(merged, null, 2), { encoding: 'utf8', mode: 0o600 });
}

export function configSummary() {
  return {
    port: PORT,
    workspace: WORKSPACE,
    hostname: os.hostname(),
    platform: process.platform
  };
}
