// Loaded into a child server with `node --import`. It replaces global fetch for
// Gemini hosts only, so server.js runs unmodified and no real network or key is used.
// Behaviour is selected by markers in the latest user text, e.g. [[http:429]].
import { appendFileSync } from 'node:fs';

const GEMINI_PREFIX = 'https://generativelanguage.googleapis.com/';
const realFetch = globalThis.fetch;
const logPath = process.env.NEXUS_TEST_GEMINI_LOG;

const reply = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'content-type': 'application/json' }
});
const textResponse = (text, finishReason = 'STOP') => reply({
  candidates: [{ finishReason, content: { role: 'model', parts: text === null ? [] : [{ text }] } }]
});

function plannerPlan(marker) {
  if (marker.includes('[[planner:bad-json]]')) return 'bukan json {';
  if (marker.includes('[[planner:none]]')) return JSON.stringify({ summary: 'Tidak perlu spesialis', assignments: [] });
  if (marker.includes('[[planner:fail-specialist]]')) {
    return JSON.stringify({
      summary: 'Rencana sebagian',
      assignments: [
        { employeeId: 'nara', taskTitle: 'Riset pasar', taskBrief: 'Riset pasar kopi.' },
        { employeeId: 'kata', taskTitle: 'Naskah iklan', taskBrief: 'Tulis naskah iklan. [[http:429]]' }
      ]
    });
  }
  // Default: duplicates, an invalid id, the leader and a fourth valid specialist
  // that the server must filter or cut down to three unique specialists.
  return JSON.stringify({
    summary: 'Rencana uji',
    assignments: [
      { employeeId: 'nara', taskTitle: 'Riset pelanggan', taskBrief: 'Riset segmen pelanggan.' },
      { employeeId: 'nara', taskTitle: 'Duplikat', taskBrief: 'Tidak boleh dipakai.' },
      { employeeId: 'sena', taskTitle: 'Pemimpin', taskBrief: 'Tidak boleh dipakai.' },
      { employeeId: 'tidak-ada', taskTitle: 'Tidak valid', taskBrief: 'Tidak boleh dipakai.' },
      { employeeId: 'kata', taskTitle: 'Naskah', taskBrief: 'Tulis naskah singkat.' },
      { employeeId: 'juno', taskTitle: 'Konsep', taskBrief: 'Susun konsep kampanye.' },
      { employeeId: 'arka', taskTitle: 'Strategi', taskBrief: 'Keempat, harus dipotong.' }
    ]
  });
}

globalThis.fetch = async (input, init = {}) => {
  const url = String(input?.url ?? input);
  if (!url.startsWith(GEMINI_PREFIX)) return realFetch(input, init);

  const body = JSON.parse(init.body);
  if (logPath) {
    appendFileSync(logPath, `${JSON.stringify({ url, apiKey: init.headers?.['x-goog-api-key'], body })}\n`);
  }

  const lastText = body.contents?.at(-1)?.parts?.map((part) => part.text).join('') ?? '';
  const httpMarker = lastText.match(/\[\[http:(\d{3})\]\]/);
  if (httpMarker) {
    return reply({ error: { message: 'mock provider error with secret-value-that-must-not-leak' } }, Number(httpMarker[1]));
  }
  const finishMarker = lastText.match(/\[\[finish:([A-Z_]+)\]\]/);
  if (finishMarker) {
    return textResponse(finishMarker[1].endsWith('_EMPTY') ? null : 'Jawaban sebagian', finishMarker[1].replace(/_EMPTY$/, ''));
  }
  if (lastText.includes('[[block]]')) return reply({ promptFeedback: { blockReason: 'SAFETY' } });
  if (lastText.includes('[[no-text]]')) return textResponse(null);

  if (body.generationConfig?.responseMimeType === 'application/json') return textResponse(plannerPlan(lastText));
  return textResponse(`Balasan mock untuk: ${lastText.slice(0, 60)}`);
};
