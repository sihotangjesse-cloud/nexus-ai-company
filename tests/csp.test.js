import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inlineScriptHash } from '../csp.js';

test('frontend has exactly one inline script and produces a SHA-256 CSP hash', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const hash = inlineScriptHash(html);
  assert.match(hash, /^'sha256-[A-Za-z0-9+/]{43}='$/);
});

test('CSP helper refuses extra inline scripts', () => {
  assert.throws(() => inlineScriptHash('<script>one</script><script>two</script>'), /exactly one inline script/);
});
