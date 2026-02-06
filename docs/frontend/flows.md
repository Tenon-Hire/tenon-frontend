# User Flows

## Candidate Happy Path

1. Open invite link at `/candidate/session/[token]` and sign in via Auth0 if prompted. UI states: `LoadingView`, `AuthView`, `ErrorView`. Key components: `CandidateSessionPage`, `CandidateSessionView`, `AuthView`. APIs: `GET /api/auth/access-token`, `GET /candidate/session/{token}`, `GET /candidate/session/{id}/current_task`.
2. Onboarding start screen. UI state: `StartView` with day overview and start actions. Key components: `StartView`, `StartIntro`, `StartActions`. APIs: none.
3. Day 1 text task submission. UI states: `RunningView`, editor, submit states (`idle`, `submitting`, `submitted`), error banner. Key components: `CandidateTaskView`, `TaskTextInput`, `TaskStatus`. APIs: `POST /tasks/{taskId}/submit` with `x-candidate-session-id`, then `GET /candidate/session/{id}/current_task`.
4. Day 2 GitHub-native task. UI states: workspace loading and provisioning notices, test run states (`idle`, `starting`, `running`, `passed`, `failed`, `timeout`), submit states. Key components: `WorkspacePanel`, `RunTestsPanel`, `CandidateTaskView`. APIs: `GET /tasks/{taskId}/codespace/status`, `POST /tasks/{taskId}/codespace/init`, `POST /tasks/{taskId}/run`, `GET /tasks/{taskId}/run/{runId}`, `POST /tasks/{taskId}/submit`. Run tests disables while running and persists `runId` in session storage to resume polling.
5. Day 3 GitHub-native task. UI states and APIs are the same as Day 2.
6. Day 4 handoff task. UI states: resource panel shows recording link if present, text editor for response. Key components: `ResourcePanel`, `CandidateTaskView`. APIs: `POST /tasks/{taskId}/submit`.
7. Day 5 documentation task. UI states: resource panel shows docs link if present, text editor with markdown preview. Key components: `ResourcePanel`, `CandidateTaskView`. APIs: `POST /tasks/{taskId}/submit`.
8. Completion. UI state: `CompleteView` when `isComplete` is true. Key components: `CompleteView`. APIs: none.

Notes on current behavior:

- Candidate access is enforced by middleware and Auth0 session. The invite token resolves a session but is not sufficient on its own.
- Email verification is enforced by the backend when required. The UI surfaces a 403 message but does not include a dedicated verification UI.

## Recruiter Happy Path

1. Sign in via `/auth/login`. UI states: login page, Auth0 redirect, not-authorized screen if missing permissions. Key components: `LoginPage`, `NotAuthorizedPage`. APIs: Auth0 handled by middleware and `/api/auth/access-token` for session tokens.
2. Dashboard load at `/dashboard`. UI states: profile skeleton, simulations skeleton, error messages, empty state. Key components: `RecruiterDashboardPage`, `DashboardContent`, `RecruiterSimulationList`. APIs: `GET /api/dashboard` (BFF aggregator).
3. Create simulation at `/dashboard/simulations/new`. UI states: validation errors and submit feedback. Key components: `SimulationCreatePage`, `SimulationCreateForm`. APIs: `POST /api/simulations` with `templateKey`, `title`, `role`, `techStack`, `seniority`, `focus`.
4. Invite candidates from dashboard or simulation detail. UI states: invite modal, loading/submitted toasts, error messaging. Key components: `InviteCandidateModal`, `useInviteToasts`. APIs: `POST /api/simulations/{id}/invite`.
5. Simulation detail at `/dashboard/simulations/[id]`. UI states: plan loading and error, candidates loading and empty/error, search results, resend invite cooldown. Key components: `SimulationDetailView`, `CandidatesTable`, `SimulationPlanSection`. APIs: `GET /api/simulations/{id}`, `GET /api/simulations/{id}/candidates`, `POST /api/simulations/{id}/candidates/{candidateSessionId}/invite/resend`.
6. Candidate submissions at `/dashboard/simulations/[id]/candidates/[candidateSessionId]`. UI states: submissions skeleton, empty/error states, artifact warning banner, pagination. Key components: `CandidateSubmissionsView`, `ArtifactCard`, `SubmissionsTable`. APIs: `GET /api/submissions?candidateSessionId=...`, `GET /api/submissions/{submissionId}`, and candidate verification via `GET /api/simulations/{id}/candidates`.
