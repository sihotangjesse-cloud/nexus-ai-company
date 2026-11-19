import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const preload = pathToFileURL(path.join(root, 'tests', 'helpers', 'mock-gemini-preload.mjs')).href;

export const projectRoot = root;

// Integration tests need the real runtime dependencies. When they are missing the
// suites are skipped with an explicit reason instead of failing with import errors.
export const dependenciesAvailable = (() => {
  try {
    const require = createRequire(path.join(root, 'package.json'));
    for (const name of ['express', 'helmet', 'express-rate-limit', 'dotenv']) require.resolve(name);
    return true;
  } catch {
    return false;
  }
})();
export const skipReason = dependenciesAvailable
  ? false
  : 'Dependensi belum terpasang (jalankan "npm install"); tes integrasi backend dilewati.';

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function baseEnv(port, logPath) {
  return {
    PATH: process.env.PATH,
    NODE_ENV: 'development',
    PORT: String(port),
    GEMINI_API_KEY: 'test-key-123',
    GEMINI_MODEL: 'gemini-3.8-flash',
    TRUST_PROXY_HOPS: '0',
    NEXUS_ACCESS_PASSWORD: '',
    NEXUS_SESSION_SECRET: '',
    NEXUS_MAX_GEMINI_CALLS_PER_MINUTE: '1000',
    NEXUS_MAX_GEMINI_CALLS_PER_DAY: '100000',
    NEXUS_TEST_GEMINI_LOG: logPath
  };
}

function spawnServer(env) {
  const child = spawn(process.execPath, ['--import', preload, 'server.js'], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const state = { output: '' };
  child.stdout.on('data', (chunk) => { state.output += chunk; });
  child.stderr.on('data', (chunk) => { state.output += chunk; });
  return { child, state };
}

export async function startServer(overrides = {}) {
  const port = await freePort();
  const dir = await mkdtemp(path.join(tmpdir(), 'nexus-it-'));
  const logPath = path.join(dir, 'gemini.jsonl');
  const { child, state } = spawnServer({ ...baseEnv(port, logPath), ...overrides });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server tidak siap dalam 15 detik.\n${state.output}`)), 15000);
    const poll = setInterval(() => {
      if (/berjalan di http:\/\/[\d.]+:\d+/.test(state.output)) { clearTimeout(timer); clearInterval(poll); resolve(); }
    }, 25);
    child.once('exit', (code) => {
      clearTimeout(timer); clearInterval(poll);
      reject(new Error(`Server berhenti lebih awal (kode ${code}).\n${state.output}`));
    });
  });

  return {
    port,
    baseUrl: `http://127.0.0.1:${port}`,
    output: () => state.output,
    async geminiCalls() {
      const raw = await readFile(logPath, 'utf8').catch(() => '');
      return raw.split('\n').filter(Boolean).map((line) => JSON.parse(line));
    },
    async stop() {
      if (child.exitCode === null) {
        child.kill('SIGTERM');
        await new Promise((resolve) => child.once('exit', resolve));
      }
      await rm(dir, { recursive: true, force: true });
    }
  };
}

// For configurations that must make the server refuse to start.
export async function runServerExpectingExit(overrides = {}) {
  const port = await freePort();
  const { child, state } = spawnServer({ ...baseEnv(port, ''), ...overrides });
  const code = await new Promise((resolve) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve('timeout'); }, 15000);
    child.once('exit', (exitCode) => { clearTimeout(timer); resolve(exitCode); });
  });
  return { code, output: state.output };
}

// Same-origin JSON request by default, mirroring what the browser front end sends.
export async function request(server, route, { method = 'GET', body, headers = {}, cookie, origin = server.baseUrl, rawBody } = {}) {
  const finalHeaders = { ...headers };
  const hasBody = body !== undefined || rawBody !== undefined;
  if (hasBody) finalHeaders['Content-Type'] = 'application/json';
  if (origin) finalHeaders.Origin = origin;
  if (cookie) finalHeaders.Cookie = cookie;
  const response = await fetch(`${server.baseUrl}${route}`, {
    method,
    headers: finalHeaders,
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* HTML or empty body */ }
  return { status: response.status, headers: response.headers, text, json, setCookie: response.headers.getSetCookie?.() ?? [] };
}
