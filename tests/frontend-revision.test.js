import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'frontend inline script must exist');
const slice = (from, to) => {
  const start = script.indexOf(from);
  const end = script.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `${from} must exist`);
  return script.slice(start, end);
};
const statusSource = slice('function updateTaskStatus(', '\nfunction updateTaskProgress');
const reviseSource = slice('async function reviseTask(', '\nfunction err(');

const ST = ['Belum dikerjakan', 'Sedang dikerjakan', 'Dalam pemeriksaan', 'Selesai'];
const E = [{ id: 'sena', n: 'Sena' }, { id: 'kata', n: 'Kata' }];

function makeHarness(apiImpl) {
  const S = { chats: {}, tasks: [], log: [] };
  const calls = [];
  const toasts = [];
  const states = [];
  const REVISING = new Set();
  const em = (id) => E.find((employee) => employee.id === id);
  const push = (key, from, text) => { (S.chats[key] ||= []).push({ f: from, t: text }); };
  const api = async (path, body) => { calls.push({ path, body }); return apiImpl(path, body); };
  const factory = new Function('S', 'REVISING', 'em', 'ST', 'save', 'render', 'api', 'markAIVerified', 'markAIFailed', 'push', 'log', 'toast',
    `${statusSource}\n${reviseSource}\nreturn { reviseTask, updateTaskStatus };`);
  const api2 = factory(S, REVISING, em, ST, () => {}, () => states.push(S.tasks[0]?.st), api, () => {}, () => {}, push, (entry) => S.log.push(entry), (text) => toasts.push(text));
  const task = { id: 1, t: 'Naskah iklan', emp: 'kata', st: ST[2], pg: 90, h: [], result: 'Versi satu', brief: 'Tulis naskah', reviewed: false };
  S.tasks.push(task);
  return { S, task, calls, toasts, states, REVISING, ...api2 };
}

test('a successful revision replaces the result and returns the task to review', async () => {
  const { task, calls, states, REVISING, reviseTask, S } = makeHarness(async () => ({ reply: 'Versi dua.', model: 'm' }));
  await reviseTask(1, 'Buat lebih singkat');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/api/revise');
  assert.deepEqual(calls[0].body, { employeeId: 'kata', taskTitle: 'Naskah iklan', taskBrief: 'Tulis naskah', previousResult: 'Versi satu', note: 'Buat lebih singkat' });
  assert.equal(task.result, 'Versi dua.');
  assert.equal(task.st, ST[2]);
  assert.equal(task.reviewed, false);
  assert.ok(states.includes(ST[1]), 'task shows as in progress while the revision runs');
  assert.equal(REVISING.size, 0);
  assert.ok(task.h.some((entry) => /CEO meminta revisi: Buat lebih singkat/.test(entry.t)));
  assert.ok(task.h.some((entry) => /Revisi diterima dari Kata/.test(entry.t)));
  assert.equal(S.chats.kata.at(-1).t, 'Versi dua.');
});

test('a failed revision keeps the previous result and returns the task to review', async () => {
  const { task, toasts, REVISING, reviseTask } = makeHarness(async () => { throw new Error('Kuota habis'); });
  await reviseTask(1, 'Perbaiki');
  assert.equal(task.result, 'Versi satu');
  assert.equal(task.st, ST[2]);
  assert.equal(REVISING.size, 0);
  assert.ok(task.h.some((entry) => /Revisi gagal: Kuota habis/.test(entry.t)));
  assert.ok(toasts.some((text) => /dipertahankan/.test(text)));
});

test('an empty AI reply is treated as a failure', async () => {
  const { task, reviseTask } = makeHarness(async () => ({ reply: '   ' }));
  await reviseTask(1, 'Perbaiki');
  assert.equal(task.result, 'Versi satu');
  assert.ok(task.h.some((entry) => /tidak mengembalikan hasil revisi/.test(entry.t)));
});

test('a second request for the same task while one is running is ignored', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const { calls, reviseTask } = makeHarness(async () => { await gate; return { reply: 'Versi dua.' }; });
  const first = reviseTask(1, 'Pertama');
  await reviseTask(1, 'Kedua');
  release();
  await first;
  assert.equal(calls.length, 1);
});

test('tasks without a known employee are not sent', async () => {
  const { task, calls, toasts, reviseTask } = makeHarness(async () => ({ reply: 'x' }));
  task.emp = 'unassigned';
  await reviseTask(1, 'Perbaiki');
  assert.equal(calls.length, 0);
  assert.equal(task.st, ST[2]);
  assert.equal(toasts.length, 1);
});

test('only the first 6,000 characters of a long result are sent, and the history says so', async () => {
  const { task, calls, reviseTask } = makeHarness(async () => ({ reply: 'Versi dua.' }));
  task.result = 'x'.repeat(9000);
  await reviseTask(1, 'Ringkas');
  assert.equal(calls[0].body.previousResult.length, 6000);
  assert.ok(task.h.some((entry) => /dipotong 6\.000 karakter/.test(entry.t)));
});
