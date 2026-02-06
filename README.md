# Tenon Frontend

Next.js App Router (React 19 + TypeScript) UI for Tenon 5-day simulations. Candidates progress day by day via invite tokens. Recruiters create simulations, invite candidates, and review submissions and artifacts.

## Architecture
- App Router routes live in `src/app`.
- Middleware auth gating lives in `src/proxy.ts` and `middleware.ts`.
- Candidate API calls use `apiClient` or `requestWithMeta` against `NEXT_PUBLIC_TENON_API_BASE_URL` (defaults to `/api/backend`).
- Recruiter API calls use the `/api` BFF routes with Auth0 access tokens.
- Features live in `src/features`, shared UI in `src/shared`, and infra in `src/lib`.

## Quick Start
Install dependencies:
```bash
npm install
```

Run the dev server:
```bash
npm run dev
```

Point to a local backend in `.env.local`:
```bash
TENON_BACKEND_BASE_URL=http://localhost:8000
NEXT_PUBLIC_TENON_API_BASE_URL=/api/backend
```

More detail in `docs/frontend/local-dev.md`.

## Documentation
- `docs/frontend/README.md` (routes, flows, API map, config, local dev)
- `docs/README_COPY.md` (copy-paste-ready full README)

## Testing
- `npm test`
- `npm run test:coverage`
- `npm run test:e2e`
- `npm run typecheck`
- `npm run lint`

Coverage thresholds are 99 percent for statements, branches, functions, and lines in `jest.config.mjs`.

## Planned Roadmap
- See `docs/frontend/planned.md`.
