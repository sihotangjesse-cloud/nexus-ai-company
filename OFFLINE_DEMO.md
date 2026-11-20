# NEXUS AI COMPANY — Offline Demo (Zero-Credit)

This is a local browser preview only. It does not deploy a server and does not use Render, Railway, Gemini, an API key, cloud credits, or a payment method.

## Open the demo

1. Download the repository ZIP from the `main` branch to get the latest offline demo.
2. Extract the ZIP on your computer.
3. Open the `public` folder.
4. Double-click `index.html` to open it in a modern browser (Chrome or Edge).
5. The header should show **MODE DEMO OFFLINE**.

You can also open `public/index.html` from a local file manager on a supported device.

## What works

- Dashboard navigation and an example employee directory
- Manual task assignment, task status/progress management, editing of title/owner/priority/due date, and deletion
- Calendar and agenda entries
- Local reports and export/copy
- Browser-local persistence via `localStorage`
- Manual JSON backup and restore in Pengaturan (no cloud upload)
- Password-protected backup export and restore using browser encryption (Web Crypto)

## What is deliberately disabled

- Chat with AI employees
- Company delegation by Sena
- AI task revisions
- Login and backend health checks

The demo blocks API calls before any network request is made. Do not add an API key or password to this static file.

## Data and privacy

- Data is stored only in the current browser profile on the current device.
- It does not sync automatically to another device or cloud service.
- Use Pengaturan → Unduh Backup JSON to save a local copy. Use Pulihkan dari file backup to restore it; this replaces current data after confirmation.
- Plain JSON backup files are not encrypted. The encrypted-backup option protects exported backup files with a password. Active browser storage is still unencrypted; keep the device and browser profile private.
- Clearing browser data or using a different browser/profile may make the demo data unavailable unless you have saved a backup.
- Do not enter sensitive personal, financial, or password information.

## Important limitation

This demo is not NEXUS production hosting. Real AI features require a backend server and Gemini access. Those have intentionally not been activated because the owner prohibited use of payments, paid plans, and cloud credits.


## Edit task details (v0.5.0)

1. Open **Tugas**.
2. Expand **Ubah detail tugas** under the task you want to change.
3. Update the title, assigned employee, priority, or due date, then select **Simpan perubahan**.
4. Existing AI output is kept. When the task title or owner changes, the result returns to **Dalam pemeriksaan** so it is reviewed again.

These edits are stored only in the current browser profile.


## Search and filter tasks (v0.6.0)

1. Open **Tugas**.
2. Enter one or more words in **Cari tugas**. The search checks the task title, employee name, status, priority, and due date.
3. Combine the **Status**, **Penanggung jawab**, and **Prioritas** filters to narrow the list.
4. Use **Urutkan** to show newest tasks, nearest due dates, or highest priorities first.
5. Select **Reset filter** to clear every filter.

These operations run locally in the current browser. They do not send task information to a server or AI service.


## Productivity dashboard and operational reports (v0.7.0)

- **Dashboard:** total tasks, completed count and rate, overdue tasks, upcoming seven-day deadlines, status distribution, progress, and task assignments by employee.
- **Laporan:** choose the daily (24-hour activity window) or weekly (seven-day activity window) view. The report combines a current task snapshot with recent activity.
- **Tenggat:** overdue and upcoming tasks are highlighted to help prioritize work.
- **Simpan laporan** stores the report in the current browser. **Salin teks (ekspor)** copies it for use elsewhere.

All calculations use the browser's local task and activity data. Completion rates measure the share of assigned tasks marked complete; they do not measure output quality or actual business revenue/profit.


## Export operational reports to CSV (v0.8.0)

1. Open **Laporan**.
2. Choose **Harian** (activity from the last 24 hours) or **Mingguan** (activity from the last seven days).
3. Select **Unduh laporan CSV** to export the metrics, status distribution, employee summaries, deadlines, and recent local activity.
4. Select **Unduh detail tugas CSV** to export one row per task with its title, owner, priority, status, deadline, progress, and review flag.
5. Open the downloaded CSV file in a spreadsheet program.

Both exports are generated in the browser. The task-detail CSV does not include AI output or chat history. CSV export does not upload data or call an external API.


## Encrypted backup (v0.9.0)

1. Open **Pengaturan** and find **Backup & Pemulihan Data**.
2. Under **Backup terenkripsi**, enter a strong password of at least 12 characters twice.
3. Select **Unduh backup terenkripsi** and keep the downloaded JSON file.
4. To restore it, choose the file under **Pulihkan backup terenkripsi**, enter the same password, and submit.
5. Confirm the restore. The current browser data is replaced by the backup contents.

The file uses AES-256-GCM encryption with a key derived from the password using PBKDF2-SHA-256. Each backup receives a fresh random salt and IV. The password is never saved by the app. If you forget it, the file cannot be decrypted.

The regular **Unduh Backup JSON biasa** option remains unencrypted. This encryption only protects exported backup files; it does not encrypt live data held in browser storage.
