# Performance Results & How to Measure

## How to enable perf logging

- Set `NEXT_PUBLIC_TENON_DEBUG_PERF=1` (env or `.env.local`) before running `npm run dev` or `npm run build`.
- Logs you’ll see:
  - `[perf:web-vitals]` LCP/INP/CLS (already wired).
  - `[api][perf]` per-request timings; `cache: "memory"` / `cache: "dedupe"` indicate in-flight dedupe hits.
  - `[perf:ui]` client-side marks around candidate task bootstrap/fetch.

## Manual before/after checklist (do this in Incognito with DevTools open)

1. For each key route:
   - Candidate invite verify `/candidate-sessions/[token]`
   - Candidate session `/candidate/session/[token]` (Day1 + Day2/Day3)
   - Recruiter dashboard `/dashboard`
   - Simulation detail candidates table `/dashboard/simulations/[id]`
   - Candidate artifacts/submissions `/dashboard/simulations/[id]/candidates/[candidateSessionId]`
   - Fit Profile view: **not present in this frontend** (N/A). If added later, measure similarly.
2. In DevTools > Network: check **Disable cache**, reload, and record:
   - Total requests, duplicate GETs (should be minimal because of TTL/dedupe).
   - Waterfall start times (candidates + submissions now fetch in parallel).
3. In DevTools > Performance or Lighthouse:
   - Capture LCP, INP, CLS. Ensure skeletons hold layout (no large shifts).
   - Note “First Contentful Paint” and “JS total” for regressions.
4. Record UI responsiveness:
   - Run Tests panel responsiveness (already instrumented).
   - Candidate workspace panel: only refreshes on user click; no polling loops.
   - Codespace polling: **not applicable / not found** in this app.

## Bundle sizes (route-level JS, client chunk only)

Measured via `.next/static/chunks/app/.../page-*.js` (KB, rounded).

| Route                           | Baseline (before PR) | After (this PR) | Notes                                                                                                    |
| ------------------------------- | -------------------- | --------------- | -------------------------------------------------------------------------------------------------------- |
| Candidate verify                | 1 KB                 | 1 KB            | No change                                                                                                |
| Candidate session               | 46 KB                | 46 KB           | Same chunk; perf marks already present                                                                   |
| Recruiter dashboard             | 14 KB                | 14 KB           | Request dedupe reduces refetches                                                                         |
| Simulation detail               | 31 KB                | 31 KB           | Slightly smaller; same UI                                                                                |
| Candidate submissions/artifacts | 21 KB                | 26 KB           | Main chunk grew with pagination/debounce, but Markdown/remark now lives in a lazy chunk loaded on demand |

How to reproduce:

- `npm run analyze`
- Open `.next/analyze/client.html` for a visual diff; route chunks above come from the `page-*.js` entries under `.next/static/chunks/app/...`.
- To compare with `main`/baseline, run `npm run analyze` on that branch and re-run the table script in this file (or the one in the PR description).

## What changed (perf-focused)

- **Request efficiency:** In-flight GET dedupe + 8–12s TTL cache in `httpClient`; recruiter dashboard, simulation detail, and candidate submissions now use the shared client. Refresh buttons pass `skipCache` to force refetch.
- **Waterfall reduction:** Candidate submissions loads candidate context and submission list in parallel; artifacts fetch reuse dedupe keys.
- **Code splitting:** Markdown/remark renderer on recruiter artifacts is now dynamically imported; heavy text rendering stays off the initial chunk.
- **UI responsiveness:** Simulation candidate search is debounced (≈180ms) to avoid re-filter churn; submissions list paginated (8 per page) to avoid long DOM renders.
- **CLS polish:** Skeletons and list pagination keep layout stable on recruiter artifacts/detail pages; candidate session skeleton already sized.

## Quick measurement playbook (copy/paste)

- `NEXT_PUBLIC_TENON_DEBUG_PERF=1 npm run dev`
- Open route, run Lighthouse (mobile, clear storage). Record LCP/INP/CLS + “JS total”.
- DevTools Network (disable cache): count requests and note `[api][perf]` cache hits.
- Optional bundle check: `npm run analyze` → open `.next/analyze/client.html` and screenshot key routes.
