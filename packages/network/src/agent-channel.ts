import WebSocket from 'ws';

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };
type Channel = { socket: WebSocket; pending: Map<string, Pending> };

const channels = new Map<string, Channel>();

export function attachAgent(deviceId: string, socket: WebSocket) {
  const channel: Channel = { socket, pending: new Map() };
  channels.set(deviceId, channel);
  socket.on('message', raw => {
    try {
      const msg = JSON.parse(String(raw)) as { type: string; id?: string; result?: unknown; error?: string };
      if (msg.type === 'result' && msg.id) {
        const pending = channel.pending.get(msg.id);
        if (pending) {
          channel.pending.delete(msg.id);
          msg.error ? pending.reject(new Error(msg.error)) : pending.resolve(msg.result);
        }
      }
    } catch {}
  });
  socket.on('close', () => {
    if (channels.get(deviceId) === channel) channels.delete(deviceId);
  });
  return channel;
}

export function isAgentOnline(deviceId: string) {
  return channels.get(deviceId)?.socket.readyState === WebSocket.OPEN;
}

export function listOnlineAgents() { return [...channels.keys()]; }

export function executeOnAgent(deviceId: string, operation: string, args: Record<string, unknown>) {
  const channel = channels.get(deviceId);
  if (!channel || channel.socket.readyState !== WebSocket.OPEN) {
    return Promise.reject(new Error('AGENT_OFFLINE'));
  }
  const id = 'rpc_' + Math.random().toString(36).slice(2, 12);
  channel.socket.send(JSON.stringify({ type: 'execute', id, operation, args }));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      channel.pending.delete(id);
      reject(new Error('AGENT_TIMEOUT'));
    }, 120_000);
    channel.pending.set(id, {
      resolve: value => { clearTimeout(timeout); resolve(value); },
      reject: error => { clearTimeout(timeout); reject(error); }
    });
  });
}
