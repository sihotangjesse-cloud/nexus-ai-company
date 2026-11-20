import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '';
const start = script.indexOf('function filterTasks(');
const end = script.indexOf('\nfunction applyTaskDetails(', start);
assert.ok(start >= 0 && end > start, 'filterTasks helper must exist');
const source = script.slice(start, end);
const priorities = ['Rendah', 'Sedang', 'Tinggi'];
const employees = { nara: 'Nara', kata: 'Kata', juno: 'Juno' };
const filter = new Function('employeeName', 'projectTitle', 'PR', source + '\nreturn filterTasks;')(
  id => employees[id] || 'Tidak dikenal',
  () => '',
  priorities
);
const tasks = [
  { id: 10, t: 'Riset pasar digital', emp: 'nara', pri: 'Tinggi', due: '2026-12-10', st: 'Sedang dikerjakan' },
  { id: 12, t: 'Tulis slogan produk', emp: 'kata', pri: 'Rendah', due: '', st: 'Belum dikerjakan' },
  { id: 11, t: 'Analisis pelanggan', emp: 'nara', pri: 'Sedang', due: '2026-12-05', st: 'Dalam pemeriksaan' },
  { id: 9, t: 'Audit konten', emp: 'juno', pri: 'Tinggi', due: '2026-12-01', st: 'Selesai' }
];

test('search matches multiple case-insensitive terms across task and employee fields', () => {
  const result = filter(tasks, { query: 'NARA pelanggan' });
  assert.deepEqual(result.map(task => task.id), [11]);
});

test('status, employee, and priority filters combine together', () => {
  const result = filter(tasks, {
    status: 'Dalam pemeriksaan',
    employee: 'nara',
    priority: 'Sedang'
  });
  assert.deepEqual(result.map(task => task.id), [11]);
  assert.deepEqual(filter(tasks, { status: 'Tidak valid' }), []);
});

test('due-date sorting puts dated tasks first and undated tasks last', () => {
  const result = filter(tasks, { sort: 'due-asc' });
  assert.deepEqual(result.map(task => task.id), [9, 11, 10, 12]);
});

test('priority sorting orders highest first while preserving stable ties', () => {
  const result = filter(tasks, { sort: 'priority-desc' });
  assert.deepEqual(result.map(task => task.id), [10, 9, 11, 12]);
});

test('newest sorting uses task IDs and filtering does not mutate the source array', () => {
  const original = tasks.slice();
  const result = filter(tasks, { sort: 'newest' });
  assert.deepEqual(result.map(task => task.id), [12, 11, 10, 9]);
  assert.deepEqual(tasks, original);
  assert.notEqual(result, tasks);
});

test('empty task collections and unmatched search terms return empty results', () => {
  assert.deepEqual(filter([], {}), []);
  assert.deepEqual(filter(tasks, { query: 'kata kunci yang tidak ada' }), []);
});

test('task page includes local search, all requested filters, sort controls, and reset action', () => {
  assert.match(html, /data-task-filter="query"/);
  assert.match(html, /data-task-filter="status"/);
  assert.match(html, /data-task-filter="employee"/);
  assert.match(html, /data-task-filter="priority"/);
  assert.match(html, /data-task-filter="sort"/);
  assert.match(html, /data-a="reset-task-filters"/);
  assert.match(script, /taskFilters\.query=field\.value/);
  assert.match(script, /taskFilters\[b\.dataset\.taskFilter\]=b\.value/);
});
