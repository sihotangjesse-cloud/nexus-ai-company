import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('UI foundation keeps one inline script and accessible primary navigation', () => {
  assert.equal((html.match(/<script>/g) || []).length, 1, 'frontend must keep exactly one inline script');
  assert.match(html, /<nav id="nav" aria-label="Navigasi utama">/);
  for (const route of ['dashboard', 'karyawan', 'chat', 'kantor', 'tugas', 'kalender', 'laporan', 'pengaturan']) {
    assert.ok(html.includes(`['${route}'`), `navigation route ${route} must remain available`);
  }
  assert.match(html, /function svgIcon\(name\)/);
  assert.match(html, /nav\.map\(n=>`<a href=/);
});

test('AI connection header exposes verified, configured, setup, and loading states', () => {
  assert.match(html, /function topHeader\(\)/);
  for (const state of ['is-ok', 'is-warn', 'is-neutral', 'is-loading']) {
    assert.ok(html.includes(state), `status class ${state} must exist`);
  }
  assert.match(html, /KONEKSI AI TERUJI/);
  assert.match(html, /API KEY TERPASANG · SIAP DIUJI/);
  assert.match(html, /MEMERIKSA SERVER/);
});

test('mobile navigation provides all eight items in a visible two-row grid', () => {
  assert.match(html, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(html, /grid-template-rows:repeat\(2,minmax\(37px,auto\)\)/);
  assert.match(html, /safe-area-inset-bottom/);
});

test('dashboard metrics include inline SVG icon slots', () => {
  assert.ok(html.includes('class=\"c stat-card\"'), 'dashboard metric card class must be rendered');
  assert.ok(html.includes('class=\"stat-icon\"'), 'dashboard metric icon slot must be rendered');
});

test('specialist result is escaped and persisted task output is visible for CEO review', () => {
  assert.match(html, /task\.result=a\.response\.slice\(0,12000\)/);
  assert.match(html, /class="task-result"/);
  assert.match(html, /<pre>\$\{esc\(k\.result\)\}<\/pre>/);
});

test('legacy tasks with unknown employees have a safe display fallback', () => {
  assert.match(html, /function employeeName\(id\)\{return em\(id\)\?\.n\|\|'Karyawan tidak dikenal'\}/);
});
