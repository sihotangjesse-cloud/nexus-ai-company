import test from 'node:test';
import assert from 'node:assert/strict';
import { isKnownEmployee, clampText, selectAssignments, buildSynthesisPrompt, validateRevisionInput, buildRevisionPrompt, LIMITS } from '../workflow.js';

const employees = {
  sena: { name: 'Sena', role: 'Team Leader' },
  nara: { name: 'Nara', role: 'Market Researcher' },
  kata: { name: 'Kata', role: 'Copywriter' },
  juno: { name: 'Juno', role: 'Creative Director' },
  arka: { name: 'Arka', role: 'Marketing Manager' }
};

test('prototype property names are not employees', () => {
  for (const id of ['constructor', '__proto__', 'toString', 'hasOwnProperty', '', null, undefined, 5, {}]) {
    assert.equal(isKnownEmployee(employees, id), false, String(id));
  }
  assert.equal(isKnownEmployee(employees, 'nara'), true);
});

test('selectAssignments keeps at most three unique known specialists and never Sena', () => {
  const plan = { assignments: [
    { employeeId: 'nara', taskTitle: 'A', taskBrief: 'a' },
    { employeeId: 'nara', taskTitle: 'Dup', taskBrief: 'dup' },
    { employeeId: 'sena', taskTitle: 'Leader', taskBrief: 'x' },
    { employeeId: 'constructor', taskTitle: 'Proto', taskBrief: 'x' },
    { employeeId: 'tidak-ada', taskTitle: 'Unknown', taskBrief: 'x' },
    null,
    { employeeId: 'kata', taskTitle: 'B', taskBrief: 'b' },
    { employeeId: 'juno', taskTitle: 'C', taskBrief: 'c' },
    { employeeId: 'arka', taskTitle: 'D', taskBrief: 'd' }
  ] };
  const selected = selectAssignments(plan, employees, 'pesan');
  assert.deepEqual(selected.map((item) => item.employeeId), ['nara', 'kata', 'juno']);
});

test('selectAssignments applies defaults and length limits, and tolerates bad plans', () => {
  const [item] = selectAssignments({ assignments: [{ employeeId: 'kata', taskTitle: 'T'.repeat(500), taskBrief: '' }] }, employees, 'pesan CEO');
  assert.equal(item.taskTitle.length, LIMITS.title);
  assert.equal(item.taskBrief, 'pesan CEO');
  assert.deepEqual(selectAssignments(null, employees), []);
  assert.deepEqual(selectAssignments({ assignments: 'x' }, employees), []);
  assert.deepEqual(selectAssignments({}, employees), []);
});

test('clampText never splits a surrogate pair', () => {
  const text = 'ab😀cd';
  assert.equal(clampText(text, 3), 'ab');
  assert.equal(clampText(text, 4), 'ab😀');
  assert.equal(clampText('  hai  ', 10), 'hai');
});

test('synthesis prompt includes results and failures, with bounded size', () => {
  const prompt = buildSynthesisPrompt({
    message: 'Buat kampanye',
    summary: 'Rencana',
    employees,
    assignments: [
      { employeeId: 'nara', taskTitle: 'Riset', success: true, response: 'R'.repeat(10000) },
      { employeeId: 'kata', taskTitle: 'Naskah', success: false, error: 'Kuota habis' }
    ]
  });
  assert.match(prompt, /Instruksi CEO:\nBuat kampanye/);
  assert.match(prompt, /### Nara — Market Researcher — Riset/);
  assert.match(prompt, /### Kata — Copywriter — Naskah\n\[BELUM SELESAI\] Kuota habis/);
  assert.ok(prompt.length < LIMITS.synthesisPerSpecialist + 1000);
});

test('revision input validation', () => {
  const ok = { employeeId: 'kata', taskTitle: 'Naskah', taskBrief: 'Brief', previousResult: 'Hasil lama', note: 'Lebih singkat' };
  const good = validateRevisionInput(ok, employees);
  assert.equal(good.error, undefined);
  assert.equal(good.value.employeeId, 'kata');

  const cases = [
    [{ ...ok, employeeId: 'constructor' }, 400],
    [{ ...ok, employeeId: 'tidak-ada' }, 400],
    [{ ...ok, note: ' ' }, 400],
    [{ ...ok, note: 5 }, 400],
    [{ ...ok, note: 'x'.repeat(LIMITS.note + 1) }, 400],
    [{ ...ok, previousResult: '  ' }, 400],
    [{ ...ok, previousResult: undefined }, 400],
    [null, 400]
  ];
  for (const [body, status] of cases) assert.equal(validateRevisionInput(body, employees).error?.status, status, JSON.stringify(body)?.slice(0, 60));
});

test('revision input is clamped and the byte budget is enforced', () => {
  const long = validateRevisionInput({ employeeId: 'nara', previousResult: 'p'.repeat(20000), note: 'ok' }, employees);
  assert.equal(long.value.previousResult.length, LIMITS.previousResult);
  assert.equal(long.value.taskTitle, 'Tugas tanpa judul');

  const heavy = validateRevisionInput({ employeeId: 'nara', previousResult: '漢'.repeat(6000), note: '漢'.repeat(2000), taskBrief: '漢'.repeat(1600) }, employees);
  assert.equal(heavy.error?.status, 413);
});

test('revision prompt contains the previous result and the CEO note', () => {
  const prompt = buildRevisionPrompt({ taskTitle: 'Naskah', taskBrief: '', previousResult: 'Versi satu', note: 'Tambah CTA' });
  assert.match(prompt, /Tugas awal: Naskah/);
  assert.doesNotMatch(prompt, /Brief awal/);
  assert.match(prompt, /Hasil sebelumnya:\nVersi satu/);
  assert.match(prompt, /Catatan revisi dari CEO:\nTambah CTA/);
});
