import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const workspace = await readFile(new URL('../public/local-workspace.js', import.meta.url), 'utf8');
const github = await readFile(new URL('../public/github-reader.js', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) {
  throw new Error(`Expected exactly one inline script block, found ${scripts.length}.`);
}
new Script(scripts[0][1], { filename: 'public/index.html:inline-script' });
new Script(workspace, { filename: 'public/local-workspace.js' });
new Script(github, { filename: 'public/github-reader.js' });
if (!html.includes('<script src="local-workspace.js"></script>')) {
  throw new Error('The local workspace UI script is not linked from index.html.');
}
if (!html.includes('<script src="github-reader.js"></script>')) {
  throw new Error('The GitHub Explorer script is not linked from index.html.');
}
console.log('Frontend inline, workspace, and GitHub Explorer JavaScript syntax: OK');
