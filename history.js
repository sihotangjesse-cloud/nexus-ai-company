// Bounded Gemini conversation history. Limits are measured in UTF-8 bytes,
// not JavaScript UTF-16 code units, so multilingual text stays predictable.
const MAX_HISTORY_TURNS = 8;
const MAX_HISTORY_BYTES = 5200;
const MAX_TURN_BYTES = 1600;

function utf8Bytes(value) {
  return Buffer.byteLength(value, 'utf8');
}

function takeUtf8Prefix(value, maxBytes) {
  if (maxBytes <= 0) return '';
  let output = '';
  let used = 0;
  for (const character of value) {
    const size = utf8Bytes(character);
    if (used + size > maxBytes) break;
    output += character;
    used += size;
  }
  return output;
}

export function cleanHistory(history) {
  if (!Array.isArray(history)) return [];

  const normalized = [];
  for (const item of history.slice(-MAX_HISTORY_TURNS)) {
    if (!item || !['user', 'model'].includes(item.role) || typeof item.text !== 'string') continue;
    const raw = item.text.trim();
    if (!raw) continue;

    // Keep the beginning of an individual turn: it normally contains the
    // original instruction/context, unlike slice(-N), which silently loses it.
    const text = takeUtf8Prefix(raw, MAX_TURN_BYTES);
    if (!text) continue;

    const previous = normalized.at(-1);
    if (previous?.role === item.role) previous.text += `\n\n${text}`;
    else normalized.push({ role: item.role, text });
  }

  // Gemini contents should begin with a user turn, never an orphan model turn.
  while (normalized.length && normalized[0].role !== 'user') normalized.shift();

  // Allocate the byte budget from newest turns backwards, retaining the most
  // recent context first. Any final orphan model turn is discarded afterwards.
  let remaining = MAX_HISTORY_BYTES;
  const retained = [];
  for (let index = normalized.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const turn = normalized[index];
    const text = takeUtf8Prefix(turn.text, Math.min(remaining, MAX_TURN_BYTES));
    if (!text) continue;
    retained.unshift({ role: turn.role, parts: [{ text }] });
    remaining -= utf8Bytes(text);
  }

  while (retained.length && retained[0].role !== 'user') retained.shift();
  return retained.slice(-MAX_HISTORY_TURNS);
}

export function buildGeminiContents(history, prompt) {
  const contents = cleanHistory(history);
  const safePrompt = String(prompt || '').trim();
  const lastTurn = contents.at(-1);
  if (lastTurn?.role === 'user') {
    lastTurn.parts[0].text += `\n\nInstruksi terbaru:\n${safePrompt}`;
  } else if (safePrompt) {
    contents.push({ role: 'user', parts: [{ text: safePrompt }] });
  }
  return contents;
}

export const HISTORY_LIMITS = Object.freeze({
  turns: MAX_HISTORY_TURNS,
  totalBytes: MAX_HISTORY_BYTES,
  perTurnBytes: MAX_TURN_BYTES
});
