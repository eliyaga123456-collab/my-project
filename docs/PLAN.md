# Unsaid — Product & Engineering Plan

Unsaid is an original anonymous Q&A product: create a personal link, share it, receive anonymous
messages, manage them in an inbox, reply publicly with share cards. It is inspired by the *category*
(anonymous Q&A) only — name, brand, design, copy and code are our own.

## 1. Requirements analysis (summary)
| Area | Must have |
|---|---|
| Accounts | email+password, verify email, reset password, sessions list/revoke, logout |
| Profile | username, display name, avatar, bio, custom prompt, link `/u/:username` |
| Core | public page → anonymous message → inbox (reply, share, delete, report, block) |
| Safety | layered moderation, hidden words, block, pause link, enhanced mode, reports |
| Abuse | rate limits, flood detection, duplicate detection, proof-of-work challenge, source hashing |
| Notifications | in-app, push (Expo), email — behind one abstraction, with preferences |
| Admin | overview, users (search/suspend/ban), reports queue, moderation events, abuse, health |
| Platforms | web (responsive), mobile (Expo iOS/Android), API, Postgres |

## 2. Architecture decisions
- **Monorepo (npm workspaces)**: `apps/{api,web,admin,mobile}`, `packages/{shared,api-client,tokens}`.
  One contract (`@unsaid/shared` zod schemas + DTO types) and one typed client (`@unsaid/api-client`)
  keep web, admin and mobile consistent with the server.
- **Backend: Fastify 5 + TypeScript** (chosen over NestJS/Next route handlers): fast, schema-first,
  tiny footprint, explicit plugins for security headers/rate-limit; NestJS adds DI ceremony we don't need,
  and a standalone API lets mobile + web + admin share it without Next coupling.
- **DB: PostgreSQL 16 + Drizzle ORM** (chosen over Prisma): SQL-first migrations, no engine binary,
  typed queries, works in constrained environments. Plain SQL migrations are checked in.
- **Auth**: server-side opaque sessions (256-bit random token, stored as SHA-256 hash) — revocable,
  no JWT pitfalls. Web uses `HttpOnly; SameSite=Lax; Secure` cookie (+ CSRF header & Origin check);
  mobile uses the same token as a Bearer credential kept in the OS keystore. Passwords: scrypt (N=2^15) with per-user salt.
- **Web: Next.js (App Router) + Tailwind**, SSR for public profile pages (SEO + share previews), `next/og` for share cards.
- **Admin: Vite + React SPA** deployed separately (own origin) — admin routes also require `role` ∈ {admin, moderator} server-side.
- **Mobile: Expo (React Native) + expo-router**, SecureStore, expo-notifications, deep links `unsaid://u/:username`.
- **Storage**: `StorageProvider` interface; local-disk driver for dev, S3-compatible driver for production (env-selected).
- **Notifications**: `NotificationService` → channels `inApp | push | email` implementing `Channel`; preferences gate each channel.
- **Rate limiting**: sliding-window `RateLimitStore` interface; in-memory default, Redis-ready for multi-instance (documented).

## 3. Privacy model (anonymity)
- The recipient never receives sender IP, UA, account, or internal IDs. Message IDs exposed to clients are random UUIDs unrelated to senders.
- For abuse control we store **only** `source_hash = HMAC-SHA256(server_secret, ip || stable-day-bucket)` (rotated keys supported) — used for blocking, flood detection and report correlation. It is not reversible without the secret and is never shown to recipients; admins see only a short truncated reference.
- "Block" blocks that *source hash* — honest limitation: a determined sender on a new network can return; we say so in the UI/docs and do **not** claim to identify senders.
- Retention: source hashes are nulled after 30 days (cron `purgeOldSourceHashes`), messages deleted with accounts (cascade).

## 4. Moderation layers
1. **Client validation** (length, trim) — UX only.
2. **Server validation** (zod) — authoritative.
3. **Automated moderation** — rule engine (categories: harassment, threat, hate, sexual, self_harm, personal_info, dangerous, spam) → `allow | hold | reject`; `hold` lands in the recipient's *Filtered* folder; enhanced mode lowers thresholds.
4. **Rate limiting & flood/duplicate detection**, proof-of-work challenge on risk.
5. **User controls**: hidden words, block, pause link, report.
6. **Admin moderation**: reports queue with remove/suspend/ban; all actions audited.

## 5. Milestones (phases)
| # | Phase | Output |
|---|---|---|
| 1 | Planning | this doc |
| 2 | Architecture | monorepo, contracts (`shared`, `api-client`), `docs/API.md` |
| 3 | Design system | tokens, components (web + mobile), `docs/DESIGN.md` |
| 4 | Database | schema, migrations, seeds |
| 5 | Backend | all endpoints, moderation, notifications, admin |
| 6 | Web | landing, auth, public page, inbox, settings, share cards |
| 7 | Mobile | Expo app (auth, inbox, share, push, deep links) |
| 8 | Admin | dashboard |
| 9 | Moderation & safety | rules + tests, controls UI |
| 10 | Testing | unit, integration, e2e, security tests |
| 11 | Security review | findings fixed, `docs/SECURITY.md` |
| 12 | Performance & deployment | Dockerfiles, compose, CI, `docs/DEPLOYMENT.md` |
| 13 | Final QA | `FINAL_REPORT.md` |

## 6. Dependencies
shared → api-client → (web, admin, mobile). DB schema → backend. Backend contract (`docs/API.md`) → all clients.
Postgres required for API integration tests (local `scripts/db-up.sh` or docker compose).

## 7. Threats & edge cases (tracked)
- Account enumeration: login/forgot/register return uniform responses/timing where feasible; verification & reset tokens single-use, hashed, expiring.
- IDOR: every message/link/block query is scoped by `owner_id` in SQL; admin routes by role. Tested.
- XSS: all user text rendered as text (React escaping); CSP; no `dangerouslySetInnerHTML`; OG image text escaped.
- CSRF: cookie auth requires `x-requested-with` header + Origin allow-list for mutating requests.
- Flood: per-source per-recipient & global limits, duplicate suppression (normalized hash/24h), PoW when risk score high.
- Unicode abuse: normalization (NFKC), zero-width/bidi stripping, leetspeak/obfuscation folding in moderation.
- Self-harm messages: not auto-rejected silently — held and the recipient sees supportive resources in the Filtered folder.
- Paused/suspended/banned recipients: sender gets a neutral message, nothing is stored when paused.
- Deleted accounts / renamed usernames: old links 404 (documented); primary slug = username.
- Uploads: magic-byte sniffing, size cap, re-encode not trusted → served with `nosniff`, immutable names, no SVG.
- Clock/timezone: all times UTC ISO-8601.

## 8. Test plan
Unit (validation, moderation, pow, rate-limit, crypto) • Integration (auth, messages, reports, blocks, admin, IDOR) against real Postgres •
E2E (Playwright: register → login → link → anonymous send → inbox → report/delete) • Security (injection, XSS payloads, CSRF, invalid tokens, session abuse, upload abuse, rate-limit bypass) • Mobile (typecheck + component tests; device tests documented).
