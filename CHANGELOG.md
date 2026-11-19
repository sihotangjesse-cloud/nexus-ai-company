# Changelog

## 0.3.5 — Backend hardening (stage 2) and AI workflow (stage 3)

Backend:
- Fixed: `employeeId` values such as `constructor` or `toString` were treated as valid employees (prototype lookup). Employee ids are now checked with `Object.hasOwn` on `/api/chat` and `/api/company`.
- Origin check on write requests now compares the host only. Behind a TLS-terminating proxy (Render) the scheme seen by Node could differ from the browser's and block login/chat when `TRUST_PROXY_HOPS` was not set correctly. Cross-site origins are still rejected.
- Unknown `/api/*` routes return a JSON 404 instead of an HTML page.
- Graceful shutdown on `SIGTERM`/`SIGINT` (Render sends SIGTERM on deploys) and keep-alive timeouts above typical proxy idle timeouts.

AI workflow:
- Sena now writes a **final synthesis** for the CEO after the specialists finish (`synthesis` / `synthesisError` in the `/api/company` response). If the synthesis call fails, the specialist results are still returned and saved. No synthesis is requested when no specialist succeeded.
- New `POST /api/revise`: the CEO writes revision notes on a task under review; the assigned employee receives the task, the previous result (first 6,000 characters) and the notes, and returns a revised result. The task returns to "Dalam pemeriksaan"; on failure the previous result is kept and the failure is logged in the task history. Same authentication and rate limiter as the other AI routes.
- Planning/validation/prompt logic moved to `workflow.js` (pure functions, unit-tested).
- The "Tandai perlu revisi" button is unchanged (status only); sending to the AI uses the new revision form.

Tests: added `tests/workflow.test.js`, `tests/frontend-revision.test.js`, synthesis tests in `tests/frontend-delegation.test.js`, and backend integration tests for `/api/revise`, prototype-name ids, JSON 404 and the extra synthesis call. The integration tests need installed dependencies and were NOT executed in the authoring environment.

## 0.3.4 — Foundation (CI, Render preparation)

- Added `.github/workflows/ci.yml` (Node 22: `npm ci`, `npm run check`, `npm test`) and a manual `lockfile.yml` workflow that generates and commits `package-lock.json`.
- Added `render.yaml` (Render Web Service, Singapore, Node 22, `npm ci` / `npm start`, health check `/api/health`; secrets are `sync: false`) and `DEPLOYMENT.md`.
- Login throttle no longer counts successful logins (`skipSuccessfulRequests`), so the owner cannot lock themselves out.
- Frontend shows a short "Memeriksa sesi…" state until `/api/health` answers, instead of briefly flashing the login screen.
- Not done yet: `package-lock.json` (needs network), real-dependency integration test run, Gemini live test, deployment, Sena final synthesis, automatic revision flow.

## 0.3.3 — Audit follow-up (findings #4 and #7)

- Form drafts: `render()` now keeps every edited field of every form (not only the focused one) and restores focus and caret position. Fields reset by a successful submit return to their defaults instead of restoring the old draft. The login screen is covered as well.
- Added backend integration tests that start `server.js` as a child process with Gemini replaced by a preloaded mock (`tests/helpers/`). They cover chat and company routes, Gemini error mapping, input validation, rate limiters, call budgets, authentication and cookies, CSP header, origin checks, and startup configuration failures. They require installed dependencies and are reported as skipped when `express` and the other dependencies are missing.
- Added regression tests for form-draft preservation that run the real `render()` against a small fake DOM.
- No new product features. `package-lock.json` is still not included: it must be generated with network access (`npm install`) and committed.

## 0.3.2 — Security and audit fixes

- Added optional single-owner login with signed HttpOnly session cookies. Production mode requires configured credentials; login sessions expire after 12 hours and are invalidated when credentials rotate.
- Added login attempt throttling, separate company orchestration limits, and process-local Gemini call caps.
- Reduced information exposed by unauthenticated health checks and enabled a script-hash Content Security Policy.
- Added explicit CEO approve/revision actions for specialist output. Revision marking does not retry AI automatically.
- Removed invented deadlines from delegated tasks.
- Fixed progress values 90–99%, preserved focused form input during background renders, and constrained persisted task/event IDs.
- Replaced misleading frontend system-prompt display with a role summary.
- Set Gemini 3 thinking level to LOW, increased output token ceilings, and allow usable partial non-JSON chat output to be shown with a truncation note.

## 0.3.1 — Reliability updates

- Normalized incomplete legacy localStorage data.
- Persisted delegated specialist results directly on task records.
- Synchronized task status and progress.
- Distinguished active work, queued work, and pending review in the virtual office.
