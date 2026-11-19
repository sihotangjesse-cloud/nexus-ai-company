import { createHash } from 'node:crypto';

export function inlineScriptHash(html) {
  const scripts = [...String(html).matchAll(/<script>([\s\S]*?)<\/script>/gi)];
  if (scripts.length !== 1) {
    throw new Error(`Expected exactly one inline script; found ${scripts.length}.`);
  }
  const digest = createHash('sha256').update(scripts[0][1], 'utf8').digest('base64');
  return `'sha256-${digest}'`;
}
