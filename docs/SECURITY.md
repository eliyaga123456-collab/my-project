# EAR security notes

Scope: `apps/api` (Fastify 5 + Postgres) and how web/admin/mobile are expected to use it. Everything below is
backed by tests in `apps/api/tests` unless marked *(not tested)*.

## 1. Threat model

| Asset | Threat | Mitigation |
|---|---|---|
| Sender anonymity | Recipient, admin or DB reader identifies the sender | No IP/UA/account stored with a message; only keyed hashes (`source_hash`, `device_hash`) for 30 days; never in any DTO (tested) |
| Recipient wellbeing | Harassment, threats, flooding | Layered moderation, hidden words, block, pause, rate limits, PoW, duplicate suppression, reports, admin queue |
| Accounts | Credential stuffing, brute force, takeover, enumeration | scrypt, per-IP + per-email login limits, uniform login/forgot responses, single-use hashed tokens, session revocation |
| Sessions | Theft, fixation, CSRF | Opaque 256-bit tokens (hash stored), HttpOnly+SameSite=Lax cookie, CSRF header + Origin allow-list |
| Other users' data | IDOR | Every query scoped by owner id in SQL; IDOR matrix test |
| Platform | XSS, injection, upload abuse, SSRF, DoS | JSON-only API + CSP `default-src 'none'`, parametrised SQL (Drizzle), avatar re-encoding, body/upload/page limits |
| Admin tooling | Privilege escalation | `role` read from DB per request, moderator/admin split, verified email required, audit log |

Out of scope / assumed: TLS termination and network security (reverse proxy), host hardening, Postgres access control,
email provider security, the web/admin front ends' own CSP.

## 2. Anonymity model and honest limits

* A message row holds: body, recipient, link, status, timestamps, `source_hash = HMAC(APP_SECRET, "ip:" + ip)`,
  `device_hash = HMAC(APP_SECRET, "dev:" + random device cookie)`, `body_hash`. No raw IP, no User-Agent, no account.
* Hashes are used for blocks, platform bans, flood/duplicate detection and report correlation. Admins only ever see an
  8-character prefix of the source hash (`/admin/abuse`), recipients only a 4-character label on blocks.
* Hashes are nulled by `runMaintenance` after `SOURCE_HASH_RETENTION_DAYS` (default 30); report copies after 3x that.
  After that a message can no longer be blocked (409) and a report can only be resolved as `*:source_expired`.
* **Limits, stated plainly:**
  * An IPv4 hash is brute-forceable by anyone holding `APP_SECRET` and the DB (2^32 candidates). Treat `APP_SECRET`
    + DB as a combined crown jewel; rotate the secret if it leaks (this invalidates existing blocks/bans by design).
  * Blocking an IP also blocks everyone sharing it (CGNAT, offices, VPN exits); a determined sender on a new network
    or cleared cookies returns. We do not claim to identify senders and the UI must not either.
  * Timing / content correlation: a recipient who knows who they asked can often guess the sender from wording.
    Nothing in software prevents that.
  * Logs: Fastify request logs contain IPs at the proxy/app layer. Production log retention must be short and
    access-controlled, otherwise the hashing is moot. `authorization` and `cookie` headers are redacted. *(not tested)*
  * Held ("filtered") and archived messages keep their hashes for the same window as inbox messages.

## 3. Authentication and sessions

* Passwords: scrypt (N=2^15, r=8, p=1, 16-byte salt, NFKC-normalised), 10-128 chars. Unknown emails are verified against a dummy hash to equalise timing.
* Sessions: 256-bit random token; DB stores only SHA-256 (tested). TTL 30 days, sliding renewal after half-life. Bearer (mobile, opt in with `x-client: mobile`) or cookie `unsaid_session` (`HttpOnly; SameSite=Lax; Path=/; Secure` in production).
* Login always issues a new token and never adopts a presented cookie, so session fixation is not possible (tested).
* Password change revokes all *other* sessions; the current session keeps its token (documented residual: it is not rotated). Password reset revokes all sessions and notifies the user.
* Ban revokes all sessions at once; banned users cannot log in; suspended users keep their session but cannot receive or publish.
* Email verify/reset tokens: 256-bit, hashed at rest, single use, 24 h / 1 h expiry, issuing a new one invalidates older ones (tested, including parallel redemption).
* Enumeration: login and forgot-password are uniform. **Register leaks "email may already exist" (409)** and `username-available` is public by design: known, rate limited.
* Admin routes require role from the DB (not from the token), a verified email, and are further restricted: moderators cannot ban/unban or act on admins; nobody can change their own status.

## 4. CSRF, CORS, headers

* Every non-GET/HEAD/OPTIONS request must carry `x-requested-with: unsaid` (this forces a CORS preflight for cross-site pages) and, if an `Origin` header is present, it must be in `WEB_ORIGINS`/`ADMIN_ORIGINS` (exact match; `null` is refused). Applies to bearer and anonymous calls too (tested matrix).
* CORS reflects only configured origins, with credentials; others receive no `Access-Control-*` headers.
* SameSite=Lax cookies add a second layer. `text/plain` bodies are parsed as strings and fail validation; form encodings get 415.
* Headers via helmet: `nosniff`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, HSTS in production, no `X-Powered-By`.
* All responses are JSON (or image/webp for `/media`); user text is never HTML. Front ends must keep escaping (React default) and never use `dangerouslySetInnerHTML` on message text.

## 5. Rate limits and abuse controls

| Control | Limit |
|---|---|
| Global per IP | 600 req/min (health, ready, media exempt) |
| Anonymous send | 60/h per source, **6 / 10 min per source per recipient**, 300/h per recipient |
| Proof of work | Required once a source made >=3 sends in 10 min or >=2 rejects in 1 h; HMAC-signed, 5-min expiry, single use |
| Login | 30 / 15 min per IP, 10 / 15 min per email |
| Register 8/h/IP, forgot 10/h/IP + 3/h/email, reset 10/h/IP, verify 20/h/IP, resend 3/h/user, change-password 10/h/user, avatar 10/h/user, reply 120/h, report 60/h |
| Duplicates | same source + same normalised body (24 h): dropped; >=3 stored copies from any sources: dropped. Race-free (advisory lock) |

Dropped/blocked/banned sends return the same `201 delivered` so a sender cannot probe. Rate limiting is in-memory
(single instance); with several instances use a shared store (`RateLimitStore`), otherwise limits multiply by instance count.

**`TRUST_PROXY`**: with `false` (the test default) the client IP is the socket address and `X-Forwarded-For` is ignored (tested: spoofing does not bypass limits and does not change the source hash). With `true`, any client can claim any IP by sending the header (tested to demonstrate the bypass). Set `TRUST_PROXY=true` **only** when the API is reachable exclusively through a trusted reverse proxy that overwrites/sanitises `X-Forwarded-For`. The code default is `true` for convenience behind Next.js rewrites; production deployments must make an explicit choice. The same caveat applies to the web app's server-side calls: they must forward the real client IP, not their own.

Known trade-off: the per-email login limit lets an attacker lock a victim out of password login for 15 min by spamming wrong passwords (a DoS, not a takeover). Accepted; mitigated by password reset by email.

## 6. Moderation layers

1. zod validation (length, control/bidi/zero-width stripping). 2. Rule engine with NFKC + leetspeak/spacing folding, English and Hebrew (reject >= 100, hold >= 50; enhanced mode 70/30). 3. Recipient hidden words (hold, never reject). 4. Rate limits / PoW / duplicates / blocks / platform bans. 5. Reports to an admin queue (snapshot kept after deletion). 6. Admin actions (dismiss, remove, source suspend/ban), all audited.
Public answers get a stricter moderation pass (enhanced) and need a verified email; held messages cannot be answered publicly until the owner moves them to the inbox. Rule-based moderation is bypassable by determined writers; it is a speed bump, not a classifier.

## 7. Privacy and retention

`runMaintenance` (hourly, safe on every instance): null message/device hashes older than 30 d, event hashes 30 d, report hashes 90 d; delete expired bans, sessions expired/revoked > 7 d, tokens expired > 7 d, notifications > 90 d, outbox > 3 d; lift expired pauses. Deleting a user cascades to everything they own. `audit_logs` and `moderation_events` rows are kept (no PII beyond ids; events lose hashes after 30 d). Reports retain the message text as evidence.

## 8. Uploads

Avatars only: JPEG/PNG/WebP by magic bytes (not Content-Type or filename), <= 2 MB (413), <= 40 megapixels (libvips `limitInputPixels`), decoded in strict mode and **re-encoded to 512x512 WebP**, which strips EXIF/GPS/ICC/XMP and any appended payload (tested with real EXIF GPS). SVG/HTML/ZIP/truncated/corrupt files get 415. Stored under server-generated UUID keys; `/media/*` accepts only `avatars/<uuid>.webp` (traversal variants tested), serves `nosniff`, `CSP: sandbox`, immutable cache. Only the owner can upload; max 10/h.
Residual: sharp/libvips parse untrusted images (CVE exposure); keep it updated and run the API unprivileged.

## 9. Secrets and configuration

`APP_SECRET` (>=32 chars, mandatory in production, signs hashes + PoW) - never commit, rotate on leak. `DATABASE_URL`, `SMTP_URL`, S3 keys come from the environment. `RATE_LIMIT_DISABLED=true` is refused in production. `/api/v1/dev/outbox` (returns reset/verify links without auth!) is mounted only when `NODE_ENV != production` **and** `EMAIL_TRANSPORT=outbox`; never run a publicly reachable instance with `NODE_ENV=development` (tested that production does not mount it). Seed admin password must be changed (`ADMIN_SEED_PASSWORD`).

## 10. Errors

Clients get `{code, message, requestId}` only; stack traces, SQL and driver errors are logged server-side (tested by killing the DB pool). Postgres cannot store NUL characters, so JSON bodies containing `\u0000` are rejected with 400.

## 11. Known limitations / residual risks

1. Source hash is reversible by brute force for anyone with `APP_SECRET` + DB (section 2).
2. IP-based blocking: shared-IP false positives, trivial evasion.
3. In-memory rate limiter: per-instance only; resets on restart.
4. Register endpoint reveals whether an email is registered.
5. Password change does not rotate the current session token.
6. Per-email login lockout is a DoS vector.
7. No 2FA / WebAuthn; no breached-password check; no CAPTCHA (PoW only).
8. Email-based reset is only as strong as the user's mailbox.
9. Admin accounts are plain passwords + verified email. Recommend network-restricting the admin origin and adding 2FA before production.
10. Rule-based moderation has false positives/negatives; Hebrew coverage is basic.
11. `TRUST_PROXY` default is `true`; wrong deployment = spoofable IPs.
12. Push tokens are accepted for any Expo-looking string; push payloads contain titles only (no message text).
13. No account deletion endpoint yet (cascade exists in the DB).
14. Dependencies are not scanned in CI by this suite (`npm audit` recommended).

## 12. Incident checklist

1. Contain: rotate `APP_SECRET` (invalidates PoW, blocks, bans, dedupe hashes), force logout: `update sessions set revoked_at = now() where revoked_at is null`.
2. Suspected DB leak: passwords are scrypt, tokens hashed; still force password resets (`email_tokens`) for admins first; treat source hashes as potentially reversible if `APP_SECRET` also leaked, notify users per policy.
3. Abusive source: report -> `ban_user` (source ban). Bulk: insert into `banned_sources`.
4. Abusive account: `/admin/users/:id/ban` (revokes sessions) and review `audit_logs`.
5. Rate-limit storm: check `/admin/health` counters, tighten proxy limits, verify `TRUST_PROXY`.
6. Evidence: reports keep message text; `audit_logs` records who did what.
7. After: write a post-mortem, add a regression test in `tests/integration/security.test.ts`.
