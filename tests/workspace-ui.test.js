import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('workspace UI is linked into the mobile navigation and remains a separate manual tool', async () => {
  const [html, ui] = await Promise.all([read('../public/index.html'), read('../public/local-workspace.js')]);
  assert.ok(html.includes('<script src="local-workspace.js"></script>'));
  assert.ok(html.includes("['workspace','File Workspace','tasks']"));
  assert.match(html, /workspace\(\)\{return window\.NexusWorkspace/);
  assert.match(ui, /Hubungkan workspace lokal/);
  assert.match(ui, /Setujui & simpan file/);
  assert.match(ui, /Periksa sintaks/);
  assert.match(ui, /stopImmediatePropagation/);
});

test('workspace UI uses only the approval-first local bridge endpoints', async () => {
  const ui = await read('../public/local-workspace.js');
  assert.match(ui, /\/__nexus\/health/);
  assert.match(ui, /\/__nexus\/files/);
  assert.match(ui, /\/__nexus\/file/);
  assert.match(ui, /\/__nexus\/propose/);
  assert.match(ui, /\/__nexus\/apply/);
  assert.match(ui, /\/__nexus\/check/);
  assert.match(ui, /window\.confirm/);
  assert.doesNotMatch(ui, /\/api\/chat|GEMINI_API_KEY|localStorage/);
});

test('workspace UI exposes no delete action or arbitrary command runner', async () => {
  const ui = await read('../public/local-workspace.js');
  assert.doesNotMatch(ui, /workspace-delete|workspace-run|executeCommand|shell=True/);
  assert.match(ui, /File hanya disimpan setelah usulan ditinjau dan disetujui/);
});
