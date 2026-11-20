import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'frontend inline script must exist');

const start = script.indexOf('async function reviseTask(');
const end = script.indexOf('\nfunction err(', start);
assert.ok(start >= 0 && end > start, 'reviseTask must exist');
const reviseSource = script.slice(start, end);

const ST = ['Belum dikerjakan', 'Sedang dikerjakan', 'Dalam pemeriksaan', 'Selesai'];
const E = [{ id: 'kata', n: 'Kata' }];

function createOfflineRevisionHarness(task = {}) {
  const S = {
    chats: {},
    tasks: [{
      id: 1, t: 'Naskah iklan', emp: 'kata', st: ST[2], pg: 90,
      h: [], result: 'Versi sebelumnya', brief: 'Tulis naskah',
      reviewed: false, ...task
    }],
    log: []
  };
  const calls = [];
  const toasts = [];
  const REVISING = new Set();
  const em = (id) => E.find((employee) => employee.id === id);
  const api = async (path, body) => {
    calls.push({ path, body });
    throw new Error('API must not be called in personal offline mode');
  };
  const push = (key, from, text) => { (S.chats[key] ||= []).push({ f: from, t: text }); };
  const reviseTask = new Function(
    'PERSONAL_OFFLINE_MODE', 'S', 'REVISING', 'em', 'ST', 'save', 'render',
    'api', 'markAIVerified', 'markAIFailed', 'push', 'log', 'toast',
    reviseSource + '\nreturn reviseTask;'
  )(
    true, S, REVISING, em, ST, () => {}, () => {}, api,
    () => {}, () => {}, push, () => {}, (message) => toasts.push(message)
  );
  return { S, task: S.tasks[0], calls, toasts, REVISING, reviseTask };
}

test('personal offline mode refuses task revisions before any API request', async () => {
  const { task, calls, toasts, REVISING, reviseTask } = createOfflineRevisionHarness();
  await reviseTask(1, 'Buat lebih singkat');

  assert.equal(calls.length, 0);
  assert.equal(task.result, 'Versi sebelumnya');
  assert.equal(task.st, ST[2]);
  assert.equal(task.reviewed, false);
  assert.equal(REVISING.size, 0);
  assert.ok(toasts.some((message) => /revisi AI tidak tersedia pada mode pribadi offline/i.test(message)));
});

test('personal offline mode also blocks revisions for unknown task owners', async () => {
  const { task, calls, toasts, reviseTask } = createOfflineRevisionHarness({ emp: 'unassigned' });
  await reviseTask(1, 'Perbaiki');

  assert.equal(calls.length, 0);
  assert.equal(task.result, 'Versi sebelumnya');
  assert.equal(task.st, ST[2]);
  assert.equal(toasts.length, 1);
});
