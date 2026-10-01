import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { URL } from 'node:url';
import WebSocket, { WebSocketServer } from 'ws';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createDesktopMcpServer } from '../../../packages/protocol/src/desktop-server.js';
import { verifyToken } from '../../../packages/auth/src/token.js';
import {
  completePairing, listDevices, requireDevice, revokeDevice, rotateDeviceToken, startPairing, touchDevice
} from '../../../packages/auth/src/pairing.js';
import { authorize, exchangeCode as oauthExchange, oauthMetadata, registerClient as oauthRegister } from '../../../packages/auth/src/oauth.js';
import { protectedResourceMetadata } from '../../../packages/auth/src/metadata.js';
import { attachAgent, executeOnAgent, isAgentOnline } from '../../../packages/network/src/agent-channel.js';
import { RateLimiter } from '../../../packages/network/src/rate-limit.js';
import { loadPolicy, savePolicy } from '../../../packages/policy-engine/src/store.js';
import { RedisRateLimiter } from '../../../packages/network/src/redis-rate-limit.js';
import { addMember, listMembers, removeMember, setRole, type Role } from '../../../packages/auth/src/team.js';
import { verifyOidcToken } from '../../../packages/auth/src/oidc.js';
import { increment, prometheus } from '../../../packages/logging/src/metrics.js';
import { classifyCommand } from '../../../packages/security/src/risk.js';
import { decide } from '../../../packages/policy-engine/src/policy.js';
import { getAuditStore } from '../../../packages/logging/src/audit-store.js';

const PORT = Number(process.env.DESKTOP_MCP_GATEWAY_PORT ?? 8790);
const ISSUER = process.env.DESKTOP_MCP_ISSUER ?? ('http://127.0.0.1:' + PORT);
const ADMIN_TOKEN = process.env.DESKTOP_MCP_ADMIN_TOKEN ?? 'change-me-admin';
const production = process.env.NODE_ENV === 'production';
const tlsConfigured = Boolean(process.env.DESKTOP_MCP_TLS_CERT && process.env.DESKTOP_MCP_TLS_KEY && fs.existsSync(process.env.DESKTOP_MCP_TLS_CERT) && fs.existsSync(process.env.DESKTOP_MCP_TLS_KEY));
if (production) {
  if (ADMIN_TOKEN === 'change-me-admin') throw new Error('PRODUCTION_ADMIN_TOKEN_REQUIRED');
  if (!process.env.DESKTOP_MCP_DATABASE_URL) throw new Error('PRODUCTION_DATABASE_REQUIRED');
  if (!tlsConfigured && process.env.DESKTOP_MCP_TRUST_PROXY_TLS !== 'true') throw new Error('PRODUCTION_TLS_REQUIRED');
  if (!ISSUER.startsWith('https://')) throw new Error('PRODUCTION_HTTPS_ISSUER_REQUIRED');
}
process.env.DESKTOP_MCP_GATEWAY_URL = ISSUER;
process.env.DESKTOP_MCP_GATEWAY_INTERNAL_TOKEN = ADMIN_TOKEN;
const memoryLimiter = new RateLimiter(100, 60_000);
const pairingMemoryLimiter = new RateLimiter(10, 5 * 60_000);
const limiter = process.env.REDIS_URL ? new RedisRateLimiter(process.env.REDIS_URL, 100, 60_000) : memoryLimiter;
const pairingLimiter = process.env.REDIS_URL ? new RedisRateLimiter(process.env.REDIS_URL, 10, 5 * 60_000) : pairingMemoryLimiter;
const oauthRegisterLimiter = process.env.REDIS_URL ? new RedisRateLimiter(process.env.REDIS_URL, 20, 5 * 60_000) : new RateLimiter(20, 5 * 60_000);
const auditRetentionDays = Math.max(1, Number(process.env.DESKTOP_MCP_AUDIT_RETENTION_DAYS ?? 30));
setInterval(() => { void getAuditStore().then(store => store.prune(auditRetentionDays)).catch(() => {}); }, 6 * 60 * 60 * 1000).unref();

const mcpHandler = createMcpHandler(createDesktopMcpServer);

function json(res: http.ServerResponse, status: number, body: unknown, headers: Record<string,string> = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

async function audit(actor: string, action: string, status: 'success' | 'denied' | 'error', target?: string) {
  try {
    await (await getAuditStore()).append({ timestamp: new Date().toISOString(), actor, action, status, target });
  } catch {}
}

async function body(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const part = Buffer.from(chunk);
    total += part.length;
    if (total > 1_000_000) throw new Error('PAYLOAD_TOO_LARGE');
    chunks.push(part);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

async function bearer(req: http.IncomingMessage) {
  const value = req.headers.authorization;
  if (!value?.startsWith('Bearer ')) return null;
  try { return await verifyToken(value.slice(7)); } catch { return null; }
}

async function authorized(req: http.IncomingMessage) {
  if (req.headers.authorization === 'Bearer ' + ADMIN_TOKEN) return { sub: 'admin', scopes: ['mcp', 'admin'], deviceId: 'admin' };
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  try {
    const claims = await verifyToken(token);
    if (claims.scopes.includes('device')) await requireDevice(token);
    return claims;
  } catch {
    try { return await verifyOidcToken(token); } catch { return null; }
  }
}

async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  if (req.method === 'POST' && url.pathname === '/api/pair/complete') {
    const ip = req.socket.remoteAddress ?? 'unknown';
    if (!(await pairingLimiter.allow('pair:' + ip))) return json(res, 429, { error: 'RATE_LIMITED' });
    try {
      const data = await body(req);
      const result = await completePairing(String(data.code), String(data.name ?? 'Desktop'), String(data.platform ?? 'unknown'));
      return json(res, 200, result);
    } catch (error) {
      return json(res, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  }
  const auth = await authorized(req);
  if (!auth) return json(res, 401, { error: 'AUTH_FAILED' });
  const adminOnly = url.pathname === '/api/pair/start' || url.pathname === '/api/devices' || url.pathname === '/api/team/members' || url.pathname === '/api/policy' || url.pathname === '/api/audit' || /^\/api\/devices\/[^/]+(?:\/execute|\/revoke|\/rotate)$/.test(url.pathname) || /^\/api\/team\/members\/[^/]+$/.test(url.pathname);
  if (adminOnly && !auth.scopes.includes('admin')) return json(res, 403, { error: 'ADMIN_REQUIRED' });
  const key = auth.sub + ':' + (url.pathname.split('/')[2] ?? 'api');
  const policy = await loadPolicy();
  if (!limiter.allow(key, Math.max(1, Math.min(policy.maxRequestsPerMinute, 10000)))) return json(res, 429, { error: 'RATE_LIMITED' });

  if (req.method === 'GET' && url.pathname === '/api/audit') {
    return json(res, 200, await (await getAuditStore()).recent(100));
  }

  if (req.method === 'GET' && url.pathname === '/api/policy') {
    return json(res, 200, await loadPolicy());
  }

  if (req.method === 'POST' && url.pathname === '/api/policy') {
    try {
      const input = await body(req);
      const disabledTools = Array.isArray(input.disabledTools) ? input.disabledTools.map(String).filter(Boolean).slice(0, 100) : [];
      const blockedCommands = Array.isArray(input.blockedCommands) ? input.blockedCommands.map(String).filter(Boolean).slice(0, 100) : [];
      const maxRequestsPerMinute = Math.max(1, Math.min(10000, Number(input.maxRequestsPerMinute ?? 100)));
      const confirmationMode = ['safe', 'balanced', 'developer'].includes(String(input.confirmationMode)) ? String(input.confirmationMode) as 'safe' | 'balanced' | 'developer' : 'balanced';
      return json(res, 200, await savePolicy({ disabledTools, blockedCommands, maxRequestsPerMinute, confirmationMode }));
    } catch (error) {
      return json(res, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/status') {
    const devices = await listDevices();
    return json(res, 200, {
      service: 'desktop-mcp-gateway',
      mcp: '/mcp',
      onlineDevices: devices.filter(d => isAgentOnline(d.id)).length,
      devices: devices.length
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/devices') {
    const devices = await listDevices();
    return json(res, 200, devices.map(d => ({ ...d, online: isAgentOnline(d.id) })));
  }

  if (req.method === 'POST' && url.pathname === '/api/pair/start') {
    const result = startPairing();
    await audit(auth.sub, 'pair.start', 'success');
    return json(res, 200, result);
  }

  if (req.method === 'POST' && url.pathname === '/api/pair/complete') {
    const data = await body(req);
    try {
      const result = await completePairing(String(data.code), String(data.name ?? 'Desktop'), String(data.platform ?? 'unknown'));
      return json(res, 200, result);
    } catch (error) {
      return json(res, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/team/members') {
    return json(res, 200, await listMembers());
  }

  if (req.method === 'POST' && url.pathname === '/api/team/members') {
    const data = await body(req);
    try {
      const member = await addMember(String(data.email), String(data.name), String(data.role ?? 'Developer') as Role);
      return json(res, 201, member);
    } catch (error) {
      return json(res, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  const memberMatch = url.pathname.match(/^\/api\/team\/members\/([^/]+)$/);
  if (memberMatch) {
    const memberId = decodeURIComponent(memberMatch[1]);
    if (req.method === 'PATCH') {
      const data = await body(req);
      try { return json(res, 200, await setRole(memberId, String(data.role) as Role)); }
      catch (error) { return json(res, 400, { error: error instanceof Error ? error.message : String(error) }); }
    }
    if (req.method === 'DELETE') return json(res, 200, { removed: await removeMember(memberId) });
  }

  if (req.method === 'GET' && url.pathname === '/api/policy') {
    return json(res, 200, await loadPolicy());
  }

  const deviceMatch = url.pathname.match(/^\/api\/devices\/([^/]+)(?:\/(execute|revoke|rotate))?$/);
  if (deviceMatch) {
    const deviceId = decodeURIComponent(deviceMatch[1]);
    const action = deviceMatch[2];
    if (req.method === 'POST' && action === 'rotate') {
      const token = await rotateDeviceToken(deviceId);
      await audit(auth.sub, 'device.rotate', 'success', deviceId);
      return json(res, 200, { token, rotated: true });
    }
    if (req.method === 'POST' && action === 'revoke') {
      const revoked = await revokeDevice(deviceId);
      await audit(auth.sub, 'device.revoke', revoked ? 'success' : 'error', deviceId);
      return json(res, 200, { revoked });
    }
    if (req.method === 'POST' && action === 'execute') {
      const data = await body(req);
      const operation = String(data.operation);
      const args = (data.args ?? {}) as Record<string, unknown>;
      const policy = await loadPolicy();
      if (policy.disabledTools.includes(operation)) return json(res, 403, { error: 'TOOL_DISABLED' });
      const commandText = typeof args.command === 'string' ? args.command.toLowerCase() : '';
      if (commandText && policy.blockedCommands.some(pattern => commandText.includes(pattern.toLowerCase()))) {
        return json(res, 403, { error: 'COMMAND_BLOCKED', reason: 'CENTRAL_POLICY_BLOCK' });
      }
      if (operation === 'execute_powershell' || operation === 'start_process') {
        const risk = classifyCommand(String(args.command ?? ''));
        const developerAutoConfirm = policy.confirmationMode === 'developer' && risk === 'medium';
        const decision = decide(risk, args.confirmed === true || developerAutoConfirm);
        if (!decision.allowed) return json(res, 403, { error: 'CONFIRMATION_REQUIRED', reason: decision.reason, risk, requiresConfirmation: decision.requiresConfirmation });
      }
      try {
        const result = await executeOnAgent(deviceId, operation, args);
        increment('gateway_remote_execute_total');
        await audit(auth.sub, 'device.execute', 'success', deviceId);
        return json(res, 200, result);
      } catch (error) {
        return json(res, 502, { error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  return json(res, 404, { error: 'NOT_FOUND' });
}
function html(res: http.ServerResponse, status: number, content: string) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(content);
}

function oauthBasicAuthorized(req: http.IncomingMessage) {
  if (!production) return true;
  const expectedUser = process.env.DESKTOP_MCP_OAUTH_USER;
  const expectedPassword = process.env.DESKTOP_MCP_OAUTH_PASSWORD;
  if (!expectedUser || !expectedPassword) return false;
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Basic ')) return false;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return false;
    return decoded.slice(0, separator) === expectedUser && decoded.slice(separator + 1) === expectedPassword;
  } catch { return false; }
}

async function handleOAuth(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  if (req.method === 'GET' && url.pathname === '/.well-known/oauth-authorization-server') {
    return json(res, 200, oauthMetadata(ISSUER));
  }
  if (req.method === 'GET' && url.pathname === '/.well-known/oauth-protected-resource') {
    return json(res, 200, protectedResourceMetadata(ISSUER, ISSUER + '/mcp'));
  }
  if (req.method === 'POST' && url.pathname === '/oauth/register') {
    const ip = req.socket.remoteAddress ?? 'unknown';
    if (!(await oauthRegisterLimiter.allow('oauth-register:' + ip))) return json(res, 429, { error: 'rate_limited' });
    try {
      const data = await body(req);
      return json(res, 201, await oauthRegister(
        Array.isArray(data.redirect_uris) ? data.redirect_uris.map(String) : [],
        typeof data.client_name === 'string' ? data.client_name : undefined
      ));
    } catch { return json(res, 400, { error: 'invalid_client_metadata' }); }
  }
  if (req.method === 'GET' && url.pathname === '/oauth/authorize') {
    if (!oauthBasicAuthorized(req)) return json(res, 401, { error: 'login_required' }, { 'www-authenticate': 'Basic realm="Desktop MCP OAuth"' });
    const clientId = url.searchParams.get('client_id') ?? '';
    const redirectUri = url.searchParams.get('redirect_uri') ?? '';
    const challenge = url.searchParams.get('code_challenge') ?? '';
    const scope = url.searchParams.get('scope') ?? 'mcp';
    const state = url.searchParams.get('state') ?? '';
    const action = '/oauth/approve?' + new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, code_challenge: challenge, scope, state
    }).toString();
    return html(res, 200, '<!doctype html><html><body style="font-family:sans-serif;max-width:560px;margin:60px auto"><h1>Desktop MCP Authorization</h1><p>Approve this MCP client to access your Desktop MCP tools.</p><form method="post" action="' + action + '"><button type="submit">Allow access</button></form></body></html>');
  }
  if (req.method === 'POST' && url.pathname === '/oauth/approve') {
    if (!oauthBasicAuthorized(req)) return json(res, 401, { error: 'login_required' }, { 'www-authenticate': 'Basic realm="Desktop MCP OAuth"' });
    try {
      const code = await authorize({
        clientId: url.searchParams.get('client_id') ?? '',
        redirectUri: url.searchParams.get('redirect_uri') ?? '',
        codeChallenge: url.searchParams.get('code_challenge') ?? '',
        scope: url.searchParams.get('scope') ?? 'mcp'
      });
      const redirect = new URL(url.searchParams.get('redirect_uri') ?? '');
      redirect.searchParams.set('code', code);
      const state = url.searchParams.get('state');
      if (state) redirect.searchParams.set('state', state);
      return json(res, 302, {}, { location: redirect.toString() });
    } catch (error) {
      return json(res, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  }
  if (req.method === 'POST' && url.pathname === '/oauth/token') {
    try {
      const data = await body(req);
      if (data.grant_type !== 'authorization_code') return json(res, 400, { error: 'unsupported_grant_type' });
      return json(res, 200, await oauthExchange({
        code: String(data.code),
        clientId: String(data.client_id),
        redirectUri: String(data.redirect_uri),
        codeVerifier: String(data.code_verifier)
      }));
    } catch (error) {
      return json(res, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  }
}
const wss = new WebSocketServer({ noServer: true, maxPayload: 1_000_000 });

wss.on('connection', (socket) => {
  let authenticated = false;
  const timer = setTimeout(() => { if (!authenticated) socket.close(); }, 5000);

  socket.on('message', async raw => {
    if (!authenticated) return;
    try {
      const message = JSON.parse(String(raw)) as { type?: string; deviceId?: string };
      if (message.type === 'heartbeat' && message.deviceId) await touchDevice(message.deviceId);
    } catch {}
  });

  socket.once('message', async raw => {
    try {
      const message = JSON.parse(String(raw)) as { type?: string; deviceId?: string; token?: string; name?: string; platform?: string };
      if (message.type !== 'agent_hello' || !message.deviceId || !message.token) throw new Error('AUTH_FAILED');
      const { claims, device } = await requireDevice(message.token);
      if (claims.deviceId !== message.deviceId || !claims.scopes.includes('device')) throw new Error('AUTH_FAILED');
      authenticated = true;
      clearTimeout(timer);
      attachAgent(message.deviceId, socket);
      await touchDevice(message.deviceId);
      socket.send(JSON.stringify({ type: 'hello_ack', deviceId: message.deviceId }));
    } catch {
      socket.close();
    }
  });
});

const requestHandler: http.RequestListener = async (req, res) => {
  increment('gateway_requests_total');
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  try {
    if (url.pathname.startsWith('/oauth/') || url.pathname.startsWith('/.well-known/')) {
      const handled = await handleOAuth(req, res, url);
      if (handled !== undefined) return;
    }

    if (url.pathname.startsWith('/api/')) {
      const handled = await handleApi(req, res, url);
      if (handled !== undefined) return;
    }

    if (url.pathname === '/health') {
      return json(res, 200, { ok: true, service: 'desktop-mcp-gateway', mcp: '/mcp', websocket: '/agent' });
    }

    if (url.pathname === '/version') {
      return json(res, 200, { name: 'desktop-mcp-gateway', version: '0.2.0', protocol: 'mcp', transport: 'streamable-http' });
    }

    if (url.pathname === '/metrics') {
      res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4' });
      return res.end(prometheus());
    }

    if (url.pathname === '/mcp') {
      const auth = await authorized(req);
      if (!auth || !auth.scopes.includes('mcp')) {
        const metadata = ISSUER + '/.well-known/oauth-protected-resource';
        return json(res, 401, { error: 'invalid_token' }, { 'www-authenticate': 'Bearer resource_metadata="' + metadata + '"' });
      }
      const limited = await limiter.allow(auth.sub + ':mcp');
      if (!limited) return json(res, 429, { error: 'RATE_LIMITED' });
      (req as typeof req & { auth?: unknown }).auth = {
        clientId: auth.sub,
        scopes: auth.scopes,
        expiresAt: Math.floor(Date.now() / 1000) + 900
      };
      return toNodeHandler(mcpHandler)(req as never, res as never);
    }

    return json(res, 404, { error: 'NOT_FOUND' });
  } catch (error) {
    if (res.headersSent) return res.destroy();
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};

const tlsCert = process.env.DESKTOP_MCP_TLS_CERT;
const tlsKey = process.env.DESKTOP_MCP_TLS_KEY;
const server = tlsCert && tlsKey && fs.existsSync(tlsCert) && fs.existsSync(tlsKey)
  ? https.createServer({ cert: fs.readFileSync(tlsCert), key: fs.readFileSync(tlsKey) }, requestHandler)
  : http.createServer(requestHandler);

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname !== '/agent') return socket.destroy();
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});

const BIND_ADDRESS = process.env.DESKTOP_MCP_BIND_ADDRESS ?? (production ? '0.0.0.0' : '127.0.0.1');
server.listen(PORT, BIND_ADDRESS, () => {
  const scheme = tlsCert && tlsKey && fs.existsSync(tlsCert) && fs.existsSync(tlsKey) ? 'https' : 'http';
  console.log('Desktop MCP Gateway listening on ' + scheme + '://' + BIND_ADDRESS + ':' + PORT);
});
