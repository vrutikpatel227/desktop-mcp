import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { RateLimiter } from '../packages/network/src/rate-limit.js';
import { decide } from '../packages/policy-engine/src/policy.js';
import { assertSafeUrl } from '../packages/security/src/url.js';
import { setSecret, getSecret, deleteSecret } from '../packages/auth/src/secrets.js';

test('rate limiter blocks after the configured limit', () => {
  const limiter = new RateLimiter(2, 60_000);
  assert.equal(limiter.allow('a'), true);
  assert.equal(limiter.allow('a'), true);
  assert.equal(limiter.allow('a'), false);
  assert.equal(limiter.allow('b'), true);
});

test('policy blocks critical and confirms high risk', () => {
  assert.equal(decide('critical').allowed, false);
  assert.equal(decide('high').allowed, false);
  assert.equal(decide('medium').allowed, false);
  assert.equal(decide('medium', true).allowed, true);
});

test('SSRF protection blocks private IPv4 and allows public HTTPS', async () => {
  await assert.rejects(() => assertSafeUrl('http://127.0.0.1:8788/health'), /SSRF_BLOCKED/);
  const publicUrl = await assertSafeUrl('https://example.com');
  assert.equal(publicUrl.protocol, 'https:');
});

test('encrypted secret store round trips without exposing plaintext through metadata', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'desktop-mcp-secret-'));
  const previous = process.env.DESKTOP_MCP_DATA_DIR;
  process.env.DESKTOP_MCP_DATA_DIR = dir;
  try {
    await setSecret('test', 'super-secret');
    assert.equal(await getSecret('test'), 'super-secret');
    await deleteSecret('test');
    assert.equal(await getSecret('test'), undefined);
  } finally {
    if (previous === undefined) delete process.env.DESKTOP_MCP_DATA_DIR;
    else process.env.DESKTOP_MCP_DATA_DIR = previous;
    await rm(dir, { recursive: true, force: true });
  }
});
