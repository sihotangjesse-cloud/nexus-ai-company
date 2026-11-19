import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '';

test('settings expose local JSON backup export and restore controls', () => {
  assert.match(html, /data-a="backup-export"/);
  assert.match(html, /id="backup-file" type="file" accept="\.json,application\/json"/);
  assert.match(html, /Pulihkan dari file backup/);
  assert.match(html, /File backup tidak dienkripsi/);
});

test('backup export uses a JSON Blob and a local download link without API calls', () => {
  const start = script.indexOf('function createBackupPayload(){');
  const end = script.indexOf('function employeeName(', start);
  assert.ok(start >= 0 && end > start, 'backup functions must be present');
  const source = script.slice(start, end);
  assert.match(source, /format:BACKUP_FORMAT,version:BACKUP_VERSION/);
  assert.match(source, /data:normalizeState\(S\)/);
  assert.match(source, /new Blob\(/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /link\.download=/);
  assert.doesNotMatch(source, /fetch\(|api\(/);
});

function makeParser() {
  const constants = script.match(/const BACKUP_FORMAT=.*?;/)?.[0];
  const start = script.indexOf('function parseBackupText(');
  const end = script.indexOf('\nfunction load(', start);
  assert.ok(constants && start >= 0 && end > start, 'backup parser and constants must exist');
  const source = script.slice(start, end);
  const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const normalizeState = (value) => ({ normalized: true, ...value });
  return new Function('isRecord', 'normalizeState', 'TextEncoder',
    constants + '\n' + source + '\nreturn parseBackupText;')(isRecord, normalizeState, TextEncoder);
}

test('backup restore validates a strict versioned envelope before normalization', () => {
  const parseBackupText = makeParser();
  const restored = parseBackupText(JSON.stringify({
    format: 'nexus-ai-company-backup', version: 1, data: { ceo: 'Founder' }
  }));
  assert.deepEqual(restored, { normalized: true, ceo: 'Founder' });
});

test('backup restore rejects invalid JSON, unknown versions, and non-object data', () => {
  const parseBackupText = makeParser();
  assert.throws(() => parseBackupText('{oops'), /bukan JSON yang valid/);
  assert.throws(() => parseBackupText(JSON.stringify({ format: 'nexus-ai-company-backup', version: 99, data: {} })), /tidak dikenal/);
  assert.throws(() => parseBackupText(JSON.stringify({ format: 'nexus-ai-company-backup', version: 1, data: [] })), /tidak dikenal/);
});

test('backup restore enforces the 2 MB size limit before parsing', () => {
  const parseBackupText = makeParser();
  assert.throws(() => parseBackupText('x'.repeat(2 * 1024 * 1024 + 1)), /terlalu besar/);
});

test('file import requires explicit replacement confirmation and normalizes imported data', () => {
  assert.match(script, /if\(!confirm\('Pulihkan backup ini\? Data NEXUS saat ini akan diganti dengan isi file backup\.'\)\)return false/);
  assert.match(script, /S=restored;[\s\S]*?save\(\);render\(\)/);
  assert.match(script, /b\.value=''\}return;\}if\(!b\.dataset\.a/);
});
