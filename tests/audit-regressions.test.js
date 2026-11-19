import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);

const ST = ['Belum dikerjakan', 'Sedang dikerjakan', 'Dalam pemeriksaan', 'Selesai'];
const PR = ['Rendah', 'Sedang', 'Tinggi'];
const helpersStart = script.indexOf('function updateTaskStatus');
const helpersEnd = script.indexOf('\nfunction addTask', helpersStart);
assert.ok(helpersStart >= 0 && helpersEnd > helpersStart);
const helpers = new Function('ST', `${script.slice(helpersStart, helpersEnd)}; return {updateTaskStatus,updateTaskProgress};`)(ST);

test('progress 90–99 consistently maps to review status and 90%', () => {
  for (const value of [90, 91, 95, 99]) {
    const task = { st: ST[1], pg: 50, reviewed: false, result: 'output' };
    helpers.updateTaskProgress(task, value);
    assert.equal(task.st, ST[2]);
    assert.equal(task.pg, 90);
  }
});

test('progress completion marks result reviewed; lower progress clears it', () => {
  const task = { st: ST[2], pg: 90, reviewed: false, result: 'output' };
  helpers.updateTaskProgress(task, 100);
  assert.equal(task.st, ST[3]);
  assert.equal(task.reviewed, true);
  helpers.updateTaskProgress(task, 40);
  assert.equal(task.st, ST[1]);
  assert.equal(task.reviewed, false);
});

test('CEO review actions are explicit and revision does not claim an automatic AI retry', () => {
  assert.match(html, /data-a="approve"/);
  assert.match(html, /data-a="revise"/);
  assert.match(html, /hanya mengubah status tugas/i);
  assert.match(html, /data-f="revise"/);
  assert.match(html, /\/api\/revise/);
});

test('delegated tasks do not receive invented deadlines', () => {
  assert.match(script, /const due=''\s*; \/\/ CEO sets a real deadline/);
  assert.match(html, /k\.due\|\|'Belum ditetapkan'/);
});

test('the employee profile shows a role summary rather than claiming to display server prompts', () => {
  assert.match(html, /<h2>Ringkasan peran<\/h2>/);
  assert.doesNotMatch(html, /<h2>Instruksi sistem<\/h2>/);
});

test('frontend includes a login screen and keeps session password out of localStorage', () => {
  assert.match(script, /function loginView\(\)/);
  assert.match(script, /api\('\/api\/login',\{password\}\)/);
  assert.doesNotMatch(script, /localStorage\.setItem\([^\n]*password/i);
});
