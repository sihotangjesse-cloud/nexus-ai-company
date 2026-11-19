import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'frontend inline script must exist');
const start = script.indexOf('function buildHistory(');
const end = script.indexOf('\nasync function delegate', start);
assert.ok(start >= 0 && end > start, 'buildHistory function must be found');
const functionSource = script.slice(start, end);
const createBuilder = new Function('E', 'S', 'TextEncoder', 'em', `${functionSource}; return buildHistory;`);
const employees = [
  { id: 'sena', n: 'Sena' },
  { id: 'nara', n: 'Nara' },
  { id: 'juno', n: 'Juno' }
];

test('employee chat keeps Sena assignment as user context and specialist output as model', () => {
  const state = { chats: { nara: [
    { f: 'sena', t: 'Tugas dari CEO: teliti pasar.' },
    { f: 'nara', t: 'Hasil riset awal.' },
    { f: 'ceo', t: 'Perbaiki hasil tadi.' }
  ] } };
  const buildHistory = createBuilder(employees, state, TextEncoder, (id) => employees.find((employee) => employee.id === id));
  const result = buildHistory('nara', 'Perbaiki hasil tadi.');
  assert.deepEqual(result.map((turn) => turn.role), ['user', 'model', 'user']);
  assert.match(result[0].text, /Tugas dari CEO/);
  assert.match(result[1].text, /Hasil riset awal/);
});

test('Sena direct chat keeps Sena messages as model turns', () => {
  const state = { chats: { sena: [
    { f: 'ceo', t: 'Buat rencana.' },
    { f: 'sena', t: 'Ini rencana.' }
  ] } };
  const buildHistory = createBuilder(employees, state, TextEncoder, (id) => employees.find((employee) => employee.id === id));
  const result = buildHistory('sena', 'Lanjutkan.');
  assert.deepEqual(result.map((turn) => turn.role), ['user', 'model']);
  assert.match(result[1].text, /Ini rencana/);
});

test('company history treats specialist assignment briefs as user instructions', () => {
  const state = { chats: { company: [
    { f: 'ceo', t: 'Susun strategi pasar.' },
    { f: 'sena', t: 'Nara akan meneliti pasar.' },
    { f: 'nara', t: 'Tugas: Teliti tiga segmen pelanggan.' },
    { f: 'nara', t: 'Temuan: segmen A dan B.' }
  ] } };
  const buildHistory = createBuilder(employees, state, TextEncoder, (id) => employees.find((employee) => employee.id === id));
  const result = buildHistory('company', 'Buat ringkasan.');
  assert.deepEqual(result.map((turn) => turn.role), ['user', 'model', 'user', 'model']);
  assert.match(result[2].text, /Tugas: Teliti tiga segmen pelanggan/);
  assert.match(result[3].text, /Temuan: segmen A dan B/);
});
