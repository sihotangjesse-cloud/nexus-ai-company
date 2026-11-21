import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

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
});

test('personal notes release is documented as offline-only', async () => {
  const [readme, guide, changelog] = await Promise.all([
    read('../README.md'), read('../PANDUAN_PERSONAL.md'), read('../CHANGELOG.md')
  ]);
  assert.match(readme, /Catatan dan ide pribadi/);
  assert.match(guide, /Catatan & Ide pribadi/);
  assert.match(changelog, /## 1\.5\.0 — Personal Notes & Idea Inbox/);
});
