import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'frontend inline script must exist');

const stateStart = script.indexOf('const isRecord=');
const stateEnd = script.indexOf('\nfunction load()', stateStart);
assert.ok(stateStart >= 0 && stateEnd > stateStart, 'state normalization helpers must exist');
const stateSource = script.slice(stateStart, stateEnd);
const employees = [
  { id: 'sena' }, { id: 'nara' }, { id: 'juno' }, { id: 'kata' },
  { id: 'arka' }, { id: 'jejak' }, { id: 'garis' }, { id: 'rupa' }
];
const statuses = ['Belum dikerjakan', 'Sedang dikerjakan', 'Dalam pemeriksaan', 'Selesai'];
const priorities = ['Rendah', 'Sedang', 'Tinggi'];
const createNormalizer = new Function('E', 'ST', 'PR', 'em', `${stateSource}; return normalizeState;`);
const normalizeState = createNormalizer(employees, statuses, priorities, (id) => employees.find((e) => e.id === id));

test('normalizes missing nested fields without discarding valid root data', () => {
  const result = normalizeState({ ceo: 'Jesse', tasks: [{ t: 'Riset', emp: 'nara', st: statuses[1], pg: 20 }] });
  assert.equal(result.ceo, 'Jesse');
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].t, 'Riset');
  assert.deepEqual(result.chats, {});
  assert.deepEqual(result.events, []);
  assert.deepEqual(result.reports, []);
  assert.deepEqual(result.log, []);
});

test('normalizes invalid task state and keeps optional saved work product', () => {
  const result = normalizeState({
    tasks: [null, { t: 'Output spesialis', emp: 'nara', st: statuses[2], pg: 7, result: 'Hasil riset', brief: 'Teliti pasar' }]
  });
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].pg, 90, 'review status must map to 90%');
  assert.equal(result.tasks[0].result, 'Hasil riset');
  assert.equal(result.tasks[0].brief, 'Teliti pasar');
  assert.equal(result.tasks[0].h.length, 0);
});

test('malformed storage root returns a complete safe default state', () => {
  const result = normalizeState(['not', 'an', 'object']);
  assert.deepEqual(result, { ceo: 'Founder', projects: [], tasks: [], chats: {}, events: [], reports: [], log: [] });
});

test('normalizes progress consistently with each task status', () => {
  const result = normalizeState({ tasks: [
    { t: 'queued', st: statuses[0], pg: 75 },
    { t: 'working', st: statuses[1], pg: 100 },
    { t: 'review', st: statuses[2], pg: 20 },
    { t: 'done', st: statuses[3], pg: 0 }
  ] });
  assert.deepEqual(result.tasks.map((task) => task.pg), [0, 89, 90, 100]);
});

const updateStart = script.indexOf('function updateTaskStatus');
const updateEnd = script.indexOf('\nfunction addTask', updateStart);
assert.ok(updateStart >= 0 && updateEnd > updateStart, 'task update helpers must exist');
const updateSource = script.slice(updateStart, updateEnd);
const updates = new Function('ST', `${updateSource}; return { updateTaskStatus, updateTaskProgress };`)(statuses);

test('changing task status updates progress in a consistent way', () => {
  const task = { st: statuses[0], pg: 55 };
  updates.updateTaskStatus(task, statuses[2]);
  assert.equal(task.st, statuses[2]);
  assert.equal(task.pg, 90);
  updates.updateTaskStatus(task, statuses[0]);
  assert.equal(task.pg, 0);
  updates.updateTaskStatus(task, statuses[3]);
  assert.equal(task.pg, 100);
});

test('changing task progress updates lifecycle status', () => {
  const task = { st: statuses[0], pg: 0 };
  updates.updateTaskProgress(task, 50);
  assert.equal(task.st, statuses[1]);
  assert.equal(task.pg, 50);
  updates.updateTaskProgress(task, 120);
  assert.equal(task.st, statuses[3]);
  assert.equal(task.pg, 100);
  updates.updateTaskProgress(task, -4);
  assert.equal(task.st, statuses[0]);
  assert.equal(task.pg, 0);
});

test('invalid status changes do not mutate the task', () => {
  const task = { st: statuses[0], pg: 0 };
  updates.updateTaskStatus(task, 'unknown');
  assert.deepEqual(task, { st: statuses[0], pg: 0 });
});


test('malicious task and event IDs are replaced with safe numeric identifiers', () => {
  const result = normalizeState({
    tasks: [{ id: '1\" data-x=\"injected', t: 'Safe title', emp: 'nara', st: statuses[0] }],
    events: [{ id: '2\" onmouseover=\"bad', title: 'Agenda', date: '2026-11-17' }]
  });
  assert.equal(typeof result.tasks[0].id, 'number');
  assert.equal(typeof result.events[0].id, 'number');
  assert.ok(Number.isFinite(result.tasks[0].id));
  assert.ok(Number.isFinite(result.events[0].id));
});
