# Tenon Frontend Docs

These documents describe the current frontend implementation and how it maps to backend APIs. They are derived from the codebase and kept intentionally concrete.

## Structure Summary
- App Router only under `src/app` (no Pages Router).
- Feature modules live in `src/features` for candidate, recruiter, auth, and marketing.
- Shared UI, hooks, and utilities live in `src/shared`.
- API client, Auth0 helpers, and server BFF/proxy live in `src/lib`.
- Auth gating is enforced by middleware in `src/proxy.ts` and `middleware.ts`.

## Contents
- `docs/frontend/routes.md` (routes and feature layout)
- `docs/frontend/flows.md` (candidate and recruiter flows)
- `docs/frontend/api-map.md` (frontend to backend endpoints)
- `docs/frontend/config.md` (environment variables and runtime config)
- `docs/frontend/local-dev.md` (local dev and testing)
- `docs/frontend/planned.md` (planned or incomplete UI)
- `docs/README_COPY.md` (copy-paste-ready full README)
