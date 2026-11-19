import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, verifySessionToken, safeStringEqual, readCookie } from '../auth.js';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';

test('session token validates before expiry', () => {
  const now = 1_800_000_000_000;
  const token = createSessionToken(SECRET, 3600, now);
  assert.equal(verifySessionToken(token, SECRET, now + 1000), true);
});

test('session token rejects an expired token', () => {
  const now = 1_800_000_000_000;
  const token = createSessionToken(SECRET, 60, now);
  assert.equal(verifySessionToken(token, SECRET, now + 61_000), false);
});

test('session token rejects tampering and the wrong secret', () => {
  const token = createSessionToken(SECRET, 3600, 1_800_000_000_000);
  assert.equal(verifySessionToken(`${token}x`, SECRET, 1_800_000_001_000), false);
  assert.equal(verifySessionToken(token, `${SECRET}-wrong`, 1_800_000_001_000), false);
});

test('password comparison accepts equal strings and rejects different strings', () => {
  assert.equal(safeStringEqual('password one', 'password one'), true);
  assert.equal(safeStringEqual('password one', 'password two'), false);
});

test('cookie parser safely returns the named cookie', () => {
  assert.equal(readCookie('theme=dark; nexus_session=abc%2E123; mode=light', 'nexus_session'), 'abc.123');
  assert.equal(readCookie('theme=dark', 'nexus_session'), '');
  assert.equal(readCookie('nexus_session=%ZZ', 'nexus_session'), '');
});
