# Frontend to Backend API Map

## Base Configuration

- Candidate API base: `NEXT_PUBLIC_TENON_API_BASE_URL` in `src/lib/api/client/requestCore.ts` (default `/api/backend`).
- Candidate API base is normalized in `src/features/candidate/api/base.ts` so `/api` becomes `/api/backend` to avoid clashing with BFF routes.
- Backend proxy target: `TENON_BACKEND_BASE_URL` in `src/lib/server/bff/upstream.ts` (default `http://localhost:8000`).
- Auth headers: `apiClient` and `requestWithMeta` attach `Authorization: Bearer <token>` when `authToken` is provided.
- Candidate calls add `x-candidate-session-id` for task, test, and workspace endpoints.

## Candidate Endpoints (Direct or via `/api/backend`)

- `GET /candidate/invites`
- `GET /candidate/session/{token}`
- `GET /candidate/session/{id}/current_task` with `x-candidate-session-id`
- `POST /tasks/{taskId}/submit` with `x-candidate-session-id`
- `POST /tasks/{taskId}/run` and `GET /tasks/{taskId}/run/{runId}` with `x-candidate-session-id`
- `POST /tasks/{taskId}/codespace/init` and `GET /tasks/{taskId}/codespace/status` with `x-candidate-session-id`

## Recruiter Endpoints (BFF under `/api`)

- `GET /api/dashboard` (aggregates `/api/auth/me` and `/api/simulations`)
- `GET /api/simulations` and `POST /api/simulations`
- `GET /api/simulations/{id}`
- `POST /api/simulations/{id}/invite`
- `GET /api/simulations/{id}/candidates`
- `POST /api/simulations/{id}/candidates/{candidateSessionId}/invite/resend`
- `GET /api/submissions?candidateSessionId=...`
- `GET /api/submissions/{submissionId}`

## Auth and Debug Endpoints

- `GET /api/auth/access-token`
- `GET /api/dev/access-token`
- `GET /api/debug/auth` (dev only)
