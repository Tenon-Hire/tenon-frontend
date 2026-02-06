# Local Development

## Install

```bash
npm install
```

## Run the Dev Server

```bash
npm run dev
```

Optional helper:

```bash
./runFrontend.sh
```

## Point to a Local Backend

Create `.env.local`:

```bash
TENON_BACKEND_BASE_URL=http://localhost:8000
NEXT_PUBLIC_TENON_API_BASE_URL=/api/backend
```

## Auth0 Notes

- Auth0 is required for most flows.
- Ensure your tenant includes `candidate:access` and `recruiter:access` permissions.

## Common Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:coverage`
- `npm run test:e2e`
- `./precommit.sh`

## Testing Notes

- Jest is configured with 99 percent coverage thresholds in `jest.config.mjs`.
- Playwright E2E runs via `npm run test:e2e`.
