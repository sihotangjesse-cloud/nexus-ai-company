import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const workspace = await readFile(new URL('../public/local-workspace.js', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) {
  throw new Error(`Expected exactly one inline script block, found ${scripts.length}.`);
}
new Script(scripts[0][1], { filename: 'public/index.html:inline-script' });
new Script(workspace, { filename: 'public/local-workspace.js' });
if (!html.includes('<script src="local-workspace.js"></script>')) {
  throw new Error('The local workspace UI script is not linked from index.html.');
}
console.log('Frontend inline and workspace JavaScript syntax: OK');
