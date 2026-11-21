import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [html, agent] = await Promise.all([
  read('../public/index.html'),
  read('../public/local-agent.js')
]);

test('Local Agent is connected to the assistant page and local GGUF engine', () => {
  assert.ok(html.includes('<script src="local-agent.js"></script>'));
  assert.match(html, /window\.NexusLocalAI=\{getEngine:\(\)=>LOCAL_AI\.engine\}/);
  assert.match(html, /window\.NexusAgent\.run\(f,LOCAL_AI\.engine\)/);
  assert.match(html, /window\.NexusAgent\.view\(\)/);
  assert.match(agent, /engine\.createChatCompletion\(/);
});

test('Agent exposes only bounded read/check/propose tools and caps tool calls at three', () => {
  assert.match(agent, /var MAX_STEPS = 3/);
  for (const name of ['workspace_list','workspace_read','workspace_check','github_list','github_read','workspace_propose_write','web_search']) {
    assert.ok(agent.includes("'" + name + "'") || agent.includes('=== "' + name + '"'), 'missing allowlisted tool ' + name);
  }
  assert.match(agent, /for \(var step = 0; step < MAX_STEPS; step \+= 1\)/);
  assert.match(agent, /parseModelAction/);
  assert.match(agent, /Format respons model tidak valid/);
});

test('GitHub tool uses public HTTPS GET only and never sends credentials', () => {
  const start = agent.indexOf('async function githubContents(args) {');
  const end = agent.indexOf('function decodeGithubText(', start);
  assert.ok(start >= 0 && end > start);
  const githubTool = agent.slice(start, end);
  assert.match(githubTool, /https:\/\/api\.github\.com\/repos\//);
  assert.match(githubTool, /method: 'GET'/);
  assert.match(githubTool, /application\/vnd\.github\+json/);
  assert.doesNotMatch(githubTool, /Authorization|Bearer |access_token|personal.access.token|method:\s*'(POST|PUT|PATCH|DELETE)'/i);
  assert.doesNotMatch(agent, /localStorage|GEMINI_API_KEY/);
});

test('File modifications stop at a visible proposal until the owner confirms apply', () => {
  assert.match(agent, /\/__nexus\/propose/);
  assert.match(agent, /proposal_created: true/);
  assert.match(agent, /Setujui & simpan/);
  assert.match(agent, /window\.confirm\('Setujui dan simpan file '/);
  assert.match(agent, /\/__nexus\/apply/);
  assert.match(agent, /state\.proposal = null/);
});

test('Agent does not delete files, write GitHub, run arbitrary code, or invoke a shell', () => {
  assert.match(agent, /Tidak ada alat untuk menghapus file, menulis repository GitHub/);
  assert.match(agent, /Pemeriksaan sintaks tidak menjalankan kode/);
  assert.doesNotMatch(agent, /child_process|subprocess|shell\s*:\s*true|eval\s*\(|new Function\s*\(/);
  assert.doesNotMatch(agent, /method:\s*'(PUT|PATCH|DELETE)'/i);
});

test('Agent displays a tool execution trace and explicit feature boundaries', () => {
  assert.match(agent, /function stepView\(\)/);
  assert.match(agent, /repository GitHub publik/);
  assert.match(agent, /web_search/);
  assert.match(agent, /eksekusi kode aplikasi/);
});


test('Agent web search sends only a bounded query to the loopback search endpoint', () => {
  assert.match(agent, /name === 'web_search'/);
  assert.match(agent, /\/__nexus\/search\?q=/);
  assert.match(agent, /Hanya kata kunci pencarian yang dikirim ke DuckDuckGo/);
  assert.match(agent, /Pencarian web mengirim kata kunci ke DuckDuckGo/);
});
