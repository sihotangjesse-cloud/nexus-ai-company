import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('GitHub Explorer is a separate read-only tool in the navigation', async () => {
  const [html, reader] = await Promise.all([read('../public/index.html'), read('../public/github-reader.js')]);
  assert.ok(html.includes('<script src="github-reader.js"></script>'));
  assert.ok(html.includes("['github','GitHub','tasks']"));
  assert.match(html, /github\(\)\{return window\.NexusGithub/);
  assert.match(reader, /Repository publik/);
  assert.match(reader, /Salin isi file/);
});

test('GitHub Explorer requests only public REST contents and never writes to GitHub', async () => {
  const reader = await read('../public/github-reader.js');
  assert.match(reader, /https:\/\/api\.github\.com\/repos\//);
  assert.match(reader, /method:\s*'GET'/);
  assert.match(reader, /application\/vnd\.github\+json/);
  assert.doesNotMatch(reader, /Authorization|Bearer |access_token|personal.access.token|method:\s*'(POST|PUT|PATCH|DELETE)'/i);
  assert.doesNotMatch(reader, /localStorage|GEMINI_API_KEY|\/api\/chat/);
});

test('GitHub Explorer validates repository, branch, and relative paths before network access', async () => {
  const reader = await read('../public/github-reader.js');
  assert.match(reader, /function validateRepo/);
  assert.match(reader, /function validateBranch/);
  assert.match(reader, /path\.startsWith\('\/'\)/);
  assert.match(reader, /part === '\.\.'/);
  assert.match(reader, /512 \* 1024/);
});

test('GitHub Explorer documents public-only access and unauthenticated rate limits', async () => {
  const reader = await read('../public/github-reader.js');
  assert.match(reader, /Hanya GET\/read-only/);
  assert.match(reader, /60 permintaan REST per jam/);
  assert.match(reader, /repository privat/);
  assert.match(reader, /commit, atau push/);
});
