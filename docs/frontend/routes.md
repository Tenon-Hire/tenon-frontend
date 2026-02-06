# Routes and Structure

## App Router vs Pages Router

- App Router only (`src/app`).
- There is no `src/pages` directory.

## Route Index

Marketing and auth:

- `/`
- `/auth/login`
- `/auth/logout`
- `/auth/error`
- `/auth/clear`
- `/not-authorized`

Candidate:

- `/candidate/dashboard`
- `/candidate/session/[token]`
- `/candidate-sessions/[token]` (legacy redirect)

Recruiter:

- `/dashboard`
- `/dashboard/simulations/new`
- `/dashboard/simulations/[id]`
- `/dashboard/simulations/[id]/candidates/[candidateSessionId]`

API (BFF + proxy):

- `/api/backend/[...path]`
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

## Feature Code Locations

- Candidate features: `src/features/candidate`.
- Recruiter features: `src/features/recruiter`.
- Auth and marketing: `src/features/auth`, `src/features/marketing`.
- Shared UI primitives: `src/shared/ui`.
- Shared status and formatters: `src/shared/status`, `src/shared/formatters`.
- Shared hooks and notifications: `src/shared/hooks`, `src/shared/notifications`.
- API client, errors, Auth0, BFF/proxy helpers: `src/lib`.
