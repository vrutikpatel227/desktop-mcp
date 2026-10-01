import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCommand } from '../packages/security/src/risk.js';
import { decide } from '../packages/policy-engine/src/policy.js';

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
