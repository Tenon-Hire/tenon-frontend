# Tenon Frontend

Next.js App Router (React 19 + TypeScript) UI for Tenon’s 5-day work simulations. Candidates complete day-by-day tasks via invite tokens; recruiters create simulations, invite candidates, and review submissions.

## Architecture

- App Router under `src/app`; shared shell in `src/features/shared/layout/AppShell`.
- Auth0 for recruiter portal; `src/middleware.ts` redirects unauthenticated recruiters to `/auth/login?returnTo=…`.
- Candidate portal uses invite email OTP verification to mint a candidate access token for API calls.
- Candidate portal uses a same-origin proxy under `/api/backend/*` by default (can point to an absolute backend URL); requests carry bearer tokens. Recruiter portal uses Next API routes as a BFF that forward to the backend with Auth0 access tokens.
- Styling via Tailwind utility classes and shared UI primitives in `src/components/ui`.

## Routes

- Marketing: `/` (`src/app/(marketing)/page.tsx`).
- Auth: `/auth/login`, `/auth/logout`.
- Candidate portal: `/candidate/session/[token]` (wrapped by `CandidateSessionProvider` layout; `/candidate-sessions/[token]` redirects here).
- Candidate dashboard: `/candidate/dashboard`.
- Recruiter portal: `/dashboard`, `/dashboard/simulations/new`, `/dashboard/simulations/[id]`, `/dashboard/simulations/[id]/candidates/[candidateSessionId]`.
- API BFF: `/api/simulations` (+ `/[id]`, `/[id]/invite`, `/[id]/candidates`), `/api/submissions`, `/api/submissions/[submissionId]`, `/api/dev/access-token`, `/api/auth/me`, `/api/backend/[...path]` proxy to the upstream backend, `/api/health` passthrough.

## Key Components & Features

- Candidate session state: `src/features/candidate/session/CandidateSessionProvider` persists token/bootstrap in `sessionStorage`.
- Candidate flow: open invite → send OTP email → verify code → receive candidate access token → bootstrap session → intro → current task fetch → text/code editor with local drafts → submit → progress tracker; friendly error messages and retry hooks.
- Recruiter dashboard: `DashboardView` + `SimulationList` with invite modal/toast, profile card, and navigation to creation/detail/submission views.
- Submissions viewer: renders per-day artifacts (prompt, text, code with copy/download, testResults JSON if present).
- API responses include correlation/debug headers: `x-tenon-request-id`, `x-tenon-bff`, `x-tenon-upstream-status` (+ per-upstream status on `/api/dashboard`) and `Server-Timing` (`bff;dur=…`, `retry;desc="count=N"`).

## API Integration

- Base config: `NEXT_PUBLIC_TENON_API_BASE_URL` (defaults to `/api/backend` proxy); BFF targets `TENON_BACKEND_BASE_URL` (default `http://localhost:8000`; `/api` suffix trimmed).
- Candidate calls (direct with candidate access bearer token):
  - `POST /candidate/session/{token}/verification/code/send` to send OTP.
  - `POST /candidate/session/{token}/verification/code/confirm` with `{email, code}` to exchange for `candidateAccessToken`.
  - `GET /candidate/session/{token}` bootstrap/resolve invite (uses `candidateAccessToken`).
  - `GET /candidate/session/{id}/current_task` with header `x-candidate-session-id`.
  - `POST /tasks/{taskId}/submit` with header `x-candidate-session-id`; body `{contentText?}` for text tasks. Day2/Day3 run/submit operate on the GitHub repo + workflow artifacts (no code payloads).
- Recruiter calls (via BFF with Auth0 bearer token):
  - `GET /api/auth/me` (profile).
  - `GET/POST /api/simulations`, `GET /api/simulations/{id}`.
  - `POST /api/simulations/{id}/invite`.
  - `GET /api/simulations/{id}/candidates`.
  - `GET /api/submissions?candidateSessionId=…`, `GET /api/submissions/{submissionId}`.
- Not implemented: codespace init/status, run-tests polling UI, fit profile fetch.

## Configuration / Env Vars

Server-only:

- Auth0 (Tenon-only): `TENON_AUTH0_SECRET`, `TENON_AUTH0_DOMAIN`, `TENON_AUTH0_CLIENT_ID`, `TENON_AUTH0_CLIENT_SECRET`, `TENON_AUTH0_AUDIENCE`, `TENON_AUTH0_SCOPE`, `TENON_APP_BASE_URL`.
- Backend base for BFF: `TENON_BACKEND_BASE_URL` (default `http://localhost:8000`; `/api` suffix trimmed).
- Optional deploy environment flag: `TENON_DEPLOY_ENV` (set to `production` to enable HSTS outside Vercel).
- Optional cookie scope: `TENON_AUTH0_COOKIE_DOMAIN`.
- Optional proxy limits: `TENON_PROXY_MAX_BODY_BYTES`, `TENON_PROXY_MAX_RESPONSE_BYTES`.
- Optional server debug flags: `TENON_DEBUG_PERF`, `TENON_DEBUG_AUTH`, `TENON_DEBUG`, `TENON_DEBUG_PROXY`.
- Optional upstream connection pooling: `TENON_USE_FETCH_DISPATCHER=1`.
- Platform/build: `VERCEL_URL`, `NEXT_TELEMETRY_DISABLED`.

Client-safe:

- Candidate API base: `NEXT_PUBLIC_TENON_API_BASE_URL` (prefer `/api` for same-origin).
- Auth0 custom claims namespace: `NEXT_PUBLIC_TENON_AUTH0_CLAIM_NAMESPACE`.
- Optional Auth0 connection hints: `NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION`, `NEXT_PUBLIC_TENON_AUTH0_RECRUITER_CONNECTION`.
- Optional UI debug flags: `NEXT_PUBLIC_TENON_DEBUG_ERRORS`, `NEXT_PUBLIC_TENON_DEBUG_PERF`.
- Optional base URL helpers: `NEXT_PUBLIC_TENON_APP_BASE_URL`, `NEXT_PUBLIC_VERCEL_URL`.
- Auth0 Application config: logout returnTo is standardized to `${window.location.origin}/` (root only). Allowed Logout URLs must include the root URL for every environment origin (local/staging/prod). If candidate/recruiter live on different origins/subdomains, include the root URL for each origin.

- Optional helper script: `./runFrontend.sh` echoes `TENON_BACKEND_BASE_URL` then runs `npm run dev`.

## Local Development

- Install: `npm install`.
- Run dev: `npm run dev` (<http://localhost:3000>). Build: `npm run build`; start: `npm start`.
- Tests/checks: `npm test`, `npm run test:coverage`, `npm run test:e2e`, `npm run typecheck`, `npm run lint`, `./precommit.sh`.
- Point to local backend: set `TENON_BACKEND_BASE_URL` and `NEXT_PUBLIC_TENON_API_BASE_URL` in `.env.local`.
- Load test `/api/dashboard` locally (optional): `npm run loadtest:dashboard` (override with `LOADTEST_URL`, `LOADTEST_CONN`, `LOADTEST_DURATION`, `LOADTEST_COOKIE`, `LOADTEST_AUTH_HEADER` for authenticated calls; without auth you will mostly hit 401/403).

## Testing & Coverage

The codebase uses **Jest** as the test runner with **React Testing Library** for component tests and a custom mock server for API mocking.

### Running Tests

```bash
# Run all tests (no coverage)
npm test

# Run tests with coverage report
npm run test:coverage

# Run a specific test file or pattern
npm test -- --testPathPattern='CandidateSessionPage'

# Run tests in CI mode (coverage + runInBand)
npm run test:ci

# Run E2E tests with Playwright
npm run test:e2e
```

### Coverage Thresholds

The project enforces **100% coverage** for statements, branches, functions, and lines both globally and per-file. The CI pipeline fails if any threshold drops below 100%.

Configuration is in `jest.config.mjs`:
- Collects coverage from `src/**/*.{ts,tsx}` (excludes `.d.ts` type declaration files).
- Outputs coverage in `text`, `lcov`, `json`, and `json-summary` formats.
- Coverage reports are written to the `coverage/` directory.

### Coverage Ledger

A complete file-level coverage ledger is maintained at `docs/COVERAGE_LEDGER.md`. This ledger tracks:
- Every source file with its coverage status (covered, needs tests, or not instrumented).
- Detected test files covering each source file.
- Notes on key branches/states exercised.

To regenerate the ledger after a coverage run:
```bash
node scripts/generate-coverage-ledger.mjs
```

### Test Utilities

The `tests/setup/` directory provides shared test utilities:
- `createMockServer()` – lightweight fetch mock for API testing.
- `renderCandidateWithProviders()` – wraps components with `CandidateSessionProvider`.
- `jsonResponse()`, `textResponse()` – helpers for mocking API responses.
- Router mocks for Next.js App Router (`tests/integration/setup/`).

### Test Structure

```
tests/
├── e2e/                    # Playwright E2E tests
│   ├── candidate.spec.ts
│   ├── recruiter.spec.ts
│   └── smoke.spec.ts
├── integration/            # Integration tests (full provider stacks)
│   ├── candidate/
│   └── recruiter/
├── setup/                  # Shared test utilities
└── unit/                   # Unit tests organized by source location
    ├── app/                # Page/route tests
    ├── components/         # UI component tests
    ├── features/           # Feature module tests
    └── lib/                # Library/utility tests
```

### CI Gate

CI runs `npm run test:ci` which:
1. Runs all tests with `--runInBand` for stable, serial execution.
2. Collects coverage and enforces 100% thresholds.
3. Fails the build if any file drops below 100% coverage.

## Performance Debugging

- Set `NEXT_PUBLIC_TENON_DEBUG_PERF=1` to log Web Vitals (LCP/INP/CLS), navigation timings, client API request durations, and candidate UI marks (bootstrap/task fetch) to the browser console. Server routes still respect `TENON_DEBUG_PERF`.
- API perf logs scrub auth headers and long IDs; keep the flag off in production unless diagnosing an issue.

## Security Notes

- Client bundles should only read `NEXT_PUBLIC_*` env vars; keep secrets in `TENON_*` server-only vars.
- CSP ships in Report-Only mode initially (`Content-Security-Policy-Report-Only`) to avoid unexpected breakage.
- Security headers are set in `next.config.ts`; HSTS is enabled only when `VERCEL_ENV=production` or `TENON_DEPLOY_ENV=production`.
- `sanitizeReturnTo` is enforced in auth redirect URL builders and callback handling to prevent open redirects.
- Error messages are sanitized to avoid leaking access tokens in logs/toasts.
- If external images are needed, allow-list their origins in CSP (current `img-src` is `self` + `https:` + `data:` + `blob:`).

## Typical Flows

- Candidate: open invite link → verify OTP → bootstrap session → intro → load current task → auto-save drafts → submit with token/session headers → finish when `isComplete` true.
- Recruiter: Auth0 login → dashboard loads profile + simulations → create simulation (select template stack) → invite candidate (modal + copy invite URL) → view simulation candidates (status/time) → view per-task submissions (text/code/testResults).

## Planned Roadmap (not yet in code)

- GitHub-native workflow: codespace init/status, run-tests trigger + duplicate-run prevention UI.
- Day4 demo capture + transcript; Day5 structured markdown submission.
- Fit profile/report view, comparison, and print/export.
- Candidate run-tests panel integration and richer states/loading skeletons.

## Manual QA checklist

- Incognito candidate invite link (/candidate/session/<token>) → enter invite email + OTP → intro screen → Start simulation → Day 1 loads.
- Invalid/expired invite shows friendly error on verification screen.
- Returning to invite link resumes tasks with stored `candidateSessionId` (no manual verify).
- Candidate dashboard lists invites with Continue/Start CTA; empty state renders when none.
- Recruiter signup/login lands on `/dashboard` from the home CTA.
- Candidate trying recruiter dashboard sees Not authorized with links to the right portal.
- Recruiter trying candidate portal sees Not authorized with dashboard link.
- Verify Auth0 `/authorize` request includes the correct `connection` parameter for the candidate flow.
- API sanity: `/api/*` returns JSON (401/403 on auth failures) with no `Location` redirects; `/api/backend/*` stays same-origin; recruiter dashboard makes a single `/api/dashboard` call (tagged with `x-tenon-bff`/`x-tenon-upstream-status`/`x-tenon-request-id`).
- API responses expose `Server-Timing` (total + retry count) and never leak `Location` headers; oversized request/response bodies are rejected with JSON and a request-id for correlation.
- Network hygiene (Vercel): recruiter flows hit `/api/**` only (no calls to absolute `NEXT_PUBLIC_TENON_API_BASE_URL`); login navigations are document requests only (no XHR/prefetch to `/authorize`); create simulation first attempt returns 201 JSON with id.
- Security headers (manual): verify `/` responds with `Content-Security-Policy-Report-Only` and HSTS only when `VERCEL_ENV=production` or `TENON_DEPLOY_ENV=production`.
