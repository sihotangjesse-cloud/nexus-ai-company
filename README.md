# NEXUS AI COMPANY

**Versi sumber: 1.0.0 — fondasi rilis offline-first**

NEXUS AI COMPANY adalah ruang kerja perusahaan virtual dengan delapan peran AI: Sena (koordinator), Nara (riset pasar), Juno (direktur kreatif), Kata (copywriter), Arka (manajer pemasaran), Jejak (analis bisnis), Garis (storyboard artist), dan Rupa (art director).

## Status rilis

Versi 1.0.0 merapikan fondasi aplikasi dan dokumentasi. **Demo offline dapat dijalankan secara lokal. Fitur AI online belum dikonfigurasi atau diaktifkan pada demo offline.** Rilis ini bukan layanan website yang sudah di-hosting dan bukan klaim bahwa aplikasi siap dipakai sebagai layanan multi-pengguna di internet.

## Mulai tanpa layanan berbayar

Mode demo offline tidak memerlukan Node.js, instalasi dependensi, API key, server, hosting, akun pembayaran, kartu, atau kredit cloud.

1. Buka [ZIP branch main](https://github.com/sihotangjesse-cloud/nexus-ai-company/archive/refs/heads/main.zip).
2. Ekstrak ZIP di komputer.
3. Buka folder `public`.
4. Buka `index.html` memakai browser modern seperti Chrome atau Edge.
5. Pastikan indikator aplikasi menampilkan **MODE DEMO OFFLINE**.

Dalam mode ini, aplikasi memblokir permintaan API sebelum jaringan dipanggil. Chat AI, delegasi Sena, revisi AI, login backend, dan pemeriksaan kesehatan backend dinonaktifkan. Fitur dashboard, tugas, kalender, laporan, ekspor, dan backup berjalan di browser.

Panduan lengkap tersedia di [OFFLINE_DEMO.md](OFFLINE_DEMO.md).

## Fitur yang tersedia secara lokal

- Dashboard metrik tugas, kemajuan, status, tenggat, dan ringkasan penanggung jawab.
- Direktori delapan peran karyawan virtual.
- Membuat, mengubah, mencari, menyaring, mengurutkan, dan mengelola tugas.
- Kalender dan agenda.
- Laporan harian dan mingguan.
- Ekspor laporan dan detail tugas ke CSV dengan perlindungan terhadap formula CSV berbahaya.
- Backup JSON biasa dan backup terenkripsi dengan kata sandi.
- Pemulihan backup setelah konfirmasi.

Data demo disimpan pada `localStorage` profil browser yang sedang digunakan. Data tidak tersinkron otomatis antarperangkat.

## Backup dan privasi data

- Backup JSON biasa **tidak dienkripsi**.
- Backup terenkripsi memakai AES-256-GCM dan derivasi kunci PBKDF2-SHA-256. Kata sandi tidak disimpan oleh aplikasi. Kata sandi yang terlupa tidak dapat dipulihkan oleh aplikasi.
- Enkripsi backup hanya melindungi file backup. Data aktif di `localStorage` **tetap tidak dienkripsi**.
- Menghapus data browser atau memakai profil browser lain dapat menghilangkan data lokal. Simpan backup di tempat privat.
- Jangan masukkan kata sandi akun lain, data keuangan, atau informasi pribadi sensitif ke dalam demo.

## Backend AI opsional — bukan bagian dari demo nol-kredit

Repositori juga menyimpan server Node.js dan endpoint Gemini untuk eksperimen backend. Fitur ini **tidak diperlukan** untuk demo offline. Tidak ada API key yang disediakan atau dipasang oleh proyek ini.

Mengisi `GEMINI_API_KEY` dan mengirim permintaan ke Gemini dapat menggunakan kuota provider dan berpotensi menimbulkan biaya sesuai pengaturan akun provider. Agar tetap dalam mode tanpa biaya, biarkan API key kosong dan jangan mengaktifkan endpoint AI. Jangan menambahkan API key ke file frontend atau commit ke GitHub.

Persyaratan backend bila suatu saat diuji secara mandiri:

- Node.js 20 atau lebih baru.
- Salin `.env.example` menjadi `.env` hanya untuk konfigurasi lokal.
- `npm ci --no-audit --no-fund` untuk memasang dependensi dari lockfile.
- `npm run check` dan `npm test` untuk pemeriksaan.
- `npm start` untuk menjalankan server secara lokal.

Tes integrasi backend mengganti Gemini dengan mock lokal; tes tidak memerlukan panggilan ke layanan Gemini yang sebenarnya. Jangan mengartikan tes yang lulus sebagai verifikasi API key, kuota provider, atau layanan AI langsung.

## Batas keamanan dan operasional

- Autentikasi backend yang tersedia adalah satu kata sandi bersama untuk satu pemilik, bukan akun multi-pengguna.
- Cookie sesi memakai atribut HttpOnly dan SameSite=Strict; sesi berakhir setelah 12 jam.
- Batas login, permintaan AI, dan panggilan Gemini berlaku per proses. Batas ini bukan kuota biaya global, tidak dibagi lintas beberapa instance, dan kembali dari awal setelah server dimulai ulang.
- Data tugas dan riwayat aplikasi masih berada di browser; belum ada database bersama atau sinkronisasi.
- Jangan membuka mode pengembangan tanpa autentikasi ke internet.
- Jangan menganggap aplikasi siap produksi publik. Penggunaan publik memerlukan audit tambahan, pengelolaan secret, penyimpanan persisten, kontrol akses per pengguna, pembatasan global, pemantauan, backup operasional, HTTPS, dan pengendalian biaya provider.

## Pemeriksaan proyek

Workflow GitHub Actions menjalankan Node.js 22, instalasi dari `package-lock.json`, pemeriksaan sintaks/frontend, dan seluruh tes otomatis ketika ada pull request atau push ke branch utama. Pengujian tidak melakukan panggilan Gemini langsung.

Perintah lokal:

```bash
npm ci --no-audit --no-fund
npm run check
npm test
```

## Endpoint backend (referensi)

| Metode | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/api/health` | Status server dan sesi; tidak membuktikan koneksi model AI |
| POST | `/api/login` | Login single-owner bila autentikasi aktif |
| POST | `/api/logout` | Menghapus cookie sesi |
| POST | `/api/chat` | Meminta jawaban dari satu peran AI |
| POST | `/api/company` | Meminta Sena membagi tugas ke spesialis |
| POST | `/api/revise` | Meminta spesialis merevisi hasil kerja |

Endpoint AI hanya relevan ketika backend dan kredensial provider dikonfigurasi secara terpisah. Demo offline tidak menggunakannya.

## Berkas penting

- `public/index.html` — aplikasi browser satu berkas.
- `server.js` — server Express dan endpoint backend opsional.
- `auth.js` — token sesi dan pemeriksaan kata sandi.
- `usage-budget.js` — batas panggilan AI per proses.
- `history.js` — pembentukan dan pembatasan konteks percakapan.
- `workflow.js` — validasi dan perencanaan tugas.
- `tests/` — tes unit, UI, dan integrasi dengan mock.
- `OFFLINE_DEMO.md` — panduan menjalankan demo tanpa backend.
- `CHANGELOG.md` — riwayat perubahan.

