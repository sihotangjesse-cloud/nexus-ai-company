import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

async function loadNoteHelpers() {
  const html = await read('../public/index.html');
  const scriptStart = html.indexOf('<script>') + '<script>'.length;
  const scriptEnd = html.indexOf('</script>', scriptStart);
  assert.ok(scriptStart >= '<script>'.length && scriptEnd > scriptStart, 'inline app script must exist');
  const script = html.slice(scriptStart, scriptEnd);
  const start = script.indexOf('const NOTE_CATEGORIES=');
  const end = script.indexOf('function normalizeState(raw){', start);
  assert.ok(start >= 0 && end > start, 'note normalization helpers must exist');
  return new Function('isRecord', script.slice(start, end) + ';return {NOTE_CATEGORIES,normalizeNote};')(isRecord);
}

test('personal notes normalize values safely and enforce field limits', async () => {
  const { NOTE_CATEGORIES, normalizeNote } = await loadNoteHelpers();
  assert.deepEqual(Array.from(NOTE_CATEGORIES), ['Ide bisnis', 'Website', 'Konten', 'Belajar', 'Strategi', 'Catatan']);

  const normalized = normalizeNote({
    id: 12, title: '  Ide website  ', body: 'Catatan awal', category: 'Website',
    createdAt: 100, updatedAt: 200, pinned: true
  });
  assert.equal(normalized.id, 12);
  assert.equal(normalized.title, 'Ide website');
  assert.equal(normalized.body, 'Catatan awal');
  assert.equal(normalized.category, 'Website');
  assert.equal(normalized.createdAt, 100);
  assert.equal(normalized.updatedAt, 200);
  assert.equal(normalized.pinned, true);

  const bounded = normalizeNote({
    title: 'T'.repeat(150), body: 'B'.repeat(6000), category: 'Tidak dikenal'
  });
  assert.equal(bounded.title.length, 120);
  assert.equal(bounded.body.length, 5000);
  assert.equal(bounded.category, 'Catatan');
  assert.equal(normalizeNote(null), null);
  assert.equal(normalizeNote([]), null);
});

test('personal notes workspace is available and stored in local backup state', async () => {
  const html = await read('../public/index.html');
  assert.match(html, /notes:\[\]/);
  assert.match(html, /notes:Array\.isArray\(raw\.notes\).*normalizeNote/);
  assert.match(html, /const NOTE_CATEGORIES=\['Ide bisnis','Website','Konten','Belajar','Strategi','Catatan'\]/);
  assert.match(html, /function normalizeNote\(raw\)/);
  assert.match(html, /const nav=.*\['notes','Catatan & Ide','notes'\]/);
  assert.match(html, /notes\(\).*Catatan & Ide/s);
  assert.match(html, /if\(k==='note'\)/);
  assert.match(html, /data-a="pin-note"/);
  assert.match(html, /data-a="delete-note"/);
  assert.match(html, /S\.notes\.length>=100/);
  assert.match(html, /body\.length>5000/);
  assert.match(html, /S\.notes=S\.notes\.filter/);
  assert.match(html, /S\.notes\.unshift/);
  assert.match(html, /const sorted=S\.notes\.slice\(\)\.sort/);
  assert.match(html, /function createBackupPayload\(\).*normalizeState\(S\)/);
});

test('personal notes release is documented as offline-only', async () => {
  const [readme, guide, changelog] = await Promise.all([
    read('../README.md'), read('../PANDUAN_PERSONAL.md'), read('../CHANGELOG.md')
  ]);
  assert.match(readme, /Catatan dan ide pribadi/);
  assert.match(guide, /Catatan & Ide pribadi/);
  assert.match(changelog, /## 1\.5\.0 — Personal Notes & Idea Inbox/);
});
