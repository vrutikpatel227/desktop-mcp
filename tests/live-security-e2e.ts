import assert from 'node:assert/strict';
import { WebSocket } from 'ws';

const gateway = 'http://127.0.0.1:8790';
const admin = 'change-me-admin';

async function post(path: string, data?: unknown, token = admin) {
  const response = await fetch(gateway + path, {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + token,
      ...(data !== undefined ? { 'content-type': 'application/json' } : {})
    },
    body: data !== undefined ? JSON.stringify(data) : undefined
  });
  return { response, data: await response.json() };
}

const pair = await post('/api/pair/start');
assert.equal(pair.response.status, 200);
const complete = await post('/api/pair/complete', {
  code: pair.data.code,
  name: 'Live Security E2E',
  platform: 'win32'
}, '');
assert.equal(complete.response.status, 200);

const deviceId = complete.data.device.id as string;
const oldToken = complete.data.token as string;

try {
  const rotate = await post('/api/devices/' + deviceId + '/rotate');
  assert.equal(rotate.response.status, 200);
  const newToken = rotate.data.token as string;
  assert.notEqual(oldToken, newToken);

  const oldSocket = new WebSocket('ws://127.0.0.1:8790/agent');
  const oldClosed = await new Promise<boolean>(resolve => {
    const timer = setTimeout(() => { oldSocket.close(); resolve(true); }, 2500);
    oldSocket.on('open', () => oldSocket.send(JSON.stringify({
      type: 'agent_hello', deviceId, token: oldToken, name: 'old', platform: 'win32'
    })));
    oldSocket.on('close', () => { clearTimeout(timer); resolve(true); });
    oldSocket.on('error', () => { clearTimeout(timer); resolve(true); });
  });
  assert.equal(oldClosed, true);

  const newSocket = new WebSocket('ws://127.0.0.1:8790/agent');
  const ack = await new Promise<boolean>(resolve => {
    const timer = setTimeout(() => { newSocket.close(); resolve(false); }, 2500);
    newSocket.on('open', () => newSocket.send(JSON.stringify({
      type: 'agent_hello', deviceId, token: newToken, name: 'new', platform: 'win32'
    })));
    newSocket.on('message', value => {
      try {
        const message = JSON.parse(String(value));
        if (message.type === 'hello_ack' && message.deviceId === deviceId) {
          clearTimeout(timer); newSocket.close(); resolve(true);
        }
      } catch {}
    });
    newSocket.on('error', () => { clearTimeout(timer); resolve(false); });
  });
  assert.equal(ack, true);

  const policyBefore = await fetch(gateway + '/api/policy', { headers: { authorization: 'Bearer ' + admin } });
  assert.equal(policyBefore.status, 200);
  const savedPolicy = await policyBefore.json();

  await post('/api/policy', {
    ...savedPolicy,
    blockedCommands: ['LIVE_SECURITY_BLOCK']
  });

  const blocked = await post('/api/devices/' + deviceId + '/execute', {
    operation: 'execute_powershell',
    args: { command: 'Write-Output LIVE_SECURITY_BLOCK' }
  });
  assert.equal(blocked.response.status, 403);
  assert.equal(blocked.data.error, 'COMMAND_BLOCKED');

  await post('/api/policy', savedPolicy);

  const auditResponse = await fetch(gateway + '/api/audit', { headers: { authorization: 'Bearer ' + admin } });
  assert.equal(auditResponse.status, 200);
  const audit = await auditResponse.json() as Array<{ action: string; target?: string }>;
  assert.ok(audit.some(event => event.action === 'device.rotate' && event.target === deviceId));

  console.log('LIVE_SECURITY_PASS device=' + deviceId);
} finally {
  await post('/api/devices/' + deviceId + '/revoke');
}
