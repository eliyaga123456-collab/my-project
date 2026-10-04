# EAR API (v1)

Base: `{API_URL}/api/v1` · JSON · UTC ISO-8601 timestamps · schemas in `packages/shared/src/schemas.ts`,
DTOs in `packages/shared/src/types.ts`, typed client in `packages/api-client`.

## Conventions
- **Language**: send `x-lang: en|he` (or rely on `Accept-Language`). Error messages, emails and notification text come back in that language.
- **Auth**: session token. Web = `HttpOnly` cookie `unsaid_session` (set on register/login). Mobile = send `x-client: mobile`
  → token also returned in the body (`AuthResultDto.token`); send `Authorization: Bearer <token>`.
- **CSRF**: every state-changing request must include header `x-requested-with: unsaid` (the client does) and, when sent
  from a browser, an `Origin` in `WEB_ORIGINS`/`ADMIN_ORIGINS`.
- **Errors**: `{ "error": { "code", "message", "details?", "requestId", "retryAfterSeconds?" } }`.
  Codes: `validation_error`(400/422) `unauthorized`(401) `forbidden`(403) `not_found`(404) `conflict`(409)
  `rate_limited`(429) `challenge_required`(428) `moderation_rejected`(422) `link_paused`(423) `account_suspended`(403)
  `email_not_verified`(403) `payload_too_large`(413) `unsupported_media`(415) `server_error`(500).
  Validation `details` = `{ field: [messages] }`.
- **Pagination**: cursor based. `?cursor=&limit=` → `{ items, nextCursor }`.
- **IDs**: UUIDv4. Sender identity is never exposed.

## Auth
| Method & path | Body | Result |
|---|---|---|
| POST `/auth/register` | `{email,password,username,displayName?}` | 201 `AuthResultDto` (+cookie). Sends verification email. |
| POST `/auth/login` | `{email,password}` | 200 `AuthResultDto` |
| POST `/auth/logout` | – | 204 (revokes current session) |
| GET `/auth/me` | – | `MeDto` |
| POST `/auth/verify-email` | `{token}` | 204 |
| POST `/auth/resend-verification` | – | 204 |
| POST `/auth/forgot-password` | `{email}` | 204 always (no enumeration) |
| POST `/auth/reset-password` | `{token,password}` | 204 (revokes all sessions) |
| POST `/auth/change-password` | `{currentPassword,newPassword}` | 204 (revokes other sessions) |
| GET `/auth/sessions` · DELETE `/auth/sessions/:id` | – | `{items: SessionDto[]}` · 204 |
| GET `/auth/username-available?username=` | – | `{available}` |

Unverified accounts can use the app but cannot publish public answers; admin requires verified email.

## Profiles & links
| | | |
|---|---|---|
| GET `/profiles/:username` | public | `PublicProfileDto` (counts a view) · 404 if unknown/banned |
| GET `/profiles/:username/answers?cursor=` | public | `Page<AnswerDto>` |
| GET `/answers/:id` | public | `AnswerDto` (public answers only) |
| GET `/links/public/:slug` | public | `PublicProfileDto` for an extra link |
| PATCH `/profile` | `{displayName?,bio?,prompt?}` | `ProfileDto` |
| PATCH `/profile/username` | `{username}` | `ProfileDto` (old link stops working; 1 change / 7 days) |
| POST `/profile/avatar` | multipart `file` (jpeg/png/webp ≤2MB) | `ProfileDto` |
| DELETE `/profile/avatar` | – | `ProfileDto` |
| GET `/links` | – | `{items: LinkDto[]}` (primary first) |
| POST `/links` | `{label, prompt?, closesAt?}` | `LinkDto` — a **round**: own question and optional closing time (max 10 links) |
| PATCH `/links/:id` | `{label?,paused?,prompt?,closesAt?}` | `LinkDto` (set `closesAt` to reopen/extend, `null` = never closes) |
| DELETE `/links/:id` | – | 204 (primary cannot be deleted) |
| POST `/link/pause` | `{paused,until?}` | `LinkDto` (primary link) |
| GET `/media/:key` | public | avatar bytes (`nosniff`, immutable cache) |

`LinkDto.url` = `{WEB_URL}/u/{username}` (primary) or `{WEB_URL}/l/{slug}`.

## Messages
| | | |
|---|---|---|
| POST `/public/view` | `{username}` or `{slug}` | 204 — counts a visit (called from the browser so the real address is used) |
| GET `/public/challenge` | public | `ChallengeDto` (proof of work) |
| POST `/messages` | `SendMessageInput` | 201 `{status:"delivered"}` — also returned when the message was *held* by moderation (sender can't tell) |
| GET `/messages?status=inbox\|filtered\|archived&linkId&cursor&limit` | auth | `Page<MessageDto>` (`linkId` = one round) |
| GET `/messages/:id` | auth | `MessageDto` |
| PATCH `/messages/:id` | `{read?,status?}` | `MessageDto` |
| DELETE `/messages/:id` | auth | 204 |
| POST `/messages/:id/reply` | `{text,public}` | `MessageDto` (public ⇒ creates answer, share URL `/a/:answerId`) |
| DELETE `/messages/:id/reply` | – | `MessageDto` |
| POST `/messages/:id/report` | `{reason,details?}` | 201 (idempotent per user+message) |
| POST `/messages/:id/block` | – | 201 `BlockDto` (blocks the anonymous *source*; message is archived) |
| GET `/blocks` · DELETE `/blocks/:id` | | `{items}` · 204 |

**Send flow (server)**: validate → recipient lookup → paused/suspended check (423/404) → rate limits
(per source/recipient/global; 429) → risk score → if high: require `challenge` (428 `challenge_required` + `ChallengeDto` in `details.challenge`)
→ block check (silently accepted but dropped) → duplicate check → hidden words → moderation (`reject` ⇒ 422 `moderation_rejected`, `hold` ⇒ Filtered folder) → store → notify (respecting prefs).

## Safety, settings, notifications, analytics
| | | |
|---|---|---|
| GET/PATCH `/settings` | `UpdateSettingsInput` (incl. `locale: en|he`) | `SettingsDto` |
| GET/POST `/hidden-words`, DELETE `/hidden-words/:id` | `{word}` | `{items}` / `{id,word}` / 204 |
| GET `/notifications?cursor` | auth | `Page<NotificationDto> & {unread}` |
| POST `/notifications/read` | `{ids}` or `{all:true}` | 204 |
| POST `/push-tokens` · DELETE `/push-tokens` | `{token,platform}` | 204 |
| GET `/analytics/me?days=14` | auth | `AnalyticsDto` |

## Admin (`role` admin|moderator; destructive actions need admin)
`GET /admin/overview` · `GET /admin/users?q&status&cursor` · `GET /admin/users/:id` ·
`POST /admin/users/:id/{suspend,unsuspend,ban,unban}` `{note?}` (`unban`: admin only) · `GET /admin/reports?status` ·
`POST /admin/reports/:id/resolve` `{action: dismiss|remove_message|suspend_user|ban_user, note?}` — user actions apply to the **anonymous source** (keyed hash, `banned_sources`; suspend = 7 days) since senders have no account ·
`GET /admin/moderation-events` · `GET /admin/audit-logs` · `GET /admin/abuse` · `GET /admin/health`.
All admin mutations are written to `audit_logs`.

## Ops
`GET /health` (liveness) · `GET /ready` (DB check) — outside the `/api/v1` prefix.
