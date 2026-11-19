import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.js', import.meta.url), 'utf8');

test('production requires a strong access password and session signing secret', () => {
  assert.match(server, /process\.env\.NODE_ENV === 'production' \|\| Boolean\(ACCESS_PASSWORD \|\| SESSION_SECRET\)/);
  assert.match(server, /ACCESS_PASSWORD\.length < 12/);
  assert.match(server, /SESSION_SECRET\.length < 32/);
});

test('AI routes require authentication before passing rate limits', () => {
  assert.match(server, /app\.use\(\['\/api\/chat', '\/api\/company', '\/api\/revise'\], requireAuthentication, apiLimiter\)/);
  assert.match(server, /const companyLimiter = rateLimit\([\s\S]*?limit: 2/);
});

test('unauthenticated health check does not return the model identifier', () => {
  const health = server.match(/app\.get\('\/api\/health',[\s\S]*?\n\}\);/)?.[0] || '';
  assert.ok(health);
  assert.doesNotMatch(health, /model:\s*MODEL|provider:/);
  assert.match(health, /authenticated \? Boolean\(API_KEY\) : false/);
});

test('Gemini call budget and lower thinking level are configured', () => {
  assert.match(server, /NEXUS_MAX_GEMINI_CALLS_PER_MINUTE/);
  assert.match(server, /NEXUS_MAX_GEMINI_CALLS_PER_DAY/);
  assert.match(server, /thinkingLevel: 'LOW'/);
  assert.match(server, /maxOutputTokens = 2048/);
});


test('CSP allows only the calculated application script hash, not arbitrary inline scripts', () => {
  assert.match(server, /scriptSrc: \[\"'self'\", applicationScriptHash\]/);
  assert.doesNotMatch(server, /scriptSrc: \[.*unsafe-inline/);
});


test('unauthenticated development binds to localhost; production binding requires production mode', () => {
  assert.match(server, /const HOST = process\.env\.NODE_ENV === 'production' \? '0\.0\.0\.0' : '127\.0\.0\.1'/);
  assert.match(server, /app\.listen\(PORT, HOST/);
});
