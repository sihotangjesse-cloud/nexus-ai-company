import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('NEXUS PERSONAL release metadata is synchronized for v1.5.0', async () => {
  const [packageText, lockText, html, changelog, readme, guide] = await Promise.all([
    read('../package.json'), read('../package-lock.json'), read('../public/index.html'),
    read('../CHANGELOG.md'), read('../README.md'), read('../PANDUAN_PERSONAL.md')
  ]);
  const pkg = JSON.parse(packageText), lock = JSON.parse(lockText);
  assert.equal(pkg.version, '1.5.0');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.ok(html.includes('PERSONAL WORKSPACE · v1.5.0'));
  assert.ok(html.includes("appVersion:'1.5.0'"));
  assert.ok(changelog.startsWith('# Changelog\n\n## 1.5.0 — Offline Website Studio'));
  assert.ok(readme.includes('Versi 1.5.0'));
  assert.ok(readme.includes('Website Studio offline'));
  assert.ok(guide.includes('Panduan NEXUS PERSONAL 1.5.0'));
  assert.ok(guide.includes('Edit dan pratinjau website'));
});
