import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '';

test('personal offline mode is forced on every protocol', () => {
  assert.match(html, /const PERSONAL_OFFLINE_MODE=true;/);
  assert.doesNotMatch(html, /PERSONAL_OFFLINE_MODE=location\.protocol/);
  assert.match(html, /title='MODE PRIBADI OFFLINE'/);
});

test('offline mode disables backend authentication and health requests', () => {
  assert.match(html, /required:!PERSONAL_OFFLINE_MODE,authenticated:PERSONAL_OFFLINE_MODE,checked:PERSONAL_OFFLINE_MODE/);
  assert.match(html, /async function refreshAIStatus\(\)\{if\(PERSONAL_OFFLINE_MODE\)/);
});

test('offline API guard stops before fetch can run', () => {
  const start = html.indexOf('async function api(path,payload){');
  assert.notEqual(start, -1);
  const body = html.slice(start, start + 1500);
  assert.match(body, /if\(PERSONAL_OFFLINE_MODE\)throw new Error/);
  assert.ok(body.indexOf('if(PERSONAL_OFFLINE_MODE)throw new Error') < body.indexOf('fetch('));
});

test('offline coordination and employee chat use local templates instead of AI calls', () => {
  assert.match(script, /function offlineAssistantReply\(key,message\)/);
  assert.match(script, /Buat kerangka offline/);
  assert.match(script, /Template kerja offline digunakan/);
  assert.match(script, /Template kerja dibuat secara lokal/);
  assert.match(script, /Tidak ada AI eksternal, API, atau kredit yang digunakan/);
});

test('offline AI revision remains blocked', () => {
  const start = script.indexOf('async function reviseTask(id,note){');
  assert.notEqual(start, -1);
  const body = script.slice(start, start + 700);
  assert.match(body, /if\(PERSONAL_OFFLINE_MODE\)\{toast\('Revisi AI tidak tersedia pada mode pribadi offline\.'/);
  assert.ok(body.indexOf('if(PERSONAL_OFFLINE_MODE)') < body.indexOf("api('/api/revise'"));
});

test('single-owner personal branding and project workspace are available', () => {
  assert.ok(html.includes('<title>NEXUS PERSONAL</title>'));
  assert.ok(html.includes('PERSONAL WORKSPACE · v1.5.0'));
  assert.ok(html.includes('RUANG KERJA PRIBADI'));
  assert.ok(html.includes('Ruang Proyek'));
  assert.ok(html.includes('Buat proyek + checklist kerja'));
  assert.ok(html.includes('Unduh website HTML'));
  assert.ok(html.includes('projectDetail(id)'));
});
