import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) {
  throw new Error(`Expected exactly one inline script block, found ${scripts.length}.`);
}
new Script(scripts[0][1], { filename: 'public/index.html:inline-script' });
console.log('Frontend inline JavaScript syntax: OK');
