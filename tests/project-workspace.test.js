import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '';

const websiteTypes = [
  { id: 'company', label: 'Company profile' },
  { id: 'landing', label: 'Landing page' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'ecommerce', label: 'Toko online' },
  { id: 'blog', label: 'Blog / artikel' },
  { id: 'webapp', label: 'Web app / dashboard' }
];
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function extractFunction(name, nextMarker) {
  const start = script.indexOf('function ' + name + '(');
  const end = script.indexOf(nextMarker, start);
  assert.ok(start >= 0 && end > start, name + ' helper must exist');
  return script.slice(start, end);
}

const buildPlan = new Function(
  'WEBSITE_TYPES',
  extractFunction('buildWebsitePlan', '\\nfunction buildWebsiteStarter(project){') + '\\nreturn buildWebsitePlan;'
)(websiteTypes);

const buildStarter = new Function(
  'esc', 'WEBSITE_TYPES',
  extractFunction('buildWebsiteStarter', '\\nfunction downloadWebsiteStarter(project){') + '\\nreturn buildWebsiteStarter;'
)(escapeHtml, websiteTypes);

const normalizeProject = new Function(
  'isRecord', 'WEBSITE_TYPES', 'PROJECT_STATUSES',
  extractFunction('normalizeProject', '\\nfunction normalizeTask(raw){') + '\\nreturn normalizeProject;'
)((value) => !!value && typeof value === 'object' && !Array.isArray(value), websiteTypes,
 ['Perencanaan', 'Berjalan', 'Ditunda', 'Selesai']);

test('project normalization keeps valid data and falls back safely for invalid fields', () => {
  const project = normalizeProject({
    id: 101, name: 'Website NEXUS', type: 'portfolio',
    objective: 'Membuat portofolio profesional.', stack: 'HTML, CSS, JavaScript',
    targetDate: '2026-12-10', status: 'Berjalan', createdAt: 1000
  });
  assert.equal(project.id, 101);
  assert.equal(project.name, 'Website NEXUS');
  assert.equal(project.type, 'portfolio');
  assert.equal(project.status, 'Berjalan');
  assert.equal(project.targetDate, '2026-12-10');

  const safe = normalizeProject({ id: 'bad', type: 'invalid', status: 'unknown', targetDate: '31-12-2026' });
  assert.equal(safe.type, 'company');
  assert.equal(safe.status, 'Perencanaan');
  assert.equal(safe.targetDate, '');
});

test('website plan assigns actionable work to research, design, copy, development, and QA roles', () => {
  const project = {
    name: 'Website Portofolio',
    type: 'portfolio',
    objective: 'Menampilkan karya dan layanan secara profesional.',
    stack: 'HTML, CSS, JavaScript'
  };
  const plan = buildPlan(project);
  const employees = new Set(plan.map((step) => step.emp));
  assert.ok(plan.length >= 12);
  for (const employee of ['sena', 'nara', 'jejak', 'juno', 'rupa', 'kata', 'arka', 'raka', 'tara']) {
    assert.ok(employees.has(employee), 'plan should include ' + employee);
  }
  assert.ok(plan.some((step) => /studi kasus/i.test(step.title)));
  assert.ok(plan.some((step) => step.brief.includes('HTML, CSS, JavaScript')));
});

test('specialized project types add their own feature checklist items', () => {
  const base = { name: 'Proyek contoh', objective: 'Membangun website untuk pengguna.', stack: 'HTML, CSS, JavaScript' };
  assert.ok(buildPlan({ ...base, type: 'ecommerce' }).some((step) => /keranjang/i.test(step.title)));
  assert.ok(buildPlan({ ...base, type: 'blog' }).some((step) => /artikel/i.test(step.title)));
  assert.ok(buildPlan({ ...base, type: 'webapp' }).some((step) => /state aplikasi/i.test(step.title)));
});

test('website starter is standalone, responsive, and escapes user-provided content', () => {
  const source = buildStarter({
    name: '<script>alert(1)</script>',
    type: 'landing',
    objective: '<img src=x onerror=alert(1)>',
  });
  assert.match(source, /^<!doctype html>/i);
  assert.match(source, /<meta name="viewport"/);
  assert.match(source, /@media\(max-width:760px\)/);
  assert.match(source, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(source, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(source, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(source, /<img src=x onerror=alert\(1\)>/);
  assert.doesNotMatch(source, /https?:\/\//);
});

test('project and task links are persisted and project filters are exposed in the UI', () => {
  assert.match(script, /projects:Array\.isArray\(raw\.projects\)\?raw\.projects\.map\(normalizeProject\)/);
  assert.match(script, /projectId:raw\.projectId/);
  assert.match(script, /if\(filters\.project&&String\(task\.projectId\|\|''\)/);
  assert.match(script, /data-task-filter="project"/);
  assert.match(script, /data-f="edit-project"/);
  assert.match(script, /data-a="download-starter"/);
});
