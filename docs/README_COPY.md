# Tenon Frontend

Next.js App Router (React 19 + TypeScript) UI for Tenon 5-day simulations. Candidates progress day by day via invite tokens. Recruiters create simulations, invite candidates, and review submissions and artifacts.

## Architecture Overview

- App Router only. Routes live in `src/app` and are grouped by `(marketing)`, `(auth)`, `(candidate)`, `(recruiter)`.
- Middleware in `src/proxy.ts` enforces Auth0 login and role gating for candidate vs recruiter routes.
- Candidate API calls use `apiClient` or `requestWithMeta` against `NEXT_PUBLIC_TENON_API_BASE_URL` (defaults to `/api/backend`).
- Recruiter API calls use Next API routes under `/api` (BFF) which forward to the backend with Auth0 access tokens.
- Shared UI and utilities live in `src/shared`. Feature modules live in `src/features`. Infra and API client live in `src/lib`.

## Folder Structure

- `src/app`: route definitions, layouts, API routes.
- `src/features`: domain features for candidate, recruiter, auth, marketing.
- `src/shared`: UI primitives, status helpers, hooks, notifications, polling.
- `src/lib`: API client, Auth0 helpers, server BFF/proxy, error handling.
- `src/proxy.ts` and `src/proxy/*`: middleware auth gating and perf logging.
- `tests`: unit, integration, and e2e suites.

## Route Map

### App Router

- `/`
- `/auth/login`
- `/auth/logout`
- `/auth/error`
- `/auth/clear`
- `/not-authorized`
- `/candidate/dashboard`
- `/candidate/session/[token]`
- `/candidate-sessions/[token]` (redirect to `/candidate/session/[token]`)
- `/dashboard`
- `/dashboard/simulations/new`
- `/dashboard/simulations/[id]`
- `/dashboard/simulations/[id]/candidates/[candidateSessionId]`

### API Routes (BFF + proxy)

- `/api/backend/[...path]` (proxy to backend `/api`)
- `/api/health`
- `/api/dashboard`
- `/api/auth/me`
- `/api/auth/access-token`
- `/api/dev/access-token`
- `/api/debug/auth` (dev only)
- `/api/simulations`
- `/api/simulations/[id]`
- `/api/simulations/[id]/invite`
- `/api/simulations/[id]/candidates`
- `/api/simulations/[id]/candidates/[candidateSessionId]/invite/resend`
- `/api/submissions`
- `/api/submissions/[submissionId]`

## Key Features (Implemented)

- Candidate session bootstrap, task gating, and day progression with session persistence.
- GitHub native Days 2 and 3 with workspace status/init panel and test run panel.
- Text task editor with autosave to session storage and markdown preview.
- Candidate dashboard listing active invites.
- Recruiter dashboard with profile card, simulations list, and invite modal.
- Simulation creation form with `templateKey` selection.
- Simulation detail view with plan summary, candidate list, status pills, and resend-invite flow.
- Candidate submissions view with per-day artifacts, GitHub links, and test results summaries.

## User Flows

### Candidate Happy Path

1. Open invite link at `/candidate/session/[token]` and sign in via Auth0 if prompted. UI states: `LoadingView`, `AuthView`, `ErrorView`. Components: `CandidateSessionPage`, `CandidateSessionView`, `AuthView`. APIs: `GET /api/auth/access-token`, `GET /candidate/session/{token}`, `GET /candidate/session/{id}/current_task`.
2. Onboarding start screen. UI state: `StartView` with day overview and start actions. Components: `StartView`, `StartIntro`, `StartActions`. APIs: none.
3. Day 1 text task submission. UI states: `RunningView`, editor, submit states (`idle`, `submitting`, `submitted`), error banner. Components: `CandidateTaskView`, `TaskTextInput`, `TaskStatus`. APIs: `POST /tasks/{taskId}/submit` with `x-candidate-session-id`, then `GET /candidate/session/{id}/current_task`.
4. Day 2 GitHub-native task. UI states: workspace loading and provisioning messages, test run states (`idle`, `starting`, `running`, `passed`, `failed`, `timeout`), submit states. Components: `WorkspacePanel`, `RunTestsPanel`, `CandidateTaskView`. APIs: `GET /tasks/{taskId}/codespace/status`, `POST /tasks/{taskId}/codespace/init`, `POST /tasks/{taskId}/run`, `GET /tasks/{taskId}/run/{runId}`, `POST /tasks/{taskId}/submit`. Run Tests disables while running and persists `runId` in session storage to resume polling.
5. Day 3 GitHub-native task. UI states and APIs are the same as Day 2.
6. Day 4 handoff task. UI states: resource panel shows recording link if present, text editor for response. Components: `ResourcePanel`, `CandidateTaskView`. APIs: `POST /tasks/{taskId}/submit`.
7. Day 5 documentation task. UI states: resource panel for docs link, text editor with markdown preview. Components: `ResourcePanel`, `CandidateTaskView`. APIs: `POST /tasks/{taskId}/submit`.
8. Completion. UI state: `CompleteView` when `isComplete` is true. Components: `CompleteView`. APIs: none.

### Recruiter Happy Path

1. Sign in via `/auth/login`. UI states: login page, Auth0 redirect, not-authorized screen if missing permissions. Components: `LoginPage`, `NotAuthorizedPage`. APIs: Auth0 handled by middleware and `/api/auth/access-token` for session tokens.
2. Dashboard load at `/dashboard`. UI states: profile skeleton, simulations skeleton, error messages, empty state. Components: `RecruiterDashboardPage`, `DashboardContent`, `RecruiterSimulationList`. APIs: `GET /api/dashboard` (BFF aggregator).
3. Create simulation at `/dashboard/simulations/new`. UI states: validation errors and submit feedback. Components: `SimulationCreatePage`, `SimulationCreateForm`. APIs: `POST /api/simulations` with `templateKey`, `title`, `role`, `techStack`, `seniority`, `focus`.
4. Invite candidates from dashboard or simulation detail. UI states: invite modal, loading/submitted toasts, error messaging. Components: `InviteCandidateModal`, `useInviteToasts`. APIs: `POST /api/simulations/{id}/invite`.
5. Simulation detail at `/dashboard/simulations/[id]`. UI states: plan loading and error, candidates loading and empty/error, search results, resend invite cooldown. Components: `SimulationDetailView`, `CandidatesTable`, `SimulationPlanSection`. APIs: `GET /api/simulations/{id}`, `GET /api/simulations/{id}/candidates`, `POST /api/simulations/{id}/candidates/{candidateSessionId}/invite/resend`.
6. Candidate submissions at `/dashboard/simulations/[id]/candidates/[candidateSessionId]`. UI states: submissions skeleton, empty/error states, artifact warning banner, pagination. Components: `CandidateSubmissionsView`, `ArtifactCard`, `SubmissionsTable`. APIs: `GET /api/submissions?candidateSessionId=...`, `GET /api/submissions/{submissionId}`, and candidate verification via `GET /api/simulations/{id}/candidates`.

## Frontend and Backend API Map

Base configuration:

- Candidate API base: `NEXT_PUBLIC_TENON_API_BASE_URL` in `src/lib/api/client/requestCore.ts`, defaulting to `/api/backend`.
- Backend proxy target: `TENON_BACKEND_BASE_URL` in `src/lib/server/bff/upstream.ts`, defaulting to `http://localhost:8000`.
- Auth headers: `apiClient` and `requestWithMeta` attach `Authorization: Bearer <token>` when `authToken` is provided.
- Candidate calls add `x-candidate-session-id` for task, test, and workspace endpoints.

Candidate endpoints (direct to backend or via `/api/backend`):

- `GET /candidate/invites`
- `GET /candidate/session/{token}`
- `GET /candidate/session/{id}/current_task` with `x-candidate-session-id`
- `POST /tasks/{taskId}/submit` with `x-candidate-session-id`
- `POST /tasks/{taskId}/run` and `GET /tasks/{taskId}/run/{runId}` with `x-candidate-session-id`
- `POST /tasks/{taskId}/codespace/init` and `GET /tasks/{taskId}/codespace/status` with `x-candidate-session-id`

Recruiter endpoints (BFF under `/api`):

- `GET /api/dashboard` (aggregates `/api/auth/me` and `/api/simulations`)
- `GET /api/simulations` and `POST /api/simulations`
- `GET /api/simulations/{id}`
- `POST /api/simulations/{id}/invite`
- `GET /api/simulations/{id}/candidates`
- `POST /api/simulations/{id}/candidates/{candidateSessionId}/invite/resend`
- `GET /api/submissions?candidateSessionId=...`
- `GET /api/submissions/{submissionId}`

Auth and debug endpoints:

- `GET /api/auth/access-token`
- `GET /api/dev/access-token`
- `GET /api/debug/auth` (dev only)

## Configuration and Environment Variables

Server-side:

- `TENON_BACKEND_BASE_URL` (default `http://localhost:8000`)
- `TENON_AUTH0_SECRET`
- `TENON_AUTH0_DOMAIN`
- `TENON_AUTH0_CLIENT_ID`
- `TENON_AUTH0_CLIENT_SECRET`
- `TENON_AUTH0_AUDIENCE` (optional)
- `TENON_AUTH0_SCOPE` (optional)
- `TENON_APP_BASE_URL`
- `TENON_AUTH0_COOKIE_DOMAIN` (optional)
- `TENON_DEPLOY_ENV` (optional, `production` enables HSTS outside Vercel)
- `TENON_DEBUG_PERF`, `TENON_DEBUG_AUTH`, `TENON_DEBUG_PROXY` (optional)
- `TENON_PROXY_MAX_BODY_BYTES`, `TENON_PROXY_MAX_RESPONSE_BYTES` (optional)
- `TENON_USE_FETCH_DISPATCHER` (optional)

Client-side:

- `NEXT_PUBLIC_TENON_API_BASE_URL` (defaults to `/api/backend`)
- `NEXT_PUBLIC_TENON_AUTH0_CLAIM_NAMESPACE`
- `NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION`
- `NEXT_PUBLIC_TENON_AUTH0_RECRUITER_CONNECTION`
- `NEXT_PUBLIC_TENON_APP_BASE_URL` (optional)
- `NEXT_PUBLIC_VERCEL_URL` (optional)
- `NEXT_PUBLIC_TENON_DEBUG_PERF` (optional)
- `NEXT_PUBLIC_TENON_DEBUG_ERRORS` (optional)

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Optional helper script:

```bash
./runFrontend.sh
```

Point the frontend at a local backend by creating `.env.local`:

```bash
TENON_BACKEND_BASE_URL=http://localhost:8000
NEXT_PUBLIC_TENON_API_BASE_URL=/api/backend
```

Auth0 is required for most flows. Provide the Auth0 env vars above and ensure your tenant includes `candidate:access` and `recruiter:access` permissions.

## Tests

Run unit and integration tests:

```bash
npm test
```

Run with coverage:

```bash
npm run test:coverage
```

Run end to end tests:

```bash
npm run test:e2e
```

Coverage thresholds are set to 99 percent for statements, branches, functions, and lines in `jest.config.mjs`.

## Planned Roadmap (Not Yet Implemented in UI)

- In-app recording and upload for Day 4 handoff, plus transcript pipeline.
- Structured Day 5 documentation form beyond freeform markdown.
- Execution profile report view, comparisons, and print and export.

## Documentation

- `docs/frontend/README.md` (routes, flows, API map, config, local dev)
- `docs/frontend/planned.md` (planned or incomplete UI)
