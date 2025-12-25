Testing utilities used across integration/unit suites:

- `mockServer.ts`: lightweight fetch stub with route matching, JSON/text helpers, and lifecycle (`listen`, `use`, `resetHandlers`, `close`).
- `renderWithProviders.tsx`: renders React nodes with the candidate session provider wrapper.
- `index.ts`: barrel to import helpers from a single path (`tests/setup`).

Usage example:

```ts
import { createMockServer, jsonResponse } from 'tests/setup';

const server = createMockServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

server.use('GET', '/api/example', () => jsonResponse({ ok: true }));
```
