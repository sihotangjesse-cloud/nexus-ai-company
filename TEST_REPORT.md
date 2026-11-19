# NEXUS AI COMPANY v0.3.5 — Latest local validation (18 November 2026)

Environment: Node.js v22.16.0, npm 10.9.2, dependencies not installed. Registry access timed out in the authoring environment.

| Command | Result |
|---|---|
| `npm run check` | PASS |
| `npm test` | 78 counted: 77 passed, 0 failed, 1 skipped (backend dependencies unavailable) |
| Backend integration tests against real Express/Helmet | NOT RUN locally; must be verified by GitHub Actions after `npm ci` |
| GitHub Actions CI / Render deploy | NOT YET VERIFIED |

The release-branch workflow now generates and commits `package-lock.json` on GitHub's runner. The PR CI must still pass with dependencies installed before the release is merged or deployed.

---

# NEXUS AI COMPANY v0.3.5 — Test Report (stages 2 and 3)

Run on Node v22.23.5 in a sandbox without network access, dependencies NOT installed:

- `npm run check`: PASS.
- `npm test`: 78 counted, 77 pass, 0 fail, 1 skipped (the dependency-presence test). The backend integration suites (including the new `/api/revise`, synthesis-call and prototype-id tests, and the updated company tests that now expect 5 Gemini calls) were skipped: they have NOT been run against real Express/Helmet/express-rate-limit. The first real run will be the GitHub Actions CI.
- Executed and passing: `workflow.test.js` (8), `frontend-revision.test.js` (6), frontend delegation incl. synthesis (4), and the pre-existing unit suites.
- Not run: Gemini live, real browser, CSP enforcement, Render deployment.

---

(Previous report follows.)

# NEXUS AI COMPANY v0.3.4 — Test Report (foundation stage)

Run on Node v22.23.5 in a sandbox without network access, dependencies NOT installed:

- `npm run check`: PASS.
- `npm test`: 62 counted, 61 pass, 0 fail, 1 skipped. The backend integration suites were skipped (dependencies missing), so they have NOT been verified against real Express/Helmet/express-rate-limit.
- `npm install` could not complete; `package-lock.json` was not generated.
- Not run: Gemini live, real browser, CSP enforcement, Render deployment, CI (workflow files are untested until pushed to GitHub).

---

(Previous v0.3.3 report follows.)

# NEXUS AI COMPANY v0.3.3 — Test Report

Date: 17 November 2026
Environment: Node v22.23.4, no network access, dependencies **not installed**.

## Results actually executed (real, in the packaged directory)

| Command | Result |
|---|---|
| `npm run check` | PASS (syntax of `server.js`, `auth.js`, `usage-budget.js`, `csp.js`, `history.js`; frontend inline script parse) |
| `npm test` | 62 tests: **61 passed, 0 failed, 1 skipped**; 11 suites skipped |

The skipped items are the **backend integration suites**. They need `express`, `helmet`,
`express-rate-limit` and `dotenv`, which could not be installed here (`npm install` has no
registry access). Node does not count tests inside a skipped suite, so the single skipped marker
test plus the 11 skipped suites are the only trace in the summary. **The integration tests have
not been run against the real Express stack.**

The 61 passing tests are the earlier unit and frontend tests (51) plus 10 new form-draft tests.

## What changed in this version

### Finding #7 — form drafts lost on re-render: fixed and tested
`render()` now captures every named control whose value differs from its HTML default, restores
it after the DOM is rebuilt, and then restores focus and caret position. Controls reset by a
successful submit equal their defaults again and are therefore not restored. The login screen
branch now restores state too (it previously returned before doing so).

`tests/form-drafts.test.js` runs the real `render()` against a small fake DOM that parses the
actual form markup. Covered: all four task fields, the agenda form during a status refresh,
clearing after a successful submit, keeping text after a rejected submit, no stale name after
saving the CEO profile, no draft leaking between employee chats, focus/caret restoration, chat
clearing after send, and the login password during a refresh.
Check: the same tests were run against the v0.3.2 `index.html`; 5 of them fail there and all 10
pass on v0.3.3. These tests use a fake DOM, not a real browser.

### Finding #4 — backend integration tests: written, NOT executed against real Express
`tests/server-integration.test.js` starts `server.js` as a child process with Gemini replaced by
a preloaded mock (`tests/helpers/mock-gemini-preload.mjs`; `server.js` itself is unchanged).
38 tests in 11 suites cover:

- chat and company routes, including request content sent to Gemini (key header, system prompt,
  merged history, low thinking level, token ceilings)
- Gemini error mapping (429, 401, 404, 500, safety, prompt block, empty, truncation) and
  non-leakage of the key and provider text
- input validation and 413 handling at both the parser and the route level
- specialist filtering (duplicates, leader, unknown id, maximum three), partial specialist
  failure, unreadable planner JSON, empty plan
- per-minute AI limiter, company limiter, login limiter, minute and daily Gemini call budgets,
  missing API key
- authentication: 401 without session, Origin requirement, login/logout cookie attributes,
  tampered, garbage and wrongly signed cookies
- health response contents, CSP script hash, malformed JSON message, cross-origin refusal,
  loopback binding, proxy-header warning, production startup failures and a valid production start

## Supplementary checks (NOT real verification)

Because Express could not be installed, the integration suites were debugged against a small
hand-written **approximation** of express/helmet/express-rate-limit kept outside this package.
Against that approximation all 38 integration tests passed (full run: 99 passed, 0 failed,
0 skipped). Seven deliberate bugs injected into a throw-away copy of `server.js` (removed
authentication, unused call budget, wrong thinking level, weakened company limiter, duplicate
specialists, leaked provider text, non-generic parse error) were each caught by at least one
test. This shows the tests are sensitive and internally consistent. It does **not** prove they
pass on real Express, Helmet and express-rate-limit, whose behaviour may differ in details
(header formats, error objects, limiter semantics).

## Not done

- **`package-lock.json` was not created.** Generating it requires registry access, which is not
  available here, and a hand-written lockfile would be invalid. Run `npm install` with network
  access, commit the generated file, then use `npm ci`.
- Integration tests were not executed against the real dependencies (see above).
- Live Gemini requests, real-browser behaviour, CSP enforcement in a browser, deployment and
  multi-instance limiting were not tested.

## Observations (not changed, outside the requested scope)

- The frontend starts with `AUTH.required` set to true, so the login screen can flash briefly in
  local no-auth mode until the first `/api/health` response arrives.
- `package.json`'s `check` script does not syntax-check the new files under `tests/helpers/`
  (they are loaded and exercised by `npm test` when dependencies are installed).

## First steps on a machine with network access

1. `npm install` (creates `package-lock.json`; commit it)
2. `npm run check`
3. `npm test` — expect 0 skipped; 99 tests in total if everything passes
