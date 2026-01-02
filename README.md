# Tenon Frontend

Next.js App Router (React 19 + TypeScript) UI for Tenon’s 5-day work simulations. Candidates complete day-by-day tasks via invite tokens; recruiters create simulations, invite candidates, and review submissions.

## Architecture

- App Router under `src/app`; shared shell in `src/features/shared/layout/AppShell`.
- Auth0 for recruiter portal; `src/middleware.ts` redirects unauthenticated recruiters to `/auth/login?returnTo=…`.
- Candidate portal talks directly to the backend with token headers. Recruiter portal uses Next API routes as a BFF that forward to the backend with Auth0 access tokens.
- Styling via Tailwind utility classes and shared UI primitives in `src/components/ui`.

## Routes

- Marketing: `/` (`src/app/(marketing)/page.tsx`).
- Auth: `/auth/login`, `/auth/logout`.
- Candidate portal: `/candidate/session/[token]` (wrapped by `CandidateSessionProvider` layout; `/candidate-sessions/[token]` redirects here).
- Candidate dashboard: `/candidate/dashboard`.
- Recruiter portal: `/dashboard`, `/dashboard/simulations/new`, `/dashboard/simulations/[id]`, `/dashboard/simulations/[id]/candidates/[candidateSessionId]`.
- API BFF: `/api/simulations` (+ `/[id]/invite`, `/[id]/candidates`), `/api/submissions`, `/api/submissions/[submissionId]`, `/api/dev/access-token`.

## Key Components & Features

- Candidate session state: `src/features/candidate/session/CandidateSessionProvider` persists token/bootstrap in `sessionStorage`.
- Candidate flow: open invite → auto-claim via Auth0 → bootstrap session → intro → current task fetch → text/code editor with local drafts → submit → progress tracker; friendly error messages and retry hooks.
- Recruiter dashboard: `DashboardView` + `SimulationList` with invite modal/toast, profile card, and navigation to creation/detail/submission views.
- Submissions viewer: renders per-day artifacts (prompt, text, code with copy/download, testResults JSON if present).

## API Integration

- Base config: `NEXT_PUBLIC_TENON_API_BASE_URL` (defaults to `/api`); BFF targets `TENON_BACKEND_BASE_URL` (default `http://localhost:8000`).
- Candidate calls (direct with Auth0 bearer + `candidate:access`):
  - `GET /candidate/session/{token}` bootstrap/resolve invite.
  - `POST /candidate/session/{token}/claim` (no body) to claim invite with signed-in email.
  - `GET /candidate/session/{id}/current_task` with header `x-candidate-session-id`.
  - `POST /tasks/{taskId}/submit` with header `x-candidate-session-id`; body `{contentText?, codeBlob?}`.
- Recruiter calls (via BFF with Auth0 bearer token):
  - `GET /api/auth/me` (profile).
  - `GET/POST /api/simulations`.
  - `POST /api/simulations/{id}/invite`.
  - `GET /api/simulations/{id}/candidates`.
  - `GET /api/submissions?candidateSessionId=…`, `GET /api/submissions/{submissionId}`.
- Not implemented: codespace init/status, run-tests polling UI, fit profile fetch.

## Configuration / Env Vars

- `NEXT_PUBLIC_TENON_API_BASE_URL` – backend base for candidate calls (e.g., `https://backend.example.com/api`).
- `TENON_BACKEND_BASE_URL` – backend base for BFF (default `http://localhost:8000`; `/api` suffix trimmed).
- Auth0 (Tenon-only): `TENON_AUTH0_SECRET`, `TENON_AUTH0_DOMAIN`, `TENON_AUTH0_CLIENT_ID`, `TENON_AUTH0_CLIENT_SECRET`, `TENON_AUTH0_AUDIENCE`, `TENON_AUTH0_SCOPE`, `TENON_APP_BASE_URL`.
- Auth0 custom claims namespace (Tenon-only): `NEXT_PUBLIC_TENON_AUTH0_CLAIM_NAMESPACE` (defaults to `https://tenon.ai` when unset).
- Optional Auth0 connection hints for the login button intent routing:
  - `NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION`
  - `NEXT_PUBLIC_TENON_AUTH0_RECRUITER_CONNECTION`
- Optional helper script: `./runFrontend.sh` echoes `TENON_BACKEND_BASE_URL` then runs `npm run dev`.

## Local Development

- Install: `npm install`.
- Run dev: `npm run dev` (<http://localhost:3000>). Build: `npm run build`; start: `npm start`.
- Tests/checks: `npm test`, `npm run test:coverage`, `npm run test:e2e`, `npm run typecheck`, `npm run lint`, `./precommit.sh`.
- Point to local backend: set `TENON_BACKEND_BASE_URL` and `NEXT_PUBLIC_TENON_API_BASE_URL` in `.env.local`.

## Typical Flows

- Candidate: open invite link → bootstrap session → intro → load current task → auto-save drafts → submit with token/session headers → refresh current task → finish when `isComplete` true.
- Recruiter: Auth0 login → dashboard loads profile + simulations → create simulation → invite candidate (modal + copy invite URL) → view simulation candidates (status/time) → view per-task submissions (text/code/testResults).

## Planned Roadmap (not yet in code)

- GitHub-native workflow: codespace init/status, run-tests trigger + duplicate-run prevention UI.
- Day4 demo capture + transcript; Day5 structured markdown submission.
- Fit profile/report view, comparison, and print/export.
- Candidate run-tests panel integration and richer states/loading skeletons.

## Manual QA checklist

- Incognito candidate invite link (/candidate/session/<token>) → Auth0 login → auto-claim → intro screen → Start simulation → Day 1 loads (no manual email entry).
- Wrong account on claim (403) shows friendly invited-email message, logout, and dashboard options.
- Returning to invite link resumes tasks with stored `candidateSessionId` (no manual verify).
- Candidate dashboard lists invites with Continue/Start CTA; empty state renders when none.
- Recruiter signup/login lands on `/dashboard` from the home CTA.
- Candidate trying recruiter dashboard sees Not authorized with links to the right portal.
- Recruiter trying candidate portal sees Not authorized with dashboard link.
- Verify Auth0 `/authorize` request includes the correct `connection` parameter for the candidate flow.
