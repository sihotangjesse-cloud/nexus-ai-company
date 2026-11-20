# Changelog

## 1.0.0 — Fondasi rilis offline-first

- Menyelaraskan versi sumber pada `package.json`, `package-lock.json`, label UI, dan metadata backup.
- Menulis ulang README agar langkah demo offline, batas penggunaan AI, penyimpanan lokal, backup, dan status backend dijelaskan secara konsisten.
- Memperbarui panduan demo offline dan menambahkan catatan keamanan operasional.
- Menambahkan tes metadata rilis untuk mendeteksi perbedaan versi aplikasi dan dokumentasi.
- Tidak mengaktifkan layanan AI, API key, deployment, hosting, pembayaran, atau resource cloud.
- Status rilis: fondasi demo lokal/offline. Ini bukan pernyataan bahwa backend siap produksi publik atau multi-pengguna.

## 0.9.0 — Password-encrypted local backups

- Added password-protected backup export and restore using AES-256-GCM and PBKDF2-SHA-256.
- Preserved plain JSON backup compatibility and documented that active browser storage remains unencrypted.
- Added tests for round-trip, random salt/IV, wrong passwords, tampering, metadata validation, and size limits.

## 0.8.0 — Local CSV exports

- Added browser-local operational report and task-detail CSV exports.
- Added CSV formula-injection protection and tests.

## 0.7.0 — Dashboard and operational reports

- Added task metrics, status breakdowns, employee assignment summaries, and daily/weekly operational reports.

## 0.6.0 — Local task search and filters

- Added local task search, combined filters, sorting, and reset controls.

## 0.5.0 — Local task detail editing

- Added validation and audit history for task title, owner, priority, and due-date edits.

## 0.4.0 — Local JSON backup and restore

- Added browser-local JSON backup and restore with schema checks and size limits.

## 0.3.6 — Offline demo

- Added an offline browser mode with AI controls disabled and API requests blocked.

## 0.3.5 and earlier

- Backend API, authentication hardening, task workflow, UI improvements, and integration tests. See the commit history for detailed changes.
