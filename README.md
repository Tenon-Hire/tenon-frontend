# SimuHire Frontend

Next.js frontend for SimuHire, a simulation-based hiring platform. Candidates complete a 5-day task sequence via invite tokens; recruiters create simulations, invite candidates, and review their submissions.

## Architecture

- **Framework**: Next.js App Router (React 19) with server/client components.
- **Auth**: Auth0 for recruiter portal; middleware guards everything except marketing, auth callback pages, and candidate routes.
- **Routing**: Segmented app folders for marketing `(marketing)`, candidate `(candidate)`, auth `(auth)`, and recruiter dashboard `(dashboard)`.
- **Data access**:
  - Candidate portal talks directly to the backend using `NEXT_PUBLIC_API_BASE_URL` and candidate token headers.
  - Recruiter portal uses Next API routes as a BFF that forward to the backend with Auth0 access tokens.
- **UI**: Tailwind utility classes with shared primitives in `src/components/ui` (Button, Input, CodeEditor, PageHeader).
- **State**: Local React state plus a candidate session context (`CandidateSessionProvider`) that persists token/bootstrap state in `sessionStorage`; no global store.

## Domain Concepts

- **Simulation**: 5-day scenario with ordered tasks (design, code, debug, handoff, documentation).
- **Task**: Daily assignment; type drives which input (text vs code) is shown.
- **Candidate Session**: Invite token–secured session tracking status, current task, and completion.
- **Submission**: Candidate’s response per task; text and/or code payloads sent to the backend.
- **Execution Profile**: Referenced in recruiter listings as `hasReport`; not rendered in the UI yet.

## App Overview (UI)

- Marketing: Signed-in/out homepage variants with CTA links for recruiter login or demo candidate portal.
- Auth: `/login` and `/logout` pages that link to Auth0 flows; helpers build `/auth/login` and `/auth/logout` URLs.
- Candidate portal:
  - `/candidate/[token]` resolves invite, shows intro, starts simulation, fetches current task, saves drafts locally, submits tasks, and advances through the 5-day sequence.
  - `/candidate/session/[token]` redirects to the main candidate route (shim).
- Recruiter portal:
  - `/dashboard` loads recruiter profile and simulations list.
  - `/dashboard/simulations/new` creates a simulation (title, role, tech stack, seniority, optional focus).
  - `/dashboard/simulations/[id]` lists candidate sessions with status and links to submissions.
  - `/dashboard/simulations/[id]/candidates/[candidateSessionId]` shows per-task submission artifacts (text/code/test results if present) with copy/download for code.

## API Overview (Frontend usage)

- Candidate (direct to backend via `NEXT_PUBLIC_API_BASE_URL`):
  - `GET /candidate/session/{token}` bootstrap invite.
  - `GET /candidate/session/{id}/current_task` with `x-candidate-token` header.
  - `POST /tasks/{taskId}/submit` with headers `x-candidate-token` and `x-candidate-session-id`; body includes `contentText` and/or `codeBlob`.
- Recruiter (via Next API BFF requiring Auth0 session):
  - `GET /api/auth/me` (server-side in `/dashboard`).
  - `GET/POST /api/simulations`.
  - `POST /api/simulations/{id}/invite`.
  - `GET /api/simulations/{id}/candidates`.
  - `GET /api/submissions?candidateSessionId=...`.
  - `GET /api/submissions/{submissionId}`.

Auth notes:

- Recruiter routes depend on Auth0 session; middleware redirects unauthenticated users to `/auth/login?returnTo=...`.
- Candidate routes rely on the invite token + session id headers; no Auth0.

## Local Development

### Prereqs

- Node.js 18+ and npm.

### Setup

```bash
npm install
cp .env.example .env.local  # if present; otherwise set vars below
```

### Run the app

```bash
npm run dev  # http://localhost:3000
```

### Tests

```bash
npm test          # unit (Jest)
npm run test:e2e  # Playwright (see tests/e2e/playwright.config.ts)
npm run typecheck
npm run lint
```

## Configuration

Key env vars (set in `.env.local`):

- `NEXT_PUBLIC_API_BASE_URL` – backend base for candidate calls (e.g., `https://backend.example.com/api`).
- `BACKEND_BASE_URL` – backend base for recruiter BFF forwarding (default `http://localhost:8000`); no trailing slash.
- Auth0:
  - `AUTH0_SECRET`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
  - `AUTH0_AUDIENCE`, `AUTH0_SCOPE` (optional depending on tenant setup)
  - `APP_BASE_URL` (e.g., `http://localhost:3000`)

## Code Structure

- `src/app` – App Router pages and API routes (BFF forwarders).
- `src/features/candidate` – session provider, task UI, drafts, submit flow.
- `src/features/recruiter` – dashboard, simulations, invitations, candidate lists, submissions viewer.
- `src/features/auth` – login/logout pages and link helpers.
- `src/features/marketing` – marketing homepage variants.
- `src/features/shared/layout` – header/nav shell.
- `src/components/ui` – shared UI primitives (Button, Input, CodeEditor, PageHeader).
- `src/lib/api` – HTTP client and candidate/recruiter API helpers.
- `src/lib/server` – BFF forwarding helpers.
- `src/lib/storage` – candidate draft persistence helpers.

## Typical Flows

- **Candidate journey**: Open invite link → bootstrap session → intro → fetch current task → auto-save drafts (text/code) → submit with token + session headers → refresh current task → complete after 5 submissions.
- **Recruiter journey**: Auth0 login → dashboard lists simulations → create simulation → invite candidate (modal + copy invite URL) → monitor candidate list per simulation → view per-task submissions (copy/download code, view test results if present).

## Future Work / Gaps

- Candidate “Run Tests” UX is not implemented (only submit).
- Execution profile/comparison/print views are absent; `hasReport` is surfaced but not rendered.
- Broader notifications/toasts and skeleton states could improve UX.
