import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const html = await read('../public/index.html');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '';

function section(startMarker, endMarker) {
  const start = script.indexOf(startMarker);
  const end = script.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'Missing section: ' + startMarker);
  return script.slice(start, end);
}

const loadModel = section('async function loadLocalAIModel(){', 'async function submitLocalAI(form){');
const chat = section('async function submitLocalAI(form){', 'async function unloadLocalAIModel(){');
const unload = section('async function unloadLocalAIModel(){', 'const V={');

test('local assistant loads a user-selected GGUF file with CPU-only conservative settings', () => {
  assert.match(script, /const LOCAL_AI=\{engine:null,loading:false,busy:false/);
  assert.match(script, /WLLAMA_MODULE_URL='https:\/\/cdn\.jsdelivr\.net\/npm\/@wllama\/wllama@3\.13\.0\/esm\/index\.js'/);
  assert.match(script, /WLLAMA_WASM_URL='https:\/\/cdn\.jsdelivr\.net\/npm\/@wllama\/wllama@3\.13\.0\/esm\/wasm-from-cdn\.js'/);
  assert.match(loadModel, /\.gguf/);
  assert.match(loadModel, /600\*1024\*1024/);
  assert.match(loadModel, /new module\.Wllama\(wasmModule\.default\)/);
  assert.match(loadModel, /engine\.loadModel\(\[file\],\{n_ctx:2048,n_threads:1,n_gpu_layers:0\}\)/);
  assert.doesNotMatch(loadModel, /fetch\s*\(|\/api\//);
});

test('model engine is imported only after the user activates the load control', () => {
  assert.match(loadModel, /import\(WLLAMA_MODULE_URL\)/);
  assert.match(loadModel, /import\(WLLAMA_WASM_URL\)/);
  assert.match(script, /if\(a==='load-local-ai'\)\{void loadLocalAIModel\(\);return\}/);
  const startup = script.slice(script.lastIndexOf("addEventListener('hashchange'"));
  assert.doesNotMatch(startup, /loadLocalAIModel/);
  assert.match(html, /\['asisten','Asisten AI','ai'\]/);
  assert.match(html, /data-f="local-ai-chat"/);
});

test('chat generation runs through the in-memory WebAssembly object, not a hosted endpoint', () => {
  assert.match(chat, /LOCAL_AI\.engine\.createChatCompletion\(/);
  assert.match(chat, /max_tokens:256/);
  assert.match(chat, /S\.chats\.localai/);
  assert.match(chat, /LOCAL_AI\.engine/);
  assert.doesNotMatch(chat, /fetch\s*\(|XMLHttpRequest|\/api\//);
  assert.match(chat, /Kamu hanya menghasilkan teks/);
  assert.match(chat, /Pengguna masih remaja/);
});

test('local model can be unloaded to release memory and history can be cleared separately', () => {
  assert.match(unload, /LOCAL_AI\.engine\.exit\(\)/);
  assert.match(unload, /LOCAL_AI\.engine=null/);
  assert.match(script, /if\(a==='unload-local-ai'\)\{void unloadLocalAIModel\(\);return\}/);
  assert.match(script, /if\(a==='clear-local-ai-chat'\).*S\.chats\.localai=\[\]/);
});

test('assistant output is limited, escaped before rendering, and never claimed to have external tools', () => {
  assert.match(script, /reply\.slice\(0,10000\)/);
  assert.match(script, /esc\(item\.t\)/);
  assert.match(chat, /tidak memiliki akses internet, file, GitHub, pembayaran, atau alat eksternal/);
  assert.match(html, /Jawaban dibatasi 256 token per pesan/);
});

test('Android launcher exposes the workspace bridge on loopback only, not an AI endpoint', async () => {
  const launcher = await read('../scripts/start-nexus-android.sh');
  assert.match(launcher, /python -m http\.server/);
  assert.match(launcher, /--bind 127\.0\.0\.1/);
  assert.match(launcher, /--directory "\$ROOT_DIR\/public"/);
  assert.doesNotMatch(launcher, /--bind\s+0\.0\.0\.0|\/api\/|GEMINI_API_KEY/);
});
