import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('opening the HTML file automatically selects offline demo mode', () => {
  assert.match(html, /const STATIC_DEMO_MODE=location\.protocol==='file:'/);
  assert.match(html, /title='MODE DEMO OFFLINE'/);
});

test('offline demo mode disables authentication and skips backend health checks', () => {
  assert.match(html, /required:!STATIC_DEMO_MODE,authenticated:STATIC_DEMO_MODE,checked:STATIC_DEMO_MODE/);
  assert.match(html, /async function refreshAIStatus\(\)\{if\(STATIC_DEMO_MODE\)/);
});

test('offline demo mode blocks API calls before fetch can run', () => {
  const apiStart = html.indexOf('async function api(path,payload){');
  assert.notEqual(apiStart, -1);
  const apiBody = html.slice(apiStart, apiStart + 1500);
  assert.match(apiBody, /if\(STATIC_DEMO_MODE\)throw new Error/);
  assert.ok(apiBody.indexOf('if(STATIC_DEMO_MODE)throw new Error') < apiBody.indexOf('fetch('));
});

test('offline demo chat controls are disabled and carry an explicit notice', () => {
  assert.match(html, /STATIC_DEMO_MODE\?'AI nonaktif'/);
  assert.match(html, /STATIC_DEMO_NOTICE/);
  assert.match(html, /Chat AI, delegasi, dan revisi AI dinonaktifkan/);
});


test('offline demo clearly labels AI chat and hides the AI revision form', () => {
  assert.match(html, /Direktori karyawan contoh\. Percakapan AI tidak tersedia pada demo offline/);
  assert.match(html, /Chat AI dan delegasi Sena tidak aktif pada mode demo offline/);
  assert.match(html, /if\(!STATIC_DEMO_MODE&&em\(k\.emp\)\)/);
  assert.match(html, /Mode demo offline: revisi AI tidak tersedia/);
});

test('offline demo has a defensive guard against AI task revision requests', () => {
  const reviseStart = html.indexOf('async function reviseTask(id,note){');
  assert.notEqual(reviseStart, -1);
  const reviseBody = html.slice(reviseStart, reviseStart + 700);
  assert.match(reviseBody, /if\(STATIC_DEMO_MODE\)\{toast\('Revisi AI tidak tersedia/);
  assert.ok(reviseBody.indexOf('if(STATIC_DEMO_MODE)') < reviseBody.indexOf("api('/api/revise'"));
});
