import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanHistory, buildGeminiContents, HISTORY_LIMITS } from '../history.js';

const totalBytes = (turns) => turns.reduce((sum, turn) => sum + Buffer.byteLength(turn.parts[0].text, 'utf8'), 0);

test('cleanHistory ignores invalid entries and starts with a user turn', () => {
  const result = cleanHistory([
    { role: 'model', text: 'orphan response' },
    { role: 'system', text: 'not a Gemini role' },
    { role: 'user', text: 'Pertanyaan pertama' },
    { role: 'model', text: 'Jawaban pertama' }
  ]);
  assert.equal(result[0].role, 'user');
  assert.deepEqual(result.map((turn) => turn.role), ['user', 'model']);
});

test('cleanHistory bounds turns and the total UTF-8 byte size', () => {
  const history = Array.from({ length: 20 }, (_, i) => ({
    role: i % 2 ? 'model' : 'user',
    text: `${i}-${'界'.repeat(1800)}`
  }));
  const result = cleanHistory(history);
  assert.ok(result.length <= HISTORY_LIMITS.turns);
  assert.ok(totalBytes(result) <= HISTORY_LIMITS.totalBytes);
  assert.equal(result[0]?.role, 'user');
});

test('cleanHistory favors newest turns when the budget is exceeded', () => {
  const history = Array.from({ length: 8 }, (_, i) => ({
    role: i % 2 ? 'model' : 'user',
    text: `TURN-${i}-${'x'.repeat(1000)}`
  }));
  const result = cleanHistory(history);
  const combined = result.map((turn) => turn.parts[0].text).join('\n');
  assert.match(combined, /TURN-7/);
  assert.match(combined, /TURN-6/);
  assert.doesNotMatch(combined, /TURN-0/);
  assert.equal(result[0]?.role, 'user');
});

test('cleanHistory preserves the beginning of long turns', () => {
  const result = cleanHistory([{ role: 'user', text: 'BEGIN-' + 'z'.repeat(5000) + '-END' }]);
  assert.match(result[0].parts[0].text, /^BEGIN-/);
  assert.ok(!result[0].parts[0].text.endsWith('-END'));
  assert.ok(Buffer.byteLength(result[0].parts[0].text, 'utf8') <= HISTORY_LIMITS.perTurnBytes);
});

test('buildGeminiContents merges a new user prompt into a trailing user turn', () => {
  const result = buildGeminiContents([
    { role: 'user', text: 'Pertanyaan lama' },
    { role: 'model', text: 'Jawaban lama' },
    { role: 'user', text: 'Pertanyaan gagal terkirim' }
  ], 'Pertanyaan terbaru');
  assert.equal(result.at(-1).role, 'user');
  assert.match(result.at(-1).parts[0].text, /Pertanyaan terbaru/);
  assert.equal(result.filter((turn) => turn.role === 'user').length, 2);
});

test('buildGeminiContents adds a user turn after a model turn', () => {
  const result = buildGeminiContents([
    { role: 'user', text: 'Pertanyaan lama' },
    { role: 'model', text: 'Jawaban lama' }
  ], 'Pertanyaan baru');
  assert.deepEqual(result.map((turn) => turn.role), ['user', 'model', 'user']);
  assert.match(result.at(-1).parts[0].text, /Pertanyaan baru/);
});
