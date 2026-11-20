import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('release version is synchronized across package, lockfile, UI, and backup metadata', async () => {
  const [packageText, lockText, html, changelog, readme] = await Promise.all([
    read('../package.json'),
    read('../package-lock.json'),
    read('../public/index.html'),
    read('../CHANGELOG.md'),
    read('../README.md')
  ]);
  const pkg = JSON.parse(packageText);
  const lock = JSON.parse(lockText);

  assert.equal(pkg.version, '1.0.0');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(html, /COMPANY OS · v1\.0\.0/);
  assert.match(html, /appVersion:'1\.0\.0'/);
  assert.match(changelog, /^## 1\.0\.0 — Fondasi rilis offline-first/m);
  assert.match(readme, /Versi sumber: 1\.0\.0/);
  assert.doesNotMatch(readme, /package-lock\.json.*belum|package-lock\.json.*not included/i);
});
