import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'frontend inline script must exist');

const unescapeAttr = (value) => String(value).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attr = (source, name) => source.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];

// A deliberately small DOM: it parses the <form data-f> markup that the real
// render() produces, so field names and defaults come from the application itself.
function buildForms(markup) {
  const forms = [];
  for (const match of markup.matchAll(/<form ([^>]*data-f="[^"]+"[^>]*)>([\s\S]*?)<\/form>/g)) {
    const [, formAttrs, inner] = match;
    const controls = [];
    for (const input of inner.matchAll(/<input ([^>]*)>/g)) {
      const name = attr(input[1], 'name');
      if (!name) continue;
      const defaultValue = unescapeAttr(attr(input[1], 'value') ?? '');
      controls.push({ tagName: 'INPUT', name, type: attr(input[1], 'type') || 'text', value: defaultValue, defaultValue });
    }
    for (const select of inner.matchAll(/<select name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
      const options = [...select[2].matchAll(/<option([^>]*)>([^<]*)<\/option>/g)].map((o) => ({
        value: unescapeAttr(attr(o[1], 'value') ?? o[2]),
        defaultSelected: /\sselected\b/.test(o[1])
      }));
      const initial = options.find((o) => o.defaultSelected) || options[0];
      controls.push({ tagName: 'SELECT', name: select[1], type: 'select-one', value: initial?.value ?? '', options });
    }
    const form = {
      dataset: { f: attr(formAttrs, 'data-f'), ...(attr(formAttrs, 'data-key') ? { key: attr(formAttrs, 'data-key') } : {}) },
      elements: Object.assign(controls, { namedItem: (name) => controls.find((c) => c.name === name) || null }),
      reset() { for (const c of controls) c.value = c.tagName === 'SELECT' ? ((c.options.find((o) => o.defaultSelected) || c.options[0])?.value ?? '') : c.defaultValue; },
      get values() { return Object.fromEntries(controls.map((c) => [c.name, c.value])); }
    };
    for (const c of controls) {
      c.focused = false;
      c.focus = function focus() { this.focused = true; };
      c.setSelectionRange = function setSelectionRange(start, end) { this.selection = [start, end]; };
      c.closest = () => form;
    }
    forms.push(form);
  }
  return forms;
}

function createBrowser({ health = { ok: true, aiConfigured: false } } = {}) {
  const handlers = { document: {}, window: {} };
  const main = {
    _html: '', forms: [],
    get innerHTML() { return this._html; },
    set innerHTML(value) { this._html = value; this.forms = buildForms(value); },
    querySelectorAll(selector) { return selector === 'form[data-f]' ? this.forms : []; },
    contains() { return true; }
  };
  const elements = { '#nav': { innerHTML: '' }, '#main': main, '#toast': { textContent: '', style: {} } };
  const storage = { value: null, getItem() { return this.value; }, setItem(_k, v) { this.value = v; }, removeItem() { this.value = null; } };
  const document = {
    activeElement: undefined,
    querySelector(selector) { return elements[selector] || null; },
    addEventListener(type, callback) { (handlers.document[type] ||= []).push(callback); },
    createElement() { return { value: '', select() {}, remove() {} }; },
    body: { appendChild() {} }
  };
  class FormDataStub { constructor(form) { this.form = form; } get(name) { return this.form.values?.[name] ?? null; } }
  const fetch = async (url) => {
    if (url === '/api/health') return { ok: true, json: async () => health };
    if (url === '/api/chat') return { ok: true, json: async () => ({ reply: 'Balasan uji', model: 'test-model' }) };
    return { ok: false, json: async () => ({ error: 'Not found' }) };
  };
  const sandbox = {
    document, window: { localStorage: storage }, localStorage: storage, location: { hash: '#dashboard' },
    addEventListener(type, callback) { (handlers.window[type] ||= []).push(callback); },
    fetch, FormData: FormDataStub, AbortController, TextEncoder, Date, JSON, Math, Set, Map, String, Number, Array, Object, Promise, Error,
    console, setTimeout, clearTimeout, navigator: { clipboard: { writeText: async () => {} } }, confirm: () => true
  };
  vm.runInNewContext(script, sandbox, { timeout: 1500, filename: 'NEXUS index.html inline script' });
  const rerender = () => handlers.window.hashchange.forEach((callback) => callback());
  const goto = (hash) => { sandbox.location.hash = hash; rerender(); };
  const form = (type, key = '') => main.forms.find((f) => f.dataset.f === type && (f.dataset.key || '') === key);
  const field = (type, name, key = '') => form(type, key).elements.namedItem(name);
  const submit = (target) => handlers.document.submit[0]({ target, preventDefault() {} });
  return { elements, document, sandbox, storage, rerender, goto, form, field, submit };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test('every field of a multi-field form survives a re-render, not only the focused one', async () => {
  const b = createBrowser();
  await settle();
  b.goto('#tugas');
  b.field('task', 't').value = 'Riset kompetitor';
  b.field('task', 'e').value = 'nara';
  b.field('task', 'p').value = 'Tinggi';
  b.field('task', 'd').value = '2026-12-01';
  b.rerender();
  assert.equal(b.field('task', 't').value, 'Riset kompetitor');
  assert.equal(b.field('task', 'e').value, 'nara');
  assert.equal(b.field('task', 'p').value, 'Tinggi');
  assert.equal(b.field('task', 'd').value, '2026-12-01');
});

test('untouched fields keep their HTML defaults after a re-render', async () => {
  const b = createBrowser();
  await settle();
  b.goto('#tugas');
  const defaults = ['t', 'e', 'p', 'd'].map((name) => b.field('task', name).value);
  b.field('task', 't').value = 'Draf';
  b.rerender();
  assert.deepEqual(['e', 'p', 'd'].map((name) => b.field('task', name).value), defaults.slice(1));
  assert.equal(b.field('task', 'p').value, 'Sedang');
});

test('the async health check completing does not wipe a half-filled agenda form', async () => {
  const b = createBrowser();
  await settle(); // first health check resolves; the app leaves its initial login placeholder
  b.goto('#kalender');
  b.field('ev', 't').value = 'Rapat mingguan';
  b.field('ev', 'y').value = 'Jadwal kerja';
  await b.sandbox.refreshAIStatus(); // a later status refresh calls render() again
  assert.equal(b.field('ev', 't').value, 'Rapat mingguan');
  assert.equal(b.field('ev', 'y').value, 'Jadwal kerja');
});

test('a successful task submit clears the form instead of restoring the old draft', async () => {
  const b = createBrowser();
  await settle();
  b.goto('#tugas');
  b.field('task', 't').value = 'Siapkan proposal';
  b.field('task', 'd').value = '2026-12-05';
  await b.submit(b.form('task'));
  assert.equal(JSON.parse(b.storage.value).tasks.length, 1);
  assert.equal(b.field('task', 't').value, '');
  assert.equal(b.field('task', 'd').value, '');
});

test('a rejected submit keeps what the user typed', async () => {
  const b = createBrowser();
  await settle();
  b.goto('#tugas');
  b.field('task', 't').value = 'ab'; // below the 3 character minimum
  b.field('task', 'd').value = '2026-12-05';
  await b.submit(b.form('task'));
  assert.equal(JSON.parse(b.storage.value ?? '{"tasks":[]}').tasks.length, 0);
  assert.equal(b.field('task', 't').value, 'ab');
  assert.equal(b.field('task', 'd').value, '2026-12-05');
});

test('saving the CEO profile shows the new name, not the stale pre-save draft', async () => {
  const b = createBrowser();
  await settle();
  b.goto('#pengaturan');
  assert.equal(b.field('ceo', 'n').value, 'Founder');
  b.field('ceo', 'n').value = 'Budi';
  b.rerender();
  assert.equal(b.field('ceo', 'n').value, 'Budi', 'unsaved edit survives re-render');
  await b.submit(b.form('ceo'));
  assert.equal(JSON.parse(b.storage.value).ceo, 'Budi');
  assert.equal(b.field('ceo', 'n').value, 'Budi');
  b.rerender();
  assert.equal(b.field('ceo', 'n').value, 'Budi');
});

test('a chat draft stays with its own employee and does not leak into another chat', async () => {
  const b = createBrowser();
  await settle();
  b.goto('#k-nara');
  b.field('chat', 'm', 'nara').value = 'Pertanyaan untuk Nara';
  b.rerender();
  assert.equal(b.field('chat', 'm', 'nara').value, 'Pertanyaan untuk Nara');
  b.goto('#k-juno');
  assert.equal(b.field('chat', 'm', 'juno').value, '');
});

test('focus and caret position are restored on the re-rendered field', async () => {
  const b = createBrowser();
  await settle();
  b.goto('#k-nara');
  const before = b.field('chat', 'm', 'nara');
  before.value = 'halo dunia';
  before.selectionStart = 4;
  before.selectionEnd = 4;
  b.document.activeElement = before;
  b.rerender();
  const after = b.field('chat', 'm', 'nara');
  assert.notEqual(after, before, 'the DOM node was replaced');
  assert.equal(after.value, 'halo dunia');
  assert.equal(after.focused, true);
  assert.deepEqual(after.selection, [4, 4]);
});

test('a chat message is cleared once it has been sent', async () => {
  const b = createBrowser();
  await settle();
  b.goto('#k-nara');
  b.field('chat', 'm', 'nara').value = 'Tolong ringkas pasar kopi';
  await b.submit(b.form('chat', 'nara'));
  assert.equal(b.field('chat', 'm', 'nara').value, '');
  assert.match(b.elements['#main'].innerHTML, /Tolong ringkas pasar kopi/);
});

test('personal offline mode ignores backend auth status and never renders a login screen', async () => {
  const b = createBrowser({ health: { ok: true, authRequired: true, authenticated: false, aiConfigured: true } });
  await settle();
  assert.equal(b.form('login'), undefined, 'login screen is disabled in personal offline mode');
  assert.match(b.elements['#main'].innerHTML, /MODE PRIBADI OFFLINE/);
});
