# Deployment ke Render (v0.3.5)

Status: **belum ada deployment yang diverifikasi.** Dokumen ini hanya langkah persiapan.

## Urutan
1. Push source ke branch `release/v0.3.5`; jangan upload `.env`, `node_modules`, atau secret.
2. Workflow **Generate package-lock.json** otomatis berjalan pada branch rilis dan meng-commit `package-lock.json`.
3. Setelah lockfile muncul, buat Pull Request `release/v0.3.5` → `main` dan tunggu workflow **CI** hijau (`npm ci`, `npm run check`, `npm test`, termasuk tes integrasi backend).
4. Review diff lalu merge PR ke `main`. Deployment Render diarahkan ke `main`, bukan branch percobaan.
5. Di Render, periksa dulu apakah sudah ada service NEXUS. Jika belum, buat satu Web Service dari repo ini (atau gunakan Blueprint `render.yaml`); jika sudah ada, gunakan service yang ada dan jangan membuat duplikat.
6. Isi secret di Render Dashboard (jangan di GitHub atau source code):
   - `GEMINI_API_KEY`
   - `NEXUS_ACCESS_PASSWORD` (minimal 12 karakter)
   - `NEXUS_SESSION_SECRET` dibuat otomatis oleh Blueprint (minimal 32 karakter diperlukan).
7. Setelah deploy: buka `https://<nama-service>.onrender.com/api/health`, login, lalu coba chat satu karyawan dan Company Chat.

## Variabel lingkungan (dari `.env.example` dan `server.js`)
`GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT` (diisi Render), `NODE_ENV`, `TRUST_PROXY_HOPS`, `NEXUS_ACCESS_PASSWORD`, `NEXUS_SESSION_SECRET`, `NEXUS_MAX_GEMINI_CALLS_PER_MINUTE`, `NEXUS_MAX_GEMINI_CALLS_PER_DAY`.

## Catatan
- Plan Free Render dapat memiliki batasan dan dapat tidur saat tidak dipakai; verifikasi kondisi paket terbaru di dashboard sebelum menyetujui.
- Belum ada deployment yang diverifikasi sampai CI hijau, secrets siap, dan service berstatus Live.
- `TRUST_PROXY_HOPS=1` adalah dugaan yang harus diverifikasi: jika login/chat mengembalikan 403 "Permintaan lintas situs tidak diizinkan", periksa nilai ini.
- `GEMINI_MODEL` default (`gemini-3.8-flash`) belum diuji; jika chat mengembalikan "Model AI ... tidak ditemukan", atur `GEMINI_MODEL` ke model yang tersedia untuk key Anda.
- Data pengguna tetap di `localStorage` browser (tidak sinkron antarperangkat).
