# Working agreements

- Status/UI: use `statusMeta` + `StatusPill` for status chips and `deriveTestStatus` for test results so wording/tones stay consistent.
- API clients: candidate flows use `apiClient` / `requestWithMeta`; recruiter flows use `recruiterBffClient` / `httpResult`. Avoid direct `fetch` or `httpRequestWithMeta` in feature code.
- Size guardrail: keep new components/hooks/utils/api modules at or below 100 LOC; add a short comment if a file must be larger.
