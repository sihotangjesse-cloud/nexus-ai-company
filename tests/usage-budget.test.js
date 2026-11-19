import test from 'node:test';
import assert from 'node:assert/strict';
import { createCallBudget } from '../usage-budget.js';

test('call budget blocks calls after the per-minute limit', () => {
  let now = Date.UTC(2026, 10, 17, 8, 0, 0);
  const consume = createCallBudget({ perMinute: 2, perDay: 10, clock: () => now });
  consume(); consume();
  assert.throws(() => consume(), (error) => error.status === 429 && /per menit/.test(error.message));
  now += 60_000;
  assert.equal(consume().callsThisMinute, 1);
});

test('call budget blocks calls after the UTC daily limit and resets on a new UTC day', () => {
  let now = Date.UTC(2026, 10, 17, 23, 59, 0);
  const consume = createCallBudget({ perMinute: 5, perDay: 2, clock: () => now });
  consume(); consume();
  assert.throws(() => consume(), (error) => error.status === 429 && /harian/.test(error.message));
  now += 120_000;
  assert.equal(consume().callsToday, 1);
});

test('call budget configuration rejects invalid limits', () => {
  assert.throws(() => createCallBudget({ perMinute: 0, perDay: 2 }), TypeError);
  assert.throws(() => createCallBudget({ perMinute: 2, perDay: 1.5 }), TypeError);
});
