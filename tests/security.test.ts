import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCommand } from '../packages/security/src/risk.js';
import { decide } from '../packages/policy-engine/src/policy.js';
import { assertSafeUrl } from '../packages/security/src/url.js';
import { assertWorkspace } from '../packages/security/src/risk-workspace.js';

test('classifies safe commands as low risk', () => {
  assert.equal(classifyCommand('node --version'), 'low');
});

test('classifies destructive commands as high risk', () => {
  assert.equal(classifyCommand('git reset --hard'), 'high');
});

test('blocks critical commands', () => {
  assert.deepEqual(decide('critical'), {
    allowed: false, requiresConfirmation: false, reason: 'CRITICAL_BLOCKED'
  });
});

test('medium commands require confirmation by default', () => {
  assert.equal(decide('medium').allowed, false);
  assert.equal(decide('medium', true).allowed, true);
});

test('workspace rejects traversal', () => {
  process.env.DESKTOP_MCP_WORKSPACE = 'C:\\Users\\Vrutik\\Desktop\\Desktop MCP Server\\workspace';
  assert.throws(() => assertWorkspace('C:\\Windows'), /PATH_NOT_ALLOWED/);
});

test('browser security rejects loopback', async () => {
  await assert.rejects(() => assertSafeUrl('http://127.0.0.1:8788'), /SSRF_BLOCKED/);
});

test('browser security rejects localhost unless explicitly enabled', async () => {
  delete process.env.DESKTOP_MCP_ALLOW_LOCAL_BROWSER;
  await assert.rejects(() => assertSafeUrl('http://localhost:3000'), /SSRF_BLOCKED/);
});
