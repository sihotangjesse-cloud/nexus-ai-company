# NEXUS AI COMPANY

Virtual company workspace with eight role-based AI employees:

- **Sena** — Team Leader and task coordinator
- **Nara** — Market Researcher
- **Juno** — Creative Director
- **Kata** — Copywriter
- **Arka** — Marketing Manager
- **Jejak** — Business Analyst
- **Garis** — Storyboard Artist
- **Rupa** — Art Director

## Project status

This is an early backend-enabled MVP built from the original single-file HTML prototype. Current source package version: 0.7.0. The local task manager supports searching, filtering by status/owner/priority, sorting, and editing task title, owner, priority, and due date; material edits return existing AI output to CEO review. The dashboard and operational reports summarize task status, progress, employee assignments, overdue tasks, upcoming deadlines, and recent local activity. The offline UI also supports manual JSON backup and restore on the current device. The dashboard, task manager, calendar, reports, and browser-local data remain in `public/index.html`. Version 0.2.1 adds safer error messages, UTF-8-aware history budgeting, retained specialist context, and improved AI connection status. Version 0.3.0 applies UI/UX Stage 1: refreshed visual design, icon-based desktop/mobile navigation, and an adaptive AI status pill. Backend architecture and browser-local data format are unchanged. The Gemini history sanitizer and deterministic unit tests are in `history.js` and `tests/`. The new Node.js server provides:

- `GET /api/health` — checks server availability and session state. AI-key configuration is only shown after authentication. It does **not** prove that the key or model works; a successful chat is required to verify connectivity.
- `POST /api/chat` — chats with one specialist using that employee's role prompt.
- `POST /api/company` — asks Sena to select up to three specialists, creates their tasks, and collects their separate AI responses.

**Important:** this is an early MVP, not a finished production service. Current tasks, chat history, calendar events, and reports are stored in the user's browser through `localStorage`; they are not yet shared across devices or backed by a database. Version 0.3.2 adds optional single-owner password access using an HttpOnly signed session cookie. Production mode refuses to start unless access credentials are configured. Local development remains open by default; never expose that mode publicly.

## Requirements

- Node.js 20 or newer
- A Gemini Developer API key for live AI responses

The original laptop does not need to run a local AI model. The server can be deployed to a cloud Node.js host.

## Run locally

```bash
npm install
cp .env.example .env
```

Add the AI key to `.env` on your own machine or configure it as a secret environment variable on your hosting provider. Never paste a real API key into chat or commit it to GitHub.

For production, set `NODE_ENV=production`, `NEXUS_ACCESS_PASSWORD` (12+ characters), and `NEXUS_SESSION_SECRET` (32+ random characters) in the hosting provider's secret settings. Generate a session secret locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`; never commit it. Configure `TRUST_PROXY_HOPS` to the exact proxy count provided by the host.

Then run:

```bash
npm run check
npm test
npm start
```

Open `http://localhost:3000`. Development mode binds only to `127.0.0.1`; production mode binds to `0.0.0.0` and requires access credentials.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server-side AI credential; keep secret | Not set |
| `GEMINI_MODEL` | Gemini model ID | `gemini-3.8-flash` |
| `PORT` | HTTP port | `3000` |
| `TRUST_PROXY_HOPS` | Exact number of reverse proxies before the Node server | `0` |
| `NODE_ENV` | Runtime mode | `development` |
| `NEXUS_ACCESS_PASSWORD` | Single-owner password gate; minimum 12 characters | Not set locally; required in production |
| `NEXUS_SESSION_SECRET` | HMAC session signing secret; minimum 32 characters | Not set locally; required in production |
| `NEXUS_MAX_GEMINI_CALLS_PER_MINUTE` | Per-process Gemini call cap | `12` |
| `NEXUS_MAX_GEMINI_CALLS_PER_DAY` | Per-process daily Gemini call cap | `120` |

The AI key is read only by `server.js`. It is not sent to the browser, and the browser has no code to read it.

## API examples

Health check:

```http
GET /api/health
```

Specialist chat:

```json
{
  "employeeId": "nara",
  "message": "Bantu susun kerangka riset pasar untuk produk digital pemula.",
  "history": []
}
```

Company orchestration:

```json
{
  "message": "Buat konsep kampanye edukasi untuk produk digital.",
  "history": []
}
```

## Safety and operational notes

- The AI endpoints require an authenticated signed HttpOnly cookie when access control is enabled, and production mode requires access control configuration. Login attempts are rate-limited. Chat requests are limited to 8 per minute per IP; company orchestration is additionally limited to 2 requests per minute per IP. Gemini calls are also capped at 12 per minute and 120 per UTC day per server process by default. These in-memory caps reset after a process restart and are not a billing-grade or multi-instance global quota. For the default Gemini 3 model family, requests use `thinkingLevel: LOW` and a higher output ceiling; the output limit still applies to thinking plus response tokens, so very long output may be marked as partial.
- The AI endpoints apply bounded request-body checks. The JSON parser permits up to 32 KB so route validation can return a JSON error; normalized request payloads are then limited to 24 KB and each prompt is limited by both character count and UTF-8 byte size. Health checks are not counted against the AI request quota.
- Chat context is bounded in both the browser and server to reduce oversized requests. The server measures history limits in UTF-8 bytes, prioritizes the newest retained turns, removes orphan assistant turns, and merges adjacent same-role turns. Employee chat context includes assignment notes from Sena. Company chat history can include specialist outputs but remains bounded.
- Failed specialist calls are marked as failed and do not create review tasks.
- The UI disables the chat form while a request is running and reports a timeout if the request takes too long.
- The health endpoint only confirms that a key is present; it does not call Gemini or prove the key/model works. The UI marks connectivity as verified only after an actual AI request succeeds.
- `TRUST_PROXY_HOPS` must match the exact reverse-proxy hop count of the hosting platform. Leave it at `0` for direct connections; do not set Express `trust proxy` to `true` blindly.
- The API key is stored as a server environment variable, never in frontend source.
- The app intentionally does not enable cross-origin API access. The frontend inline script is covered by a SHA-256 Content Security Policy hash; inline styles remain allowed for the existing embedded design system.
- AI output must be reviewed. Market and financial claims are not verified automatically.
- Authentication is a single shared owner password, not multi-user accounts. Sessions expire after 12 hours; changing either access password or signing secret invalidates old sessions. Use a long unique password, a random signing secret, HTTPS, and the correct proxy-hop setting. Add durable database storage, backups, distributed rate limiting, and provider-side spending alerts before production use. The application is not intended as a public multi-user service.

## Version 0.3.3 audit follow-up

- Every edited form field now survives a background re-render; successful submits clear their form. See `tests/form-drafts.test.js`.
- Added backend integration tests (`tests/server-integration.test.js`, helpers in `tests/helpers/`) that run the real server against a mocked Gemini API. They need `npm install` first; without dependencies they are skipped and `npm test` reports one visibly skipped test.
- `package-lock.json` is not included in this package because it could not be generated without registry access. Run `npm install`, commit the generated `package-lock.json`, and use `npm ci` for reproducible installs.

## Version 0.3.2 audit fixes

- Added single-owner password access with an HttpOnly, SameSite=Strict signed cookie; production mode fails closed when access secrets are missing.
- Added a separate company-orchestration rate limit and per-process Gemini call caps. These caps are explicitly not durable/global billing limits.
- Removed model/provider details from the unauthenticated health response.
- Added CEO approve/revision status actions for saved specialist results; revision marking does not automatically call the AI again.
- Removed invented three-day deadlines from delegated tasks; CEO can set a real due date.
- Preserved the focused form value across background re-renders, sanitized saved task/event IDs for attribute use, and fixed the 90–99% progress mapping.
- The employee profile now shows a role summary rather than suggesting that a frontend copy is the active server prompt.

## Version 0.3.1 reliability updates

- The localStorage root key and existing fields are retained; loading now normalizes incomplete or malformed nested fields.
- Delegated specialist output is also stored on its task entry so the CEO can review it on the Tasks page.
- Task status and progress remain consistent when updated.
- Virtual-office indicators distinguish actively running tasks from queued tasks and tasks awaiting CEO review.

## Validation for v0.3.3

Exact results and their scope, including which tests were skipped in the packaging environment, are in [TEST_REPORT.md](TEST_REPORT.md). Backend integration tests run only after `npm install`. Live Gemini requests still require a valid server-side `GEMINI_API_KEY`.


## v0.3.5 API additions
- `POST /api/company` now also returns `synthesis` (Sena's final summary for the CEO) or `synthesisError`.
- `POST /api/revise` — body: `employeeId`, `taskTitle`, `taskBrief`, `previousResult`, `note`; returns `{ employeeId, reply, model }`.


## v0.3.6 — Offline local demo (zero-credit mode)

The static UI can be opened directly from `public/index.html` in a browser. Opening the file with the `file:` protocol automatically enables the offline demo mode.

- Dashboard, employee directory, task management, calendar, reports, and browser-local storage can be explored.
- AI chat, company delegation, and AI revisions are disabled in this mode.
- The demo makes no backend, Gemini, or other API requests.
- Data stays in that browser profile's local storage on that device. It is not synced, backed up, or shared.
- This is a local preview, not a public website or a production AI service.

See [OFFLINE_DEMO.md](OFFLINE_DEMO.md) for the walkthrough and its limitations.


## v0.4.0 — Local JSON backup and restore

- Export browser-local NEXUS data (tasks, chat history, calendar entries, reports, CEO profile, and activity log) to a JSON file.
- Restore a previously exported file after an explicit confirmation; restoring replaces the current browser data.
- Validate the backup envelope and version before importing, normalize all imported records, and reject files larger than 2 MB.
- Backup and restore run in the browser only. No API, backend, cloud storage, account credit, or payment method is used.
- Backup files are not encrypted. Store them privately and do not share them if they contain sensitive notes.


## v0.5.0 — Task detail editing

- Edit a saved task's title, assigned employee, priority, and due date from the Tasks page.
- Validate title length, employee ID, priority, and real calendar date before changing data.
- Preserve task results and history. When the title or assignee changes on a task with an AI result, return it to CEO review rather than silently treating the old result as approved.
- Every successful edit is recorded in the task history and the local activity log.
- All task editing remains in browser-local storage; no backend or AI API calls are required.


## v0.6.0 — Local task search and filters

- Search tasks by title, employee name, status, priority, or due date using multiple case-insensitive keywords.
- Filter the task list by status, assigned employee, and priority; filters can be combined and reset.
- Sort tasks by newest first, nearest due date, or highest priority.
- Search, filtering, and sorting run entirely in the browser against the existing local task data. They do not call the backend, Gemini, or any external API.
- No new dependency, hosting service, API key, cloud credit, or payment method is required.


## v0.7.0 — Local productivity dashboard and operational reports

- Dashboard cards summarize total tasks, completed tasks and completion rate, overdue tasks, and deadlines within the next seven days.
- Status distribution shows queued, in-progress, awaiting-review, and completed tasks.
- Employee assignment summaries show assigned/completed counts, status breakdowns, and average task progress.
- Operational reports include a current task snapshot, recent activity for the selected 24-hour or seven-day window, employee assignment summaries, and tasks requiring attention.
- Reports can still be saved locally or copied as text. No network request is needed to calculate or export them.
- Metrics describe recorded task status and progress only. They do not infer work quality, sales, revenue, expenses, or profit when those data have not been entered.
