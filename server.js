import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createSessionToken, verifySessionToken, safeStringEqual, readCookie } from './auth.js';
import { createCallBudget } from './usage-budget.js';
import { inlineScriptHash } from './csp.js';
import { fileURLToPath } from 'node:url';
import { buildGeminiContents } from './history.js';
import { isKnownEmployee, selectAssignments, buildSynthesisPrompt, SYNTHESIS_SYSTEM_PROMPT, validateRevisionInput, buildRevisionPrompt } from './workflow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const API_KEY = process.env.GEMINI_API_KEY || '';
const ACCESS_PASSWORD = process.env.NEXUS_ACCESS_PASSWORD || '';
const SESSION_SECRET = process.env.NEXUS_SESSION_SECRET || '';
const SESSION_SIGNING_SECRET = SESSION_SECRET && ACCESS_PASSWORD
  ? `${SESSION_SECRET}:${createHash('sha256').update(ACCESS_PASSWORD, 'utf8').digest('hex')}`
  : '';
const AUTH_REQUIRED = process.env.NODE_ENV === 'production' || Boolean(ACCESS_PASSWORD || SESSION_SECRET);
const SESSION_COOKIE = 'nexus_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
if (Boolean(ACCESS_PASSWORD) !== Boolean(SESSION_SECRET)) {
  throw new Error('NEXUS_ACCESS_PASSWORD dan NEXUS_SESSION_SECRET harus diatur bersama-sama.');
}
if (AUTH_REQUIRED && (!ACCESS_PASSWORD || ACCESS_PASSWORD.length < 12 || !SESSION_SECRET || SESSION_SECRET.length < 32)) {
  throw new Error('Mode produksi membutuhkan NEXUS_ACCESS_PASSWORD minimal 12 karakter dan NEXUS_SESSION_SECRET minimal 32 karakter.');
}
const rawTrustProxyHops = process.env.TRUST_PROXY_HOPS;
const parsedTrustProxyHops = rawTrustProxyHops === undefined || rawTrustProxyHops === '' ? 0 : Number(rawTrustProxyHops);
const TRUST_PROXY_HOPS = Number.isInteger(parsedTrustProxyHops) && parsedTrustProxyHops >= 0
  ? parsedTrustProxyHops
  : null;
const MAX_MESSAGE_CHARS = 3000;
const MAX_MESSAGE_BYTES = 12000;
const MAX_CLEAN_REQUEST_BYTES = 24000;

function readPositiveLimit(name, fallback, maximum = 100000) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} harus berupa bilangan bulat antara 1 dan ${maximum}.`);
  }
  return value;
}
const MAX_GEMINI_CALLS_PER_MINUTE = readPositiveLimit('NEXUS_MAX_GEMINI_CALLS_PER_MINUTE', 12, 1000);
const MAX_GEMINI_CALLS_PER_DAY = readPositiveLimit('NEXUS_MAX_GEMINI_CALLS_PER_DAY', 120, 100000);
const consumeGeminiCall = createCallBudget({
  perMinute: MAX_GEMINI_CALLS_PER_MINUTE,
  perDay: MAX_GEMINI_CALLS_PER_DAY
});

function publicError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  error.publicMessage = message;
  return error;
}

function validateRequestSize(message, history) {
  const safeHistory = Array.isArray(history) ? history : [];
  const byteLength = Buffer.byteLength(JSON.stringify({ message, history: safeHistory }), 'utf8');
  if (byteLength > MAX_CLEAN_REQUEST_BYTES) {
    throw publicError('Permintaan terlalu besar. Ringkas instruksi atau hapus sebagian riwayat percakapan.', 413);
  }
}

const EMPLOYEES = {
  sena: {
    name: 'Sena',
    role: 'Team Leader',
    prompt: 'Kamu Sena, Team Leader di NEXUS AI COMPANY. Koordinasikan pekerjaan secara sistematis, jelaskan asumsi, pecah pekerjaan menjadi langkah yang dapat diperiksa, dan jangan mengaku telah melakukan tindakan di luar percakapan.'
  },
  nara: {
    name: 'Nara',
    role: 'Market Researcher',
    prompt: 'Kamu Nara, Market Researcher. Analisis pelanggan, pasar, dan kompetitor. Jangan mengarang hasil riset, angka, tren, atau sumber. Tandai informasi yang belum tersedia dan jelaskan data yang perlu dikumpulkan.'
  },
  juno: {
    name: 'Juno',
    role: 'Creative Director',
    prompt: 'Kamu Juno, Creative Director. Buat konsep kreatif, arah kampanye, pilar konten, dan arahan kerja yang orisinal serta sesuai tujuan bisnis.'
  },
  kata: {
    name: 'Kata',
    role: 'Copywriter',
    prompt: 'Kamu Kata, Copywriter. Tulis headline, deskripsi, naskah, dan caption yang jelas. Jangan membuat klaim produk, testimoni, atau jaminan hasil yang tidak diberikan pengguna.'
  },
  arka: {
    name: 'Arka',
    role: 'Marketing Manager',
    prompt: 'Kamu Arka, Marketing Manager. Susun strategi pemasaran, segmen pelanggan, kanal, eksperimen, dan metrik. Bedakan target usulan dari hasil yang benar-benar terukur.'
  },
  jejak: {
    name: 'Jejak',
    role: 'Business Analyst',
    prompt: 'Kamu Jejak, Business Analyst. Analisis biaya, pendapatan, keuntungan, dan risiko berdasarkan data yang diberikan. Jangan mengarang angka. Tampilkan rumus dan minta input yang belum tersedia.'
  },
  garis: {
    name: 'Garis',
    role: 'Storyboard Artist',
    prompt: 'Kamu Garis, Storyboard Artist. Susun alur video atau cerita menjadi adegan berurutan, lengkap dengan visual, narasi, dan estimasi durasi yang jelas.'
  },
  rupa: {
    name: 'Rupa',
    role: 'Art Director',
    prompt: 'Kamu Rupa, Art Director. Buat arahan identitas visual, palet warna, tipografi, komposisi, dan konsistensi merek. Berikan spesifikasi yang dapat diterapkan.'
  }
};

// Keep the single inline application script while allowing only its exact SHA-256 hash.
// Inline styles are permitted because this MVP uses a large embedded stylesheet and style attributes.
const indexHtmlForCsp = readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
const applicationScriptHash = inlineScriptHash(indexHtmlForCsp);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", applicationScriptHash],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
// A slightly larger parser ceiling allows validation to return a useful JSON
// error; route-level validation below enforces a stricter normalized payload.
app.use(express.json({ limit: '32kb' }));
app.disable('x-powered-by');

// Set this to the exact number of trusted reverse-proxy hops on the host.
// Never use `true` blindly: an incorrect value can let clients spoof their IP.
app.set('trust proxy', TRUST_PROXY_HOPS !== null && TRUST_PROXY_HOPS > 0
  ? TRUST_PROXY_HOPS
  : false);
let proxyHeaderWarningShown = false;
app.use((req, _res, next) => {
  if (!proxyHeaderWarningShown && req.get('x-forwarded-for') && !app.get('trust proxy')) {
    proxyHeaderWarningShown = true;
    console.warn('[NEXUS CONFIG] X-Forwarded-For diterima tetapi proxy tidak dipercaya. Periksa TRUST_PROXY_HOPS agar pembatas laju tidak menganggap semua pengguna berasal dari satu IP.');
  }
  next();
});

// The front end and API are served from one origin. Reject cross-origin writes.
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.get('origin');
    if (!origin && AUTH_REQUIRED) {
      return res.status(403).json({ error: 'Header Origin diperlukan untuk permintaan ini.' });
    }
    if (origin) {
      try {
        // Compare hosts only: behind a TLS-terminating proxy the scheme seen by Node can differ from the browser's.
        if (new URL(origin).host !== req.get('host')) {
          return res.status(403).json({ error: 'Permintaan lintas situs tidak diizinkan.' });
        }
      } catch {
        return res.status(403).json({ error: 'Header origin tidak valid.' });
      }
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  next();
});

function isAuthenticated(req) {
  if (!AUTH_REQUIRED) return true;
  const token = readCookie(req.headers.cookie || '', SESSION_COOKIE);
  return verifySessionToken(token, SESSION_SIGNING_SECRET);
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' }
});
app.post('/api/login', loginLimiter, (req, res) => {
  if (!AUTH_REQUIRED) return res.status(400).json({ error: 'Autentikasi belum diaktifkan pada mode lokal.' });
  const supplied = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!safeStringEqual(supplied, ACCESS_PASSWORD)) {
    return res.status(401).json({ error: 'Kata sandi akses tidak benar.' });
  }
  const token = createSessionToken(SESSION_SIGNING_SECRET, SESSION_TTL_SECONDS);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000
  });
  res.json({ authenticated: true, expiresIn: SESSION_TTL_SECONDS });
});

app.post('/api/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  res.json({ authenticated: false });
});

function requireAuthentication(req, res, next) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Sesi berakhir atau belum masuk. Masuk kembali untuk melanjutkan.' });
  next();
}

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Batas permintaan AI sementara tercapai. Coba lagi sebentar.' }
});
const companyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 2,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Batas delegasi perusahaan tercapai. Tunggu sebentar sebelum meminta delegasi baru.' }
});
app.use(['/api/chat', '/api/company', '/api/revise'], requireAuthentication, apiLimiter);
app.use('/api/company', companyLimiter);

app.get('/api/health', (req, res) => {
  const authenticated = isAuthenticated(req);
  res.json({
    ok: true,
    authRequired: AUTH_REQUIRED,
    authenticated,
    aiConfigured: authenticated ? Boolean(API_KEY) : false,
    statusMessage: !authenticated
      ? 'Masuk untuk memeriksa status layanan AI.'
      : API_KEY
        ? 'Kunci AI tersedia. Koneksi baru terverifikasi setelah permintaan AI berhasil.'
        : 'Kunci API belum dikonfigurasi di server.'
  });
});

async function generateContent({ systemPrompt, prompt, history = [], maxOutputTokens = 2048, json = false, responseSchema = null }) {
  if (!API_KEY) {
    throw publicError('AI belum dikonfigurasi di server. Admin perlu mengatur GEMINI_API_KEY sebagai environment variable.', 503);
  }
  consumeGeminiCall();

  const generationConfig = {
    temperature: 0.45,
    maxOutputTokens,
    ...(MODEL.startsWith('gemini-3') ? { thinkingConfig: { thinkingLevel: 'LOW' } } : {}),
    ...(json ? { responseMimeType: 'application/json' } : {}),
    ...(responseSchema ? { responseSchema } : {})
  };
  const contents = buildGeminiContents(history, prompt);

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig
  };

  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000)
      }
    );
  } catch (cause) {
    throw publicError('Tidak dapat menghubungi layanan AI. Periksa koneksi server lalu coba lagi.', 502);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = String(payload?.error?.message || response.statusText || 'Unknown provider error').slice(0, 500);
    console.warn(`[NEXUS Gemini] HTTP ${response.status}: ${providerMessage}`);
    let message = 'Layanan AI sedang mengalami gangguan. Coba lagi nanti.';
    let status = 502;
    if (response.status === 429) {
      message = 'Kuota atau batas penggunaan AI sedang tercapai. Coba lagi nanti.';
      status = 429;
    } else if (response.status === 401 || response.status === 403) {
      message = 'Kunci API Gemini ditolak atau tidak memiliki izin. Admin perlu memeriksa konfigurasi API key dan akses model.';
    } else if (response.status === 404) {
      message = `Model AI “${MODEL}” tidak ditemukan. Admin perlu memeriksa GEMINI_MODEL.`;
    } else if (response.status >= 400 && response.status < 500) {
      message = 'Permintaan AI ditolak. Periksa model, konfigurasi, dan format instruksi.';
    }
    throw publicError(message, status);
  }

  const candidate = payload?.candidates?.[0];
  const finishReason = String(candidate?.finishReason || '').toUpperCase();
  const text = candidate?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();
  if (finishReason === 'MAX_TOKENS' || finishReason === 'MAX_OUTPUT_TOKENS') {
    if (json || !text) {
      throw publicError('Jawaban AI terpotong karena mencapai batas token. Coba instruksi yang lebih spesifik atau lebih singkat.', 502);
    }
    return `${text}\n\n[Catatan: jawaban terhenti karena batas keluaran model. Minta AI melanjutkan bagian yang belum selesai.]`;
  }
  if (finishReason === 'RECITATION') {
    throw publicError('Jawaban tidak dapat ditampilkan karena terdeteksi kemiripan dengan sumber tertentu. Ubah instruksi lalu coba lagi.', 422);
  }
  if (['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'LANGUAGE'].includes(finishReason)) {
    throw publicError('Permintaan tidak dapat dijawab karena melewati pemeriksaan keamanan atau kebijakan model. Ubah instruksi lalu coba lagi.', 422);
  }
  if (finishReason && !['STOP', 'FINISH_REASON_UNSPECIFIED'].includes(finishReason)) {
    throw publicError(`Generasi AI berhenti dengan status ${finishReason}. Coba ubah atau ringkas instruksi.`, 422);
  }
  if (payload?.promptFeedback?.blockReason) {
    throw publicError('Instruksi tidak dapat diproses karena ditolak oleh pemeriksaan keamanan model. Ubah instruksi lalu coba lagi.', 422);
  }
  if (!text) {
    throw publicError('Layanan AI tidak memberikan jawaban teks. Coba kirim instruksi yang lebih singkat.', 502);
  }
  return text;
}

app.post('/api/chat', async (req, res, next) => {
  try {
    const { employeeId, message, history } = req.body || {};
    if (!isKnownEmployee(EMPLOYEES, employeeId)) return res.status(400).json({ error: 'ID karyawan tidak dikenal.' });
    const employee = EMPLOYEES[employeeId];
    if (typeof message !== 'string' || message.trim().length < 2 || message.length > MAX_MESSAGE_CHARS || Buffer.byteLength(message, 'utf8') > MAX_MESSAGE_BYTES) {
      return res.status(400).json({ error: 'Pesan harus berisi 2–3.000 karakter dan tidak melebihi batas ukuran UTF-8.' });
    }
    validateRequestSize(message.trim(), history);

    const reply = await generateContent({
      systemPrompt: `${employee.prompt}\nJawab dalam Bahasa Indonesia yang mudah dipahami. Jika data tidak cukup, jelaskan batasannya. Jangan mengaku telah mengakses internet, file, akun, atau sistem eksternal kecuali alat tersebut benar-benar tersedia.`,
      prompt: message.trim(),
      history
    });
    res.json({ employeeId, reply, model: MODEL });
  } catch (error) {
    next(error);
  }
});

const plannerSchema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    assignments: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          employeeId: { type: 'STRING', enum: ['nara', 'juno', 'kata', 'arka', 'jejak', 'garis', 'rupa'] },
          taskTitle: { type: 'STRING' },
          taskBrief: { type: 'STRING' }
        },
        required: ['employeeId', 'taskTitle', 'taskBrief']
      }
    }
  },
  required: ['summary', 'assignments']
};

app.post('/api/company', async (req, res, next) => {
  try {
    const { message, history } = req.body || {};
    if (typeof message !== 'string' || message.trim().length < 2 || message.length > MAX_MESSAGE_CHARS || Buffer.byteLength(message, 'utf8') > MAX_MESSAGE_BYTES) {
      return res.status(400).json({ error: 'Instruksi harus berisi 2–3.000 karakter dan tidak melebihi batas ukuran UTF-8.' });
    }
    validateRequestSize(message.trim(), history);

    const roster = Object.entries(EMPLOYEES)
      .filter(([id]) => id !== 'sena')
      .map(([id, employee]) => `${id}: ${employee.name} — ${employee.role}`)
      .join('\n');
    const plannerText = await generateContent({
      systemPrompt: 'Kamu Sena, koordinator NEXUS AI COMPANY. Pilih maksimal tiga spesialis yang benar-benar relevan. Jangan menugaskan semua orang. Buat ringkasan rencana dan satu tugas yang spesifik untuk tiap spesialis. Jika instruksi tidak membutuhkan spesialis, pilih satu yang paling sesuai. Jangan mengarang angka, riset, atau fakta. Keluarkan JSON sesuai skema.',
      prompt: `Daftar spesialis:\n${roster}\n\nInstruksi CEO:\n${message.trim()}`,
      history,
      maxOutputTokens: 3072,
      json: true,
      responseSchema: plannerSchema
    });

    let plan;
    try {
      plan = JSON.parse(plannerText);
    } catch {
      throw publicError('Sena belum menghasilkan rencana yang dapat dibaca. Kirim ulang instruksi dengan lebih jelas.', 502);
    }

    const validAssignments = selectAssignments(plan, EMPLOYEES, message, 3);

    if (!validAssignments.length) {
      return res.json({
        summary: String(plan.summary || 'Sena belum menemukan pekerjaan spesialis yang diperlukan.'),
        assignments: []
      });
    }

    const assignments = await Promise.all(validAssignments.map(async (assignment) => {
      const employee = EMPLOYEES[assignment.employeeId];
      try {
        const reply = await generateContent({
          systemPrompt: `${employee.prompt}\nKamu menerima tugas dari Sena atas instruksi CEO. Berikan hasil yang bisa diperiksa, jelaskan asumsi, dan jangan mengarang fakta atau angka. Gunakan Bahasa Indonesia.`,
          prompt: assignment.taskBrief,
          maxOutputTokens: 2048
        });
        return { ...assignment, success: true, response: reply };
      } catch (error) {
        return { ...assignment, success: false, error: error.publicMessage || 'Karyawan AI mengalami kesalahan. Coba ulang tugas ini.' };
      }
    }));

    const summary = String(plan.summary || 'Sena telah membagi instruksi kepada spesialis terkait.');
    // Final synthesis by Sena. A failure here must not discard the specialist results.
    let synthesis = null;
    let synthesisError = null;
    if (assignments.some((item) => item.success)) {
      try {
        synthesis = await generateContent({
          systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
          prompt: buildSynthesisPrompt({ message: message.trim(), summary, assignments, employees: EMPLOYEES }),
          maxOutputTokens: 2048
        });
      } catch (error) {
        synthesisError = error.publicMessage || 'Sena belum dapat menyusun sintesis akhir.';
      }
    }

    res.json({ summary, assignments, synthesis, synthesisError, model: MODEL });
  } catch (error) {
    next(error);
  }
});

app.post('/api/revise', async (req, res, next) => {
  try {
    const checked = validateRevisionInput(req.body, EMPLOYEES);
    if (checked.error) return res.status(checked.error.status).json({ error: checked.error.message });
    const { employeeId } = checked.value;
    const employee = EMPLOYEES[employeeId];
    const reply = await generateContent({
      systemPrompt: `${employee.prompt}\nKamu sedang merevisi hasil kerjamu sendiri berdasarkan catatan CEO. Patuhi catatan tersebut, jelaskan asumsi, dan jangan mengarang fakta atau angka. Gunakan Bahasa Indonesia.`,
      prompt: buildRevisionPrompt(checked.value),
      maxOutputTokens: 3072
    });
    res.json({ employeeId, reply, model: MODEL });
  } catch (error) {
    next(error);
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
}));

app.use((error, _req, res, _next) => {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error('[NEXUS API]', error.message);
  const safeMessage = status === 413
    ? 'Permintaan terlalu besar. Kurangi panjang pesan atau riwayat percakapan.'
    : error instanceof SyntaxError && status === 400
      ? 'Format permintaan tidak valid. Kirim ulang dalam format JSON yang benar.'
      : error.publicMessage || (status < 500 ? error.message : 'Terjadi kesalahan pada server. Coba lagi nanti.');
  res.status(status).json({ error: safeMessage });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`NEXUS AI COMPANY berjalan di http://${HOST}:${PORT}`);
  console.log(`AI provider: ${API_KEY ? `${MODEL} (key configured; connectivity not yet verified)` : 'not configured'}`);
  console.log(`Trusted proxy hops: ${app.get('trust proxy') || 0}`);
  if (TRUST_PROXY_HOPS === null) console.warn('[NEXUS CONFIG] TRUST_PROXY_HOPS tidak valid; proxy trust dinonaktifkan. Periksa nilai environment variable.');
  if (process.env.NODE_ENV === 'production' && !TRUST_PROXY_HOPS) console.warn('[NEXUS CONFIG] TRUST_PROXY_HOPS=0. Pastikan server benar-benar menerima koneksi langsung; di balik reverse proxy, atur jumlah hop yang tepat.');
  if (!AUTH_REQUIRED) console.warn('[NEXUS SECURITY] Autentikasi nonaktif. Mode ini hanya untuk pengembangan lokal; jangan buka server ke internet.');
});

// Render keeps connections to the app open; stay above the proxy's idle timeout.
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;

// Render sends SIGTERM on deploys/restarts: stop accepting requests and exit cleanly.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    console.log(`[NEXUS] ${signal} diterima, server dihentikan.`);
    server.close(() => process.exit(0));
    server.closeIdleConnections?.();
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
