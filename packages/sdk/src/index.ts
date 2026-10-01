export type DesktopMcpConnection = {
  serverUrl?: string;
  workspace?: string;
  token?: string;
  deviceId?: string;
};

export type DesktopMcpToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
};

export function createConfig(input: Partial<DesktopMcpConnection> = {}): DesktopMcpConnection {
  return {
    serverUrl: input.serverUrl ?? 'http://127.0.0.1:8790/mcp',
    workspace: input.workspace ?? process.env.DESKTOP_MCP_WORKSPACE,
    token: input.token ?? process.env.DESKTOP_MCP_AGENT_TOKEN,
    deviceId: input.deviceId ?? process.env.DESKTOP_MCP_DEVICE_ID
  };
}
