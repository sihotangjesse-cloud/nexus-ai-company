# Changelog

## 1.9.0 — Local AI Agent Tool Loop

- Add a constrained tool-calling loop powered by the user-selected local GGUF model.
- Allow workspace listing/reading, public GitHub listing/reading, and syntax-only checks.
- Allow the model to draft local file changes as reviewable proposals; require explicit owner confirmation before saving.
- Limit each instruction to three tool steps and reject malformed or unknown model actions.
- Treat repository and workspace contents as untrusted data; do not expose secrets, delete files, write to GitHub, or execute project programs.
- Keep general web search, private GitHub repositories, remote commits/push, shell execution, deployment, payments, and credits out of this release.

## 1.8.0 — Read-only Public GitHub Explorer

- Add a browser-based explorer for public GitHub repositories and text files.
- Use unauthenticated HTTPS GET requests only; no personal access token, login, repository write, commit, or push.
- Validate owner/repository, branch, and relative paths; display text files up to 512 KB and provide clipboard copy.
- Show the remaining public REST request allowance and explain the 60-request-per-hour unauthenticated limit.
- Keep local workspace data and AI chat out of GitHub requests; add tests for read-only boundaries.
- Keep internet-wide search, private repository access, AI tool-calling, arbitrary code execution, deployment, payments, and credits out of this release.

## 1.7.0 — Approval-first Local Project Workspace

- Add a loopback-only local workspace bridge for Android/Termux and Windows/Python.
- Add bounded text-file browsing and reading inside a dedicated workspace folder.
- Require a proposed change, before/after preview, and explicit approval before creating or replacing a file.
- Reject traversal, symlinks, hidden/sensitive paths, unsupported file types, and oversized content.
- Add syntax-only Python, JavaScript, and JSON checks; project code is never executed.
- Add Android and Windows launchers plus automated API security tests.
- Keep GitHub access, internet research, autonomous tool-calling, arbitrary code execution, deployment, payments, credits, and subscriptions out of this release.

## 1.6.0 — Browser-local Generative Assistant

- Add an optional generative assistant powered by a user-selected local GGUF model in the browser through WebAssembly.
- Run model inference on-device with CPU-only, single-thread settings and a short context/output budget for modest hardware.
- Keep prompts and chat history in the browser; no hosted AI inference, AI API key, payment, credit, subscription, or cloud resource is introduced.
- Load the pinned WebAssembly engine assets from jsDelivr only after the user selects and loads a model; first-time setup requires internet access and a manually downloaded model file.
- Add Android localhost static-file launcher instructions, model/runtime limitations, memory release control, and automated checks.

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
