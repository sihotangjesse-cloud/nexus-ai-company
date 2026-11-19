import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inlineScriptHash } from '../csp.js';
import { createSessionToken } from '../auth.js';
import { skipReason, startServer, runServerExpectingExit, request, projectRoot } from './helpers/server-harness.mjs';

// Every suite starts its own server process (the AI route limiters are per process
// and per minute) with Gemini replaced by tests/helpers/mock-gemini-preload.mjs.
// Nothing here talks to the real Gemini API.

const chat = (srv, body, options = {}) => request(srv, '/api/chat', { method: 'POST', body, ...options });
const company = (srv, body, options = {}) => request(srv, '/api/company', { method: 'POST', body, ...options });
const longText = (length) => 'x'.repeat(length);

// Child-process output arrives through a separate pipe, so poll briefly instead of assuming ordering.
async function eventually(check, message, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.fail(message);
}

// Alter a character in the middle of the signature; the last base64url character carries
// padding bits that do not change the decoded bytes, so flipping it would not be a real tamper.
function tamperSignature(cookie) {
  const [name, token] = cookie.split('=');
  const [expires, nonce, signature] = token.split('.');
  const index = 5;
  const changed = signature.slice(0, index) + (signature[index] === 'A' ? 'B' : 'A') + signature.slice(index + 1);
  return `${name}=${expires}.${nonce}.${changed}`;
}

if (skipReason) console.warn(`[NEXUS TEST] ${skipReason}`);

// node:test does not count tests inside a skipped suite, so without this marker a run
// without installed dependencies would look fully green. This makes the skip visible.
test('backend integration suites are runnable (express, helmet, express-rate-limit, dotenv installed)', { skip: skipReason }, () => {
  assert.equal(skipReason, false);
});

describe('chat route and Gemini error mapping', { skip: skipReason }, () => {
  let srv;
  before(async () => { srv = await startServer(); });
  after(async () => { await srv?.stop(); });

  test('valid chat reaches Gemini with the key, employee prompt, merged history and low thinking level', async () => {
    const history = [{ role: 'user', text: 'Halo' }, { role: 'model', text: 'Hai, ada yang bisa dibantu?' }];
    const res = await chat(srv, { employeeId: 'nara', message: 'Analisis pasar kopi', history });
    assert.equal(res.status, 200);
    assert.equal(res.json.employeeId, 'nara');
    assert.match(res.json.reply, /Balasan mock untuk/);
    assert.equal(res.json.model, 'gemini-3.8-flash');
    assert.doesNotMatch(res.text, /test-key-123/);
    assert.equal(res.headers.get('cache-control'), 'no-store');

    const [call] = await srv.geminiCalls();
    assert.match(call.url, /models\/gemini-3\.8-flash:generateContent$/);
    assert.equal(call.apiKey, 'test-key-123');
    assert.match(call.body.systemInstruction.parts[0].text, /Kamu Nara/);
    assert.deepEqual(call.body.contents.map((turn) => turn.role), ['user', 'model', 'user']);
    assert.equal(call.body.contents.at(-1).parts[0].text, 'Analisis pasar kopi');
    assert.equal(call.body.generationConfig.thinkingConfig.thinkingLevel, 'LOW');
    assert.equal(call.body.generationConfig.maxOutputTokens, 2048);
  });

  test('unknown employee id is rejected before any Gemini call', async () => {
    const before = (await srv.geminiCalls()).length;
    const res = await chat(srv, { employeeId: 'tidak-ada', message: 'Halo dunia' });
    assert.equal(res.status, 400);
    assert.match(res.json.error, /ID karyawan tidak dikenal/);
    assert.equal((await srv.geminiCalls()).length, before);
  });

  test('too short and too long messages are rejected', async () => {
    const short = await chat(srv, { employeeId: 'nara', message: 'a' });
    assert.equal(short.status, 400);
    const long = await chat(srv, { employeeId: 'nara', message: longText(3001) });
    assert.equal(long.status, 400);
    assert.match(long.json.error, /2–3\.000 karakter/);
  });

  test('a history that is too large for the route limit returns 413', async () => {
    const history = Array.from({ length: 17 }, (_, index) => ({ role: index % 2 ? 'model' : 'user', text: longText(1500) }));
    const res = await chat(srv, { employeeId: 'nara', message: 'Ringkas', history });
    assert.equal(res.status, 413);
    assert.match(res.json.error, /terlalu besar/i);
  });

  test('Gemini 429 becomes a quota message with status 429', async () => {
    const res = await chat(srv, { employeeId: 'nara', message: 'Halo [[http:429]]' });
    assert.equal(res.status, 429);
    assert.match(res.json.error, /Kuota atau batas penggunaan AI/);
  });

  test('Gemini 401 becomes a configuration message and leaks neither the key nor provider text', async () => {
    const res = await chat(srv, { employeeId: 'nara', message: 'Halo [[http:401]]' });
    assert.equal(res.status, 502);
    assert.match(res.json.error, /Kunci API Gemini ditolak/);
    assert.doesNotMatch(res.text, /test-key-123|secret-value-that-must-not-leak/);
  });

  test('a truncated plain-text answer is returned with a note instead of being discarded', async () => {
    const res = await chat(srv, { employeeId: 'nara', message: 'Halo [[finish:MAX_TOKENS]]' });
    assert.equal(res.status, 200);
    assert.match(res.json.reply, /Jawaban sebagian/);
    assert.match(res.json.reply, /\[Catatan: jawaban terhenti/);
  });
});

describe('chat route: more provider failures and the per-minute AI limiter', { skip: skipReason }, () => {
  let srv;
  before(async () => { srv = await startServer(); });
  after(async () => { await srv?.stop(); });

  test('safety, prompt-block, empty and missing-model responses map to the documented statuses', async () => {
    const send = (marker) => chat(srv, { employeeId: 'kata', message: `Tulis caption ${marker}` });
    const safety = await send('[[finish:SAFETY]]');
    assert.equal(safety.status, 422);
    assert.match(safety.json.error, /pemeriksaan keamanan/);

    const blocked = await send('[[block]]');
    assert.equal(blocked.status, 422);

    const empty = await send('[[no-text]]');
    assert.equal(empty.status, 502);
    assert.match(empty.json.error, /tidak memberikan jawaban teks/);

    const truncatedEmpty = await send('[[finish:MAX_TOKENS_EMPTY]]');
    assert.equal(truncatedEmpty.status, 502);
    assert.match(truncatedEmpty.json.error, /terpotong/);

    const missingModel = await send('[[http:404]]');
    assert.equal(missingModel.status, 502);
    assert.match(missingModel.json.error, /gemini-3\.8-flash/);
  });

  test('a provider 500 is reported generically', async () => {
    const res = await chat(srv, { employeeId: 'kata', message: 'Tulis caption [[http:500]]' });
    assert.equal(res.status, 502);
    assert.match(res.json.error, /Layanan AI sedang mengalami gangguan/);
    assert.doesNotMatch(res.text, /secret-value-that-must-not-leak/);
  });

  test('the ninth AI request within a minute is rate limited', async () => {
    // Requests so far on this server: 6. Two more succeed; the ninth is rejected.
    for (let index = 0; index < 2; index += 1) {
      const ok = await chat(srv, { employeeId: 'kata', message: `Caption ke-${index}` });
      assert.equal(ok.status, 200);
    }
    const limited = await chat(srv, { employeeId: 'kata', message: 'Caption terakhir' });
    assert.equal(limited.status, 429);
    assert.match(limited.json.error, /Batas permintaan AI sementara tercapai/);
  });
});

describe('request hygiene, health, CSP and origin checks (local mode)', { skip: skipReason }, () => {
  let srv;
  before(async () => { srv = await startServer(); });
  after(async () => { await srv?.stop(); });

  test('health reports configuration without exposing the model, provider or key', async () => {
    const res = await request(srv, '/api/health', { origin: null, headers: { 'X-Forwarded-For': '203.0.113.7' } });
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    assert.equal(res.json.authRequired, false);
    assert.equal(res.json.authenticated, true);
    assert.equal(res.json.aiConfigured, true);
    assert.equal('model' in res.json, false);
    assert.equal('provider' in res.json, false);
    assert.doesNotMatch(res.text, /test-key-123/);
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  test('an X-Forwarded-For header with an untrusted proxy triggers the configuration warning', async () => {
    await eventually(() => /X-Forwarded-For diterima tetapi proxy tidak dipercaya/.test(srv.output()), 'proxy warning was not printed');
  });

  test('the page is served with a CSP that allows only the application script hash', async () => {
    const res = await request(srv, '/', { origin: null });
    assert.equal(res.status, 200);
    assert.match(res.text, /NEXUS AI COMPANY/);
    const html = await readFile(`${projectRoot}public/index.html`, 'utf8');
    const csp = res.headers.get('content-security-policy') || '';
    assert.ok(csp.includes(`script-src 'self' ${inlineScriptHash(html)}`), 'script-src carries the hash of the served inline script');
    const scriptDirective = csp.split(';').map((part) => part.trim()).find((part) => part.startsWith('script-src '));
    assert.ok(scriptDirective, 'script-src directive is present');
    assert.doesNotMatch(scriptDirective, /unsafe-inline/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  test('malformed JSON returns a generic Indonesian message, not the parser text', async () => {
    const res = await request(srv, '/api/chat', { method: 'POST', rawBody: '{bad json' });
    assert.equal(res.status, 400);
    assert.match(res.json.error, /Format permintaan tidak valid/);
    assert.doesNotMatch(res.text, /JSON at position|Unexpected token/i);
  });

  test('a body above the 32 KB parser ceiling returns 413', async () => {
    const res = await chat(srv, { employeeId: 'nara', message: 'Halo', history: [{ role: 'user', text: longText(40000) }] });
    assert.equal(res.status, 413);
    assert.match(res.json.error, /terlalu besar/i);
  });

  test('cross-site and malformed Origin headers are refused on API writes', async () => {
    const cross = await chat(srv, { employeeId: 'nara', message: 'Halo dunia' }, { origin: 'http://evil.example' });
    assert.equal(cross.status, 403);
    assert.match(cross.json.error, /lintas situs/);
    const invalid = await chat(srv, { employeeId: 'nara', message: 'Halo dunia' }, { origin: 'bukan-url' });
    assert.equal(invalid.status, 403);
    assert.match(invalid.json.error, /Header origin tidak valid/);
  });

  test('login is unavailable in local mode and the server binds to loopback', async () => {
    const res = await request(srv, '/api/login', { method: 'POST', body: { password: 'apa saja' } });
    assert.equal(res.status, 400);
    await eventually(() => /http:\/\/127\.0\.0\.1:\d+/.test(srv.output()) && /Autentikasi nonaktif/.test(srv.output()), 'startup lines were not printed');
  });
});

describe('company delegation with a mocked planner and specialists', { skip: skipReason }, () => {
  let srv;
  before(async () => { srv = await startServer(); });
  after(async () => { await srv?.stop(); });

  test('the plan is filtered to three unique specialists and each one is run', async () => {
    const res = await company(srv, { message: 'Buat strategi peluncuran kopi', history: [] });
    assert.equal(res.status, 200);
    assert.equal(res.json.summary, 'Rencana uji');
    assert.equal(res.json.model, 'gemini-3.8-flash');
    assert.deepEqual(res.json.assignments.map((a) => a.employeeId), ['nara', 'kata', 'juno']);
    for (const assignment of res.json.assignments) {
      assert.equal(assignment.success, true);
      assert.ok(assignment.response.length > 0);
      assert.ok(assignment.taskTitle.length > 0 && assignment.taskBrief.length > 0);
    }

    const calls = await srv.geminiCalls();
    assert.equal(calls.length, 5, 'one planner call, three specialist calls and one synthesis call');
    const planner = calls[0];
    const specialists = calls.slice(1, 4);
    const synthesisCall = calls[4];
    assert.match(synthesisCall.body.systemInstruction.parts[0].text, /sintesis akhir untuk CEO/);
    assert.equal(synthesisCall.body.generationConfig.responseMimeType, undefined);
    assert.equal(typeof res.json.synthesis, 'string');
    assert.ok(res.json.synthesis.length > 0);
    assert.equal(res.json.synthesisError, null);
    assert.equal(planner.body.generationConfig.responseMimeType, 'application/json');
    assert.ok(planner.body.generationConfig.responseSchema);
    assert.equal(planner.body.generationConfig.maxOutputTokens, 3072);
    for (const specialist of specialists) {
      assert.match(specialist.body.systemInstruction.parts[0].text, /Kamu menerima tugas dari Sena/);
      assert.equal(specialist.body.generationConfig.maxOutputTokens, 2048);
      assert.equal(specialist.body.generationConfig.responseMimeType, undefined);
    }
  });

  test('one failing specialist is reported without failing the others', async () => {
    const res = await company(srv, { message: 'Rencana sebagian [[planner:fail-specialist]]' });
    assert.equal(res.status, 200);
    const byId = Object.fromEntries(res.json.assignments.map((a) => [a.employeeId, a]));
    assert.equal(byId.nara.success, true);
    assert.equal(byId.kata.success, false);
    assert.match(byId.kata.error, /Kuota atau batas penggunaan AI/);
    assert.equal('response' in byId.kata, false);
    assert.equal(typeof res.json.synthesis, 'string', 'synthesis is still produced from the successful specialist');
  });

  test('the third delegation within a minute hits the company limiter before Gemini is called', async () => {
    const before = (await srv.geminiCalls()).length;
    const res = await company(srv, { message: 'Delegasi ketiga' });
    assert.equal(res.status, 429);
    assert.match(res.json.error, /Batas delegasi perusahaan tercapai/);
    assert.equal((await srv.geminiCalls()).length, before);
  });
});

describe('company delegation: unreadable and empty plans', { skip: skipReason }, () => {
  let srv;
  before(async () => { srv = await startServer(); });
  after(async () => { await srv?.stop(); });

  test('a planner answer that is not JSON gives a 502 with a readable message', async () => {
    const res = await company(srv, { message: 'Rencanakan [[planner:bad-json]]' });
    assert.equal(res.status, 502);
    assert.match(res.json.error, /Sena belum menghasilkan rencana yang dapat dibaca/);
  });

  test('a plan with no specialists returns an empty assignment list and runs no specialist', async () => {
    const before = (await srv.geminiCalls()).length;
    const res = await company(srv, { message: 'Tidak butuh spesialis [[planner:none]]' });
    assert.equal(res.status, 200);
    assert.equal(res.json.summary, 'Tidak perlu spesialis');
    assert.deepEqual(res.json.assignments, []);
    assert.equal('synthesis' in res.json, false, 'no synthesis without specialists');
    assert.equal((await srv.geminiCalls()).length - before, 1, 'only the planner call');
  });
});

describe('company route validation', { skip: skipReason }, () => {
  let srv;
  before(async () => { srv = await startServer(); });
  after(async () => { await srv?.stop(); });

  test('invalid instructions and oversized history are rejected without calling Gemini', async () => {
    const tooShort = await company(srv, { message: ' ' });
    assert.equal(tooShort.status, 400);
    assert.match(tooShort.json.error, /Instruksi harus berisi/);

    const history = Array.from({ length: 17 }, (_, index) => ({ role: index % 2 ? 'model' : 'user', text: longText(1500) }));
    const tooLarge = await company(srv, { message: 'Buat rencana', history });
    assert.equal(tooLarge.status, 413);
    assert.equal((await srv.geminiCalls()).length, 0);
  });
});

describe('Gemini call budget (per minute)', { skip: skipReason }, () => {
  let srv;
  before(async () => { srv = await startServer({ NEXUS_MAX_GEMINI_CALLS_PER_MINUTE: '2' }); });
  after(async () => { await srv?.stop(); });

  test('calls beyond the budget fail individually and never reach Gemini', async () => {
    const res = await company(srv, { message: 'Buat strategi peluncuran kopi' });
    assert.equal(res.status, 200);
    const [first, second, third] = res.json.assignments;
    assert.equal(first.success, true);
    for (const rejected of [second, third]) {
      assert.equal(rejected.success, false);
      assert.match(rejected.error, /Batas pemanggilan AI per menit/);
    }
    assert.equal(res.json.synthesis, null);
    assert.match(res.json.synthesisError, /Batas pemanggilan AI per menit/);
    assert.equal((await srv.geminiCalls()).length, 2, 'planner plus one specialist');
  });
});

describe('Gemini call budget (per day) and a missing API key', { skip: skipReason }, () => {
  let limited;
  let withoutKey;
  before(async () => {
    limited = await startServer({ NEXUS_MAX_GEMINI_CALLS_PER_DAY: '1' });
    withoutKey = await startServer({ GEMINI_API_KEY: '' });
  });
  after(async () => { await limited?.stop(); await withoutKey?.stop(); });

  test('the daily budget stops further AI calls', async () => {
    const first = await chat(limited, { employeeId: 'nara', message: 'Pertanyaan pertama' });
    assert.equal(first.status, 200);
    const second = await chat(limited, { employeeId: 'nara', message: 'Pertanyaan kedua' });
    assert.equal(second.status, 429);
    assert.match(second.json.error, /Batas pemanggilan AI harian/);
    assert.equal((await limited.geminiCalls()).length, 1);
  });

  test('without GEMINI_API_KEY chat returns 503 and health says the key is missing', async () => {
    const res = await chat(withoutKey, { employeeId: 'nara', message: 'Halo dunia' });
    assert.equal(res.status, 503);
    assert.match(res.json.error, /AI belum dikonfigurasi/);
    const health = await request(withoutKey, '/api/health', { origin: null });
    assert.equal(health.json.aiConfigured, false);
    assert.equal((await withoutKey.geminiCalls()).length, 0);
  });
});

describe('authentication when a password is configured', { skip: skipReason }, () => {
  const password = 'correct-horse-battery';
  const secret = 'session-secret-0123456789abcdef0123456789';
  let srv;
  before(async () => { srv = await startServer({ NEXUS_ACCESS_PASSWORD: password, NEXUS_SESSION_SECRET: secret }); });
  after(async () => { await srv?.stop(); });

  const cookieFrom = (res) => res.setCookie[0]?.split(';')[0];

  test('unauthenticated health reveals neither AI status nor model', async () => {
    const res = await request(srv, '/api/health', { origin: null });
    assert.equal(res.json.authRequired, true);
    assert.equal(res.json.authenticated, false);
    assert.equal(res.json.aiConfigured, false);
    assert.equal('model' in res.json, false);
  });

  test('AI routes answer 401 without a session and require an Origin header', async () => {
    const chatRes = await chat(srv, { employeeId: 'nara', message: 'Halo dunia' });
    assert.equal(chatRes.status, 401);
    const companyRes = await company(srv, { message: 'Buat rencana' });
    assert.equal(companyRes.status, 401);
    const noOrigin = await chat(srv, { employeeId: 'nara', message: 'Halo dunia' }, { origin: null });
    assert.equal(noOrigin.status, 403);
    assert.match(noOrigin.json.error, /Header Origin diperlukan/);
    assert.equal((await srv.geminiCalls()).length, 0);
  });

  test('wrong or missing passwords are refused and a cross-origin login is blocked', async () => {
    const wrong = await request(srv, '/api/login', { method: 'POST', body: { password: 'salah-salah-salah' } });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.setCookie.length, 0);
    const missing = await request(srv, '/api/login', { method: 'POST', body: {} });
    assert.equal(missing.status, 401);
    const cross = await request(srv, '/api/login', { method: 'POST', body: { password }, origin: 'http://evil.example' });
    assert.equal(cross.status, 403);
  });

  test('a correct login issues an HttpOnly, SameSite=Strict cookie that unlocks the AI routes', async () => {
    const login = await request(srv, '/api/login', { method: 'POST', body: { password } });
    assert.equal(login.status, 200);
    assert.equal(login.json.authenticated, true);
    assert.equal(login.json.expiresIn, 43200);
    const header = login.setCookie[0];
    assert.match(header, /^nexus_session=/);
    assert.match(header, /HttpOnly/i);
    assert.match(header, /SameSite=Strict/i);
    assert.match(header, /Path=\//);
    assert.doesNotMatch(header, /;\s*Secure/i, 'Secure is only set in production mode');

    const cookie = cookieFrom(login);
    const health = await request(srv, '/api/health', { origin: null, cookie });
    assert.equal(health.json.authenticated, true);
    assert.equal(health.json.aiConfigured, true);
    assert.equal('model' in health.json, false);

    const ok = await chat(srv, { employeeId: 'nara', message: 'Halo setelah login' }, { cookie });
    assert.equal(ok.status, 200);
    assert.equal((await srv.geminiCalls()).length, 1);

    const logout = await request(srv, '/api/logout', { method: 'POST', body: {}, cookie });
    assert.equal(logout.status, 200);
    assert.equal(logout.json.authenticated, false);
    assert.match(logout.setCookie[0] ?? '', /^nexus_session=;/);
  });

  test('tampered, garbage and wrongly signed session cookies are rejected', async () => {
    const login = await request(srv, '/api/login', { method: 'POST', body: { password } });
    const cookie = cookieFrom(login);
    const flipped = tamperSignature(cookie);
    const forged = `nexus_session=${createSessionToken('another-secret-0123456789abcdef0123456789')}`;
    for (const bad of [flipped, 'nexus_session=garbage', forged]) {
      const res = await chat(srv, { employeeId: 'nara', message: 'Halo dunia' }, { cookie: bad });
      assert.equal(res.status, 401, `cookie should be rejected: ${bad.slice(0, 30)}`);
    }
  });
});

describe('login attempt limiter', { skip: skipReason }, () => {
  let srv;
  before(async () => { srv = await startServer({ NEXUS_ACCESS_PASSWORD: 'correct-horse-battery', NEXUS_SESSION_SECRET: 'session-secret-0123456789abcdef0123456789' }); });
  after(async () => { await srv?.stop(); });

  test('the sixth attempt in the window is blocked even with the right password', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await request(srv, '/api/login', { method: 'POST', body: { password: `salah-${attempt}-salah-salah` } });
      assert.equal(res.status, 401);
    }
    const blocked = await request(srv, '/api/login', { method: 'POST', body: { password: 'correct-horse-battery' } });
    assert.equal(blocked.status, 429);
    assert.match(blocked.json.error, /Terlalu banyak percobaan masuk/);
    assert.equal(blocked.setCookie.length, 0);
  });
});

describe('startup configuration', { skip: skipReason }, () => {
  test('production without credentials refuses to start', async () => {
    const result = await runServerExpectingExit({ NODE_ENV: 'production' });
    assert.notEqual(result.code, 0);
    assert.match(result.output, /Mode produksi membutuhkan NEXUS_ACCESS_PASSWORD minimal 12 karakter/);
  });

  test('production with a short password or short secret refuses to start', async () => {
    const shortPassword = await runServerExpectingExit({ NODE_ENV: 'production', NEXUS_ACCESS_PASSWORD: 'pendek', NEXUS_SESSION_SECRET: 'x'.repeat(40) });
    assert.notEqual(shortPassword.code, 0);
    const shortSecret = await runServerExpectingExit({ NODE_ENV: 'production', NEXUS_ACCESS_PASSWORD: 'long-enough-password', NEXUS_SESSION_SECRET: 'terlalu-pendek' });
    assert.notEqual(shortSecret.code, 0);
  });

  test('setting only one of password and secret is refused in any mode', async () => {
    const result = await runServerExpectingExit({ NEXUS_ACCESS_PASSWORD: 'long-enough-password' });
    assert.notEqual(result.code, 0);
    assert.match(result.output, /harus diatur bersama-sama/);
  });

  test('an invalid call budget value is refused', async () => {
    const result = await runServerExpectingExit({ NEXUS_MAX_GEMINI_CALLS_PER_MINUTE: 'abc' });
    assert.notEqual(result.code, 0);
    assert.match(result.output, /harus berupa bilangan bulat/);
  });

  test('a valid production configuration starts, binds to all interfaces and marks the cookie Secure', async () => {
    const password = 'long-enough-password';
    const srv = await startServer({ NODE_ENV: 'production', NEXUS_ACCESS_PASSWORD: password, NEXUS_SESSION_SECRET: 'session-secret-0123456789abcdef0123456789' });
    try {
      await eventually(() => /http:\/\/0\.0\.0\.0:\d+/.test(srv.output()) && /TRUST_PROXY_HOPS=0/.test(srv.output()), 'production startup lines were not printed');
      const login = await request(srv, '/api/login', { method: 'POST', body: { password } });
      assert.equal(login.status, 200);
      assert.match(login.setCookie[0], /;\s*Secure/i);
    } finally {
      await srv.stop();
    }
  });
});

describe('revision route and input hardening (v0.3.5)', { skip: skipReason }, () => {
  let srv;
  before(async () => { srv = await startServer(); });
  after(async () => { await srv?.stop(); });
  const revise = (body, options = {}) => request(srv, '/api/revise', { method: 'POST', body, ...options });
  const valid = { employeeId: 'kata', taskTitle: 'Naskah', taskBrief: 'Tulis naskah.', previousResult: 'Naskah versi satu.', note: 'Buat lebih singkat.' };

  test('a valid revision request returns the revised text from the employee', async () => {
    const before = (await srv.geminiCalls()).length;
    const res = await revise(valid);
    assert.equal(res.status, 200);
    assert.equal(res.json.employeeId, 'kata');
    assert.match(res.json.reply, /^Balasan mock untuk: Tugas awal: Naskah/);
    const calls = await srv.geminiCalls();
    assert.equal(calls.length - before, 1);
    const sent = JSON.stringify(calls.at(-1).body.contents);
    assert.match(sent, /Naskah versi satu\./);
    assert.match(sent, /Buat lebih singkat\./);
    assert.match(calls.at(-1).body.systemInstruction.parts[0].text, /Kamu Kata, Copywriter/);
  });

  test('invalid revision input is rejected before Gemini is called', async () => {
    const before = (await srv.geminiCalls()).length;
    for (const body of [
      { ...valid, employeeId: 'tidak-ada' },
      { ...valid, employeeId: 'constructor' },
      { ...valid, note: ' ' },
      { ...valid, note: 'x'.repeat(2001) }
    ]) {
      const res = await revise(body);
      assert.equal(res.status, 400, JSON.stringify(body).slice(0, 80));
    }
    assert.equal((await srv.geminiCalls()).length, before);
  });

  test('provider errors on revision use the same safe messages', async () => {
    const res = await revise({ ...valid, note: 'Perbaiki [[http:429]]' });
    assert.equal(res.status, 429);
    assert.match(res.json.error, /Kuota atau batas penggunaan AI/);
    assert.doesNotMatch(JSON.stringify(res.json), /secret-value-that-must-not-leak/);
  });

  test('prototype property names are not treated as employees on the chat route', async () => {
    const res = await chat(srv, { employeeId: 'constructor', message: 'Halo dunia' });
    assert.equal(res.status, 400);
  });

  test('unknown API routes return JSON 404', async () => {
    const res = await request(srv, '/api/tidak-ada');
    assert.equal(res.status, 404);
    assert.match(res.json.error, /Endpoint tidak ditemukan/);
  });
});

