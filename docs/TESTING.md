# Testing EAR

## Prerequisites
* Node 22+, `npm install` at the repo root.
* Postgres on localhost (`bash scripts/db-up.sh`, idempotent). Tests use database `unsaid_test` (override with `TEST_DATABASE_URL`); the dev DB `unsaid` is never touched. `tests/global-setup.ts` runs the migrations.

## Run
```bash
cd apps/api
npx vitest run                      # everything (~1-2 min; files run serially because they share one DB)
npx vitest run tests/integration/security.test.ts
npx vitest run -t "IDOR"            # by name
npx tsc --noEmit -p apps/api        # from repo root: typecheck src + tests
```
Env for tests is fixed in `apps/api/vitest.config.ts` (`TRUST_PROXY=false`, `POW_DIFFICULTY=8`, outbox email, `RATE_LIMIT_DISABLED=true` by default in `createTestApp`; pass `{ RATE_LIMIT_DISABLED: "false" }` to exercise limits).

## Suites (apps/api/tests)
| File | Covers |
|---|---|
| `unit/moderation.test.ts` | normalisation, rule engine, thresholds, hidden words |
| `integration/auth.test.ts` | register/login/verify/reset/sessions |
| `integration/messages.test.ts` | anonymous send flow, paused/closed/unknown, moderation outcomes, duplicates, blocks, platform bans, inbox + pagination, rate limits + proof of work, replies/public answers, reports, notifications, rounds |
| `integration/admin.test.ts` | role guards, overview numbers, user search (injection/wildcards), suspend/ban/unban, reports resolution, audit logs, events, abuse, health |
| `integration/security.test.ts` | IDOR matrix, XSS/SQLi/NUL/unicode, malformed ids/cursors/bodies, avatar upload abuse + EXIF stripping, media traversal, CORS/CSRF, sessions/tokens, brute force, TRUST_PROXY, error leakage, DTO leak checks, production config, concurrency races |
| `integration/retention.test.ts` | `runMaintenance` privacy retention and housekeeping |

Helpers: `tests/integration/helpers.ts` (`createTestApp`, `register`, `verifiedUser`, `makeAdmin`, `send`, `api`, `solvePow`, `multipart`, `waitFor`). Tests are real HTTP-in-process (`app.inject`) against real Postgres; there are no mocks. Each test starts from a truncated database. Notification delivery is fire-and-forget, so tests use `waitFor`.

## Adding a test
Prefer an integration test through `api(...)`. When you find a bug, add the failing test first, fix minimally in `apps/api/src`, and note it in the PR.

## E2E (Playwright, browser)
E2E lives with the web app (outside apps/api). Typical run, with the three dev servers up (API :4000, web :3000, admin :3100):
```bash
bash scripts/db-up.sh
npm run dev -w @unsaid/api &  npm run dev -w @unsaid/web &  npm run dev -w @unsaid/admin &
npx playwright test            # from the directory that owns playwright.config.ts
```
Flow covered by the plan: register -> verify -> link -> anonymous send -> inbox -> reply/report/delete. E2E must use a separate database (set `DATABASE_URL` for the API process) and `RATE_LIMIT_DISABLED=true`. I could not verify the E2E suite from this workspace; check the web app's package for the exact script names.

## Not covered / manual
Real SMTP and Expo push delivery, S3 storage driver, multi-instance rate limiting, browser rendering of untrusted text (front-end CSP), load testing, dependency audit (`npm audit`), mobile device tests.
