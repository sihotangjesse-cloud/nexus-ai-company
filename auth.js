import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function safeStringEqual(candidate, expected) {
  const left = createHash('sha256').update(String(candidate ?? ''), 'utf8').digest();
  const right = createHash('sha256').update(String(expected ?? ''), 'utf8').digest();
  return timingSafeEqual(left, right);
}

export function createSessionToken(secret, ttlSeconds = 43200, nowMs = Date.now()) {
  if (typeof secret !== 'string' || secret.length < 32) throw new TypeError('Session secret must contain at least 32 characters.');
  const expiresAt = Math.floor(nowMs / 1000) + ttlSeconds;
  const payload = `${expiresAt}.${randomBytes(18).toString('base64url')}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token, secret, nowMs = Date.now()) {
  if (typeof token !== 'string' || typeof secret !== 'string' || secret.length < 32) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || !/^\d{10}$/.test(parts[0])) return false;
  const [expiresAtText, nonce, suppliedSignature] = parts;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(nonce) || !/^[A-Za-z0-9_-]{40,64}$/.test(suppliedSignature)) return false;
  if (Number(expiresAtText) * 1000 <= nowMs) return false;
  const payload = `${expiresAtText}.${nonce}`;
  const expected = createHmac('sha256', secret).update(payload).digest();
  let supplied;
  try { supplied = Buffer.from(suppliedSignature, 'base64url'); } catch { return false; }
  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}

export function readCookie(cookieHeader, name) {
  for (const part of String(cookieHeader || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return ''; }
  }
  return '';
}
