# SimuHire Frontend

Next.js frontend for SimuHire, a 5-day simulation-based hiring platform. It serves two surfaces:

- Candidate portal for completing daily simulation tasks via invite tokens.
- Recruiter portal for logging in, creating simulations, inviting candidates, and viewing submissions.

## Tech & Architecture

- Next.js App Router (React 19).
- Auth0 for recruiter authentication.
- BFF API routes under `/api/*` that forward to the backend with Auth0 access tokens (`src/lib/server/bff.ts`).
- Candidate portal calls the backend directly via `NEXT_PUBLIC_API_BASE_URL` with candidate-token headers.
- UI primitives in `src/components/ui`; feature modules in `src/features/*`; layouts in `src/features/shared/layout`.

## Key Routes

- Marketing: `/` (`src/app/(marketing)/page.tsx`) with signed-in/out variants.
- Auth: `/login`, `/logout`, `/auth/login`, `/auth/logout` (Auth0).
- Candidate: `/candidate/[token]` (main portal), `/candidate/session/[token]` (redirect shim).
- Recruiter:
  - `/dashboard` – profile + simulations list.
  - `/dashboard/simulations/new` – create simulation form.
  - `/dashboard/simulations/[id]` – candidates in a simulation.
  - `/dashboard/simulations/[id]/candidates/[candidateSessionId]` – submission artifacts.

## Data Flow

- Candidate actions (unauthenticated):
  - Bootstrap: `GET {API_BASE}/candidate/session/{token}`.
  - Current task: `GET {API_BASE}/candidate/session/{id}/current_task` with `x-candidate-token`.
  - Submit task: `POST {API_BASE}/tasks/{taskId}/submit` with `x-candidate-token` and `x-candidate-session-id`; text/code required by type.
- Recruiter actions (Auth0-protected via BFF):
  - Profile: `GET /api/auth/me` (server-side in `/dashboard`).
  - Simulations: `GET/POST /api/simulations`.
  - Invite candidate: `POST /api/simulations/{id}/invite`.
  - Candidates in simulation: `GET /api/simulations/{id}/candidates`.
  - Submissions: `GET /api/submissions?candidateSessionId=...` and `GET /api/submissions/{submissionId}`.

## Running Locally

1) Install deps: `npm install`.
2) Env vars (`.env.local`):
   - `NEXT_PUBLIC_API_BASE_URL=https://backend.example.com/api` (candidate calls).
   - `BACKEND_BASE_URL=http://localhost:8000` (BFF upstream base; no trailing slash).
   - Auth0: `AUTH0_SECRET`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE`, `AUTH0_SCOPE` (if needed), `APP_BASE_URL=http://localhost:3000`.
3) Dev server: `npm run dev` (<http://localhost:3000>).
4) Tests: `npm test` (unit/Jest), `npm run test:e2e` (Playwright config at `tests/e2e/playwright.config.ts`).
5) Typecheck/lint: `npm run typecheck`, `npm run lint`.

## Code Structure

- `src/app/` – routes, layouts, and API BFF handlers.
- `src/features/candidate/` – session context, task UI, draft handling.
- `src/features/recruiter/` – dashboard, simulations, invitations, submissions.
- `src/features/auth/` – Auth0 login/logout links and pages.
- `src/features/marketing/` – marketing homepage variants.
- `src/components/ui/` – buttons, inputs, page headers, Monaco code editor.
- `src/lib/api/` – HTTP client, recruiter/candidate API wrappers, error helpers.
- `src/lib/server/` – BFF helpers for forwarding to backend.
- `src/lib/storage/` – candidate draft persistence.

## Typical Flows

- Candidate link → bootstrap invite → intro screen → fetch current task → auto-save drafts → submit (text/code) → refetch next task → complete after 5 days.
- Recruiter login → dashboard loads profile + simulations → create simulation → invite candidate (modal + copy invite URL) → monitor candidates in simulation → open candidate → view submission artifacts (text/code/test results). Execution profile, comparisons, and print/export are not yet implemented.

## Status / TODO

- No “Run Tests” UX in candidate tasks; only submission.
- Execution profile, candidate comparison, and report/print views are absent.
- Notifications/toasts exist only for invite success; broader error/success toasts could be added.
