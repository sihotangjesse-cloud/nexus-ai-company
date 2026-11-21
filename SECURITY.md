# Security Notes

## Private browser mode

The frontend blocks the legacy backend API, login, health checks, cloud chat, company delegation, and AI revision flows before any request can be sent. It does not configure or use Gemini API keys.

## Browser-local generative assistant

The optional Asisten AI feature uses Wllama WebAssembly in a browser worker to load a user-selected GGUF file and execute inference locally. The app imports the pinned Wllama 3.13.0 JavaScript engine and WASM assets from jsDelivr only after the user explicitly selects **Muat model lokal**. This requires an initial connection to the CDN. The CDN receives requests for static engine assets, but the prompt, chat history, and selected local model file are not sent to an AI inference provider.

The model is loaded from a user-selected browser File/Blob and inference calls the local Wllama JavaScript object. There is no AI HTTP endpoint, localhost inference server, provider API key, provider billing, or hosted model call. The optional Android Python launcher serves static application files on 127.0.0.1 only; it does not receive prompts or execute model inference.

The initial model integration is CPU-only, single-threaded, limited to 2,048 context tokens and 256 output tokens. Device memory and browser support vary. A 0.5B model can be inaccurate and is not a substitute for a larger assistant. The app's system prompt is not a robust safety boundary; local-model output must be reviewed and must not be treated as guaranteed correct or safe.

Do not add API credentials to the HTML file. Keep real secrets out of Git, issue reports, screenshots, and chat messages.

## Local browser data

NEXUS stores active demo data and assistant conversation history in browser `localStorage`. That data is not encrypted by the app and may be readable by someone with access to the same browser profile or device.

Encrypted backup export protects the exported file with AES-256-GCM and a password-derived key. It does not encrypt active browser storage. Plain JSON exports are unencrypted. The application cannot recover a forgotten backup password.

## Optional legacy backend

The legacy backend is not required or used by the private browser mode. It supports a single shared owner password, not individual user accounts. Production mode fails to start when the required access password and signing secret are missing. Do not expose it or configure AI credentials for the private local workflow.

Rate limits and Gemini call budgets in that dormant backend are held in process memory. They reset after a process restart and are not global billing controls. Do not rely on them to enforce a financial spending limit.

## Reporting a vulnerability

Do not publish passwords, API keys, session secrets, personal data, or exploit details in a public issue. Use GitHub's private vulnerability reporting feature for this repository when it is available. Otherwise, report only that a security issue exists and request a private channel without including the sensitive details.

## Read-only public GitHub Explorer

The optional GitHub Explorer sends a direct HTTPS GET request to `api.github.com` only after the user submits a repository, branch, or folder request. It accepts public repositories only and does not add an Authorization header, store a token, read browser chat history, or upload local workspace contents. It cannot write repository contents, create branches, commit, or push. File previews are limited to 512 KB and decoded as UTF-8 text.

Unauthenticated GitHub REST requests are subject to GitHub's documented 60-request-per-hour primary limit per originating IP address. The app displays the remaining allowance when the response exposes it. Do not add personal access tokens to the frontend. See the official [rate limit guidance](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) and [CORS guidance](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests).
