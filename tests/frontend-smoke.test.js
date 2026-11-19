import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'frontend inline script must exist');

function createBrowser({ saved = null, companyResponse = null } = {}) {
  const handlers = { document: {}, window: {} };
  const elements = {
    '#nav': { innerHTML: '' },
    '#main': { innerHTML: '' },
    '#toast': { textContent: '', style: {} }
  };
  const storage = {
    value: saved,
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
    removeItem() { this.value = null; }
  };
  const calls = [];
  const document = {
    querySelector(selector) { return elements[selector] || null; },
    addEventListener(type, callback) { (handlers.document[type] ||= []).push(callback); },
    createElement() { return { value: '', select() {}, remove() {} }; },
    body: { appendChild() {} }
  };
  class FormDataStub {
    constructor(form) { this.form = form; }
    get(name) { return this.form.values?.[name] ?? null; }
  }
  const fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === '/api/health') return { ok: true, json: async () => ({ ok: true, aiConfigured: false, model: 'test-model' }) };
    if (url === '/api/company') return { ok: true, json: async () => companyResponse || ({ summary: 'Tidak ada delegasi', assignments: [], model: 'test-model' }) };
    if (url === '/api/chat') return { ok: true, json: async () => ({ reply: 'Balasan uji', model: 'test-model' }) };
    return { ok: false, json: async () => ({ error: 'Not found' }) };
  };
  const sandbox = {
    document,
    window: { localStorage: storage },
    localStorage: storage,
    location: { hash: '#dashboard' },
    addEventListener(type, callback) { (handlers.window[type] ||= []).push(callback); },
    fetch,
    FormData: FormDataStub,
    AbortController,
    TextEncoder,
    Date,
    JSON,
    Math,
    Set,
    Map,
    String,
    Number,
    Array,
    Object,
    Promise,
    Error,
    console,
    setTimeout,
    clearTimeout,
    navigator: { clipboard: { writeText: async () => {} } },
    confirm: () => true
  };
  vm.runInNewContext(script, sandbox, { timeout: 1500, filename: 'NEXUS index.html inline script' });
  return { handlers, elements, storage, calls, sandbox };
}

test('frontend boots and renders main dashboard using browser storage', async () => {
  const browser = createBrowser();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(browser.elements['#nav'].innerHTML, /Dashboard/);
  assert.match(browser.elements['#main'].innerHTML, /Selamat datang/);
  assert.ok(browser.calls.some((call) => call.url === '/api/health'));
});

test('frontend tolerates incomplete legacy data and safely renders unknown employee tasks', async () => {
  const saved = JSON.stringify({ ceo: 'CEO Test', tasks: [{ id: 1, t: 'Tugas lama', emp: 'unknown-person', st: 'invalid', pg: 87 }] });
  const browser = createBrowser({ saved });
  await new Promise((resolve) => setTimeout(resolve, 0));
  browser.sandbox.location.hash = '#tugas';
  browser.handlers.window.hashchange?.forEach((callback) => callback());
  assert.match(browser.elements['#main'].innerHTML, /Tugas lama/);
  assert.match(browser.elements['#main'].innerHTML, /Karyawan tidak dikenal/);
});

test('company chat saves delegated AI output as a reviewable task and displays it on Tasks page', async () => {
  const companyResponse = {
    summary: 'Sena membagi riset ke Nara.',
    model: 'test-model',
    assignments: [{
      employeeId: 'nara', taskTitle: 'Riset pelanggan', taskBrief: 'Cari segmen pengguna.',
      success: true, response: 'Hasil riset untuk ditinjau CEO.'
    }]
  };
  const browser = createBrowser({ companyResponse });
  const submit = browser.handlers.document.submit[0];
  assert.equal(typeof submit, 'function');
  const form = { dataset: { f: 'chat', key: 'company' }, values: { m: 'Lakukan riset pelanggan.' } };
  await submit({ target: form, preventDefault() {} });
  const state = JSON.parse(browser.storage.value);
  assert.equal(state.tasks.length, 1);
  assert.equal(state.tasks[0].result, 'Hasil riset untuk ditinjau CEO.');
  assert.equal(state.tasks[0].brief, 'Cari segmen pengguna.');
  browser.sandbox.location.hash = '#tugas';
  browser.handlers.window.hashchange?.forEach((callback) => callback());
  assert.match(browser.elements['#main'].innerHTML, /Hasil riset untuk ditinjau CEO/);
  assert.ok(browser.calls.some((call) => call.url === '/api/company'));
});
