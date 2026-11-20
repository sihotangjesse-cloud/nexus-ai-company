# Security Notes

## Supported safe mode

The supported no-provider mode is the static offline demo opened from `public/index.html`. It disables AI chat, company delegation, AI revisions, login, and backend health checks. API calls are blocked before a network request is made.

Do not add API credentials to the HTML file. Keep real secrets out of Git, issue reports, screenshots, and chat messages.

## Local browser data

NEXUS stores active demo data in browser `localStorage`. That data is not encrypted by the app and may be readable by someone with access to the same browser profile or device.

Encrypted backup export protects the exported file with AES-256-GCM and a password-derived key. It does not encrypt active browser storage. Plain JSON exports are unencrypted. The application cannot recover a forgotten backup password.

## Optional backend

The backend is not required for the offline demo. It supports a single shared owner password, not individual user accounts. Production mode fails to start when the required access password and signing secret are missing. Configure HTTPS and the exact trusted proxy hop count before any private backend use.

Rate limits and Gemini call budgets are held in process memory. They reset after a process restart and are not global billing controls. Do not rely on them to enforce a financial spending limit.

The project is not approved as a public multi-user production service. Before exposing a backend publicly, add and independently review durable storage, per-user authorization, persistent/global rate limits, secure secret handling, robust backup/restore operations, monitoring, and provider-side spending controls.

## Reporting a vulnerability

Do not publish passwords, API keys, session secrets, personal data, or exploit details in a public issue. Use GitHub's private vulnerability reporting feature for this repository when it is available. Otherwise, report only that a security issue exists and request a private channel without including the sensitive details.
