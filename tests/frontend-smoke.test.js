import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'frontend inline script must exist');

function createBrowser({ saved = null, protocol = 'http:' } = {}) {
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
    throw new Error('Unexpected network request from offline NEXUS: ' + url);
  };
  const sandbox = {
    document,
    window: { localStorage: storage },
    localStorage: storage,
    location: { protocol, hash: '#dashboard' },
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

test('frontend boots on localhost and does not contact backend health endpoints', async () => {
  const browser = createBrowser({ protocol: 'http:' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(browser.elements['#nav'].innerHTML, /Dashboard/);
  assert.match(browser.elements['#main'].innerHTML, /Selamat datang/);
  assert.match(browser.elements['#main'].innerHTML, /MODE PRIBADI OFFLINE/);
  assert.deepEqual(browser.calls, []);
});

test('frontend also stays offline when served over another web origin', async () => {
  const browser = createBrowser({ protocol: 'https:' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(browser.elements['#main'].innerHTML, /MODE PRIBADI OFFLINE/);
  assert.deepEqual(browser.calls, []);
});

test('frontend tolerates incomplete legacy data and safely renders unknown employee tasks', async () => {
  const saved = JSON.stringify({ ceo: 'CEO Test', tasks: [{ id: 1, t: 'Tugas lama', emp: 'unknown-person', st: 'invalid', pg: 87 }] });
  const browser = createBrowser({ saved });
  await new Promise((resolve) => setTimeout(resolve, 0));
  browser.sandbox.location.hash = '#tugas';
  browser.handlers.window.hashchange?.forEach((callback) => callback());
  assert.match(browser.elements['#main'].innerHTML, /Tugas lama/);
  assert.match(browser.elements['#main'].innerHTML, /Karyawan tidak dikenal/);
  assert.deepEqual(browser.calls, []);
});

test('company chat uses a local role template and never calls an AI endpoint', async () => {
  const browser = createBrowser();
  const submit = browser.handlers.document.submit[0];
  assert.equal(typeof submit, 'function');
  const form = { dataset: { f: 'chat', key: 'company' }, values: { m: 'Lakukan riset pelanggan.' } };
  await submit({ target: form, preventDefault() {} });

  const state = JSON.parse(browser.storage.value);
  assert.equal(state.tasks.length, 0);
  assert.equal(state.chats.company.length, 2);
  assert.match(state.chats.company[1].t, /Template kerja offline/);
  assert.match(browser.elements['#main'].innerHTML, /Buat kerangka offline/);
  assert.deepEqual(browser.calls, []);
});
