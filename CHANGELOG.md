# Changelog

## 1.5.0 — Personal Notes & Idea Inbox

- Add a personal notes and ideas workspace with six categories.
- Add local note creation, pinned sorting, deletion confirmation, input limits, and note normalization.
- Include notes in local JSON and encrypted backups through the shared state model.
- Keep note operations offline with no API, payment, hosting, cloud resources, or AI calls.


## 1.4.0 — Offline Website Studio

- Add project-specific website content editing for brand, hero, CTA, accent color, feature cards, about, and contact sections.
- Add live preview in a sandboxed iframe without JavaScript or external assets.
- Persist editor content with each local project and export a standalone static HTML file.
- Keep all editing and preview operations in the browser; no AI/API, payment, hosting, or cloud services are introduced.

## 1.3.0 — Forced-offline personal workspace

- Force the frontend into offline-only mode for every protocol, not just `file://`.
- Skip backend health checks and login checks; keep chat and team templates local.
- Block browser API paths before `fetch`, including when the page is opened through localhost.
- Update smoke tests to prove the HTTP-origin app makes no backend/API request.
- Clarify the single-owner and zero-API/no-credit operating model in the guides.

## 1.2.0 — Personal website project workspace

- Added personal website project spaces with six project types and editable project details/status.
- Generate an offline project checklist assigned across research, planning, design, writing, web development, and QA roles.
- Link tasks to projects and filter/search tasks by project.
- Generate and download a standalone responsive HTML website starter locally.
- Enable offline role templates for project coordination without pretending they are model-generated AI.
- Keep all features local: no API, Gemini call, hosting, payment, or cloud credit.

## 1.1.0 — NEXUS PERSONAL

- Rebrand aplikasi menjadi NEXUS PERSONAL untuk satu pemilik/pengguna.
- Tambahkan launcher Windows satu klik untuk membuka HTML lokal tanpa Node.js atau instalasi software tambahan.
- Tambahkan panduan penggunaan pribadi untuk Windows dan Android.
- Pertahankan mode offline: tidak ada API key, layanan AI eksternal, hosting, atau kredit cloud.
- Perjelas batas privasi: tanpa login/PIN dan data aktif localStorage belum dienkripsi.

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
