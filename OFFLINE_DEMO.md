# NEXUS AI COMPANY — Offline Demo (Zero-Credit)

This is a local browser preview only. It does not deploy a server and does not use Render, Railway, Gemini, an API key, cloud credits, or a payment method.

## Open the demo

1. Download the repository ZIP from the branch `offline-demo/v0.3.6`.
2. Extract the ZIP on your computer.
3. Open the `public` folder.
4. Double-click `index.html` to open it in a modern browser (Chrome or Edge).
5. The header should show **MODE DEMO OFFLINE**.

You can also open `public/index.html` from a local file manager on a supported device.

## What works

- Dashboard navigation and an example employee directory
- Manual task assignment, task status/progress management, editing, and deletion
- Calendar and agenda entries
- Local reports and export/copy
- Browser-local persistence via `localStorage`
- Manual JSON backup and restore in Pengaturan (no cloud upload)

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
- Backup JSON files are not encrypted. Keep them private and avoid including sensitive information.
- Clearing browser data or using a different browser/profile may make the demo data unavailable unless you have saved a backup.
- Do not enter sensitive personal, financial, or password information.

## Important limitation

This demo is not NEXUS production hosting. Real AI features require a backend server and Gemini access. Those have intentionally not been activated because the owner prohibited use of payments, paid plans, and cloud credits.
