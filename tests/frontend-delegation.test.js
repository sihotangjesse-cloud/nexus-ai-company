import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'frontend inline script must exist');
const start = script.indexOf('async function delegate(');
const end = script.indexOf('\nasync function talkToEmployee', start);
assert.ok(start >= 0 && end > start, 'delegate function must exist');
const source = script.slice(start, end);

const ST = ['Belum dikerjakan', 'Sedang dikerjakan', 'Dalam pemeriksaan', 'Selesai'];
const E = [
  { id: 'sena', n: 'Sena', r: 'Team Leader' },
  { id: 'nara', n: 'Nara', r: 'Market Researcher' },
  { id: 'arka', n: 'Arka', r: 'Marketing Manager' }
];

function makeHarness(assignments, extra = {}) {
  const S = { chats: {}, tasks: [], log: [] };
  const em = (id) => E.find((employee) => employee.id === id);
  function push(key, from, text) { (S.chats[key] ||= []).push({ f: from, t: text, at: 1 }); }
  function addTask(title, employee, priority, due, status, note) {
    const task = { t: title, emp: employee, pri: priority, due, st: status, pg: 90, h: [{ t: note }], result: '', brief: '' };
    S.tasks.unshift(task);
    return task;
  }
  const fn = new Function('push', 'save', 'render', 'api', 'markAIVerified', 'dk', 'addTask', 'ST', 'em', 'log', 'markAIFailed', `${source}; return delegate;`)(
    push,
    () => {},
    () => {},
    async () => ({ summary: 'Rencana Sena', assignments, model: 'test-model', ...extra }),
    () => {},
    () => '2026-11-19',
    addTask,
    ST,
    em,
    (entry) => S.log.push(entry),
    () => {}
  );
  return { S, fn };
}

test('successful specialist result is persisted on a review task', async () => {
  const { S, fn } = makeHarness([{ employeeId: 'nara', taskTitle: 'Riset pelanggan', taskBrief: 'Teliti segmen', success: true, response: 'Hasil riset lengkap.' }]);
  await fn('Riset pasar', []);
  assert.equal(S.tasks.length, 1);
  assert.equal(S.tasks[0].result, 'Hasil riset lengkap.');
  assert.equal(S.tasks[0].brief, 'Teliti segmen');
  assert.equal(S.tasks[0].st, ST[2]);
  assert.equal(S.tasks[0].reviewed, false);
});

test('failed assignment does not create a misleading review task', async () => {
  const { S, fn } = makeHarness([{ employeeId: 'arka', taskTitle: 'Kampanye', taskBrief: 'Buat rencana', success: false, error: 'Kuota habis' }]);
  await fn('Buat kampanye', []);
  assert.equal(S.tasks.length, 0);
  assert.ok(S.chats.company.some((entry) => entry.f === 'system' && entry.t.includes('Kuota habis')));
});

test('invalid and duplicate assignments are ignored', async () => {
  const { S, fn } = makeHarness([
    { employeeId: 'unknown', success: true, response: 'bad' },
    { employeeId: 'nara', taskTitle: 'Tugas 1', taskBrief: 'Brief', success: true, response: 'Hasil 1' },
    { employeeId: 'nara', taskTitle: 'Tugas duplikat', taskBrief: 'Brief', success: true, response: 'Hasil 2' },
    { employeeId: 'sena', taskTitle: 'Sena self assignment', success: true, response: 'bad' }
  ]);
  await fn('Instruksi', []);
  assert.equal(S.tasks.length, 1);
  assert.equal(S.tasks[0].result, 'Hasil 1');
});

test('Sena synthesis is shown in the company chat after the specialist results', async () => {
  const { S, fn } = makeHarness(
    [{ employeeId: 'nara', taskTitle: 'Riset', taskBrief: 'Teliti', success: true, response: 'Hasil riset.' }],
    { synthesis: 'Ringkasan akhir untuk CEO.', synthesisError: null }
  );
  await fn('Riset pasar', []);
  const company = S.chats.company;
  const last = company.at(-1);
  assert.equal(last.f, 'sena');
  assert.match(last.t, /Sintesis Sena untuk CEO/);
  assert.match(last.t, /Ringkasan akhir untuk CEO\./);
  assert.ok(company.findIndex((entry) => entry.t === 'Hasil riset.') < company.length - 1, 'synthesis comes after specialist output');
});

test('a synthesis failure is reported without losing specialist results', async () => {
  const { S, fn } = makeHarness(
    [{ employeeId: 'nara', taskTitle: 'Riset', taskBrief: 'Teliti', success: true, response: 'Hasil riset.' }],
    { synthesis: null, synthesisError: 'Kuota habis' }
  );
  await fn('Riset pasar', []);
  assert.equal(S.tasks.length, 1);
  assert.ok(S.chats.company.some((entry) => entry.f === 'system' && /sintesis akhir/.test(entry.t) && entry.t.includes('Kuota habis')));
});
