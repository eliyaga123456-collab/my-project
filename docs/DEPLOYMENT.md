# EAR - free-tier public deployment

> **Free-tier limits change often - verify on each provider's pricing page before relying on them.** Every number below comes from memory, is **unverified**, and may be out of date (written 2026-10; web search was not available).

## 1. Recommended stack (and why)

| Part | Service | Why |
|---|---|---|
| Web (Next.js) | **Vercel Hobby** | Zero-config Next.js, global CDN, free HTTPS, rewrites proxy `/api/v1` and `/media` so the browser stays same-origin (cookies just work). Hobby is for **non-commercial** use only. Alternative: Cloudflare Pages (needs an adapter; not set up here). |
| Admin (Vite SPA) | **Vercel Hobby** (2nd project) | Static, same rewrite trick. |
| API (Fastify) | **Render free web service** (Docker) | Runs our Dockerfile as-is, free TLS, `render.yaml` blueprint. Sleeps after ~15 min idle (cold start ~30-60 s; in-memory rate limiter resets). Alternatives: Koyeb (`deploy/koyeb.md`), Fly.io. |
| Postgres | **Neon free** | Real Postgres, no 30-day expiry (Render's free DB expires), point-in-time restore window, scale-to-zero compute. Alternative: Supabase free (pauses after inactivity). |
| Media (avatars) | **Cloudflare R2** (S3-compatible) | Free tier with no egress fees; free hosts have ephemeral disks, so `STORAGE_DRIVER=local` would lose avatars on every deploy/restart. |
| Email | **Brevo** SMTP (or Resend / Gmail app password) | Needed for verify-email and password reset. |

Typical limits (unverified): Vercel Hobby ~100 GB bandwidth/mo, non-commercial; Render free 750 instance-hours/mo, 512 MB RAM, sleeps when idle; Neon free ~0.5 GB storage per project, compute suspends after ~5 min idle; R2 ~10 GB storage; Brevo ~300 emails/day; Gmail ~500 emails/day with an app password (2FA required, may be blocked as "less secure").

## 2. Architecture

```
Browser -> https://ear.vercel.app  (Vercel: Next.js)
             |  rewrites /api/v1/*, /media/*  (API_URL baked at build)
             v
          https://ear-api.onrender.com (Render, Docker, Fastify) -> Neon Postgres
                                                                  -> R2 (avatars)
Browser -> https://ear-admin.vercel.app (Vercel static SPA, same rewrites) -> same API
```
Same-origin proxying means the session cookie belongs to the Vercel domain; `SameSite=Lax; Secure` works with no CORS/third-party-cookie problems. The mobile app calls the API directly via `EXPO_PUBLIC_API_URL`.

## 3. Step by step

### 3.1 Accounts to create (all free, no card normally required - check)
1. GitHub (push this repo to a GitHub repository; Vercel and Render deploy from it).
2. Neon (neon.tech), 3. Render (render.com), 4. Vercel (vercel.com, "Hobby"), 5. Cloudflare (R2 may ask for a payment method even on the free tier - verify), 6. Brevo (brevo.com) or another SMTP provider.

### 3.2 Generate secrets locally
```bash
openssl rand -hex 32     # -> APP_SECRET   (keep it; changing it breaks anonymised source hashes)
openssl rand -base64 18  # -> ADMIN_SEED_PASSWORD (never use the default)
```

### 3.3 Database (Neon)
1. New project, region close to your Render region (e.g. both EU or both US-East).
2. Connection details: copy the **direct** (non-pooled) connection string, e.g. `postgres://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`. Use the direct URL for the API: migrations take a `pg_advisory_lock` and run multi-statement SQL, which does not work reliably through the pooled PgBouncer endpoint (`-pooler` in host name). The API's own pool is small, so direct is fine on free.
3. Neon compute suspends when idle; the first query after idle takes ~1 s extra.

### 3.4 Storage (Cloudflare R2)
1. R2 > Create bucket `ear-media`.
2. Make it readable: enable the `r2.dev` public URL (or attach a custom domain). Set `S3_PUBLIC_BASE_URL` to it. If you leave `S3_PUBLIC_BASE_URL` unset, the API serves media through `/media/<key>` itself (works, but uses API bandwidth and cold-starts).
3. R2 > Manage API tokens > Create token with Object Read & Write on that bucket. Note Access Key ID, Secret, and the account S3 endpoint `https://<accountid>.r2.cloudflarestorage.com`.
4. (Supabase Storage S3 alternative: endpoint `https://<project>.storage.supabase.co/storage/v1/s3`, region as shown in its settings, keys from its S3 settings.)

### 3.5 Email (Brevo)
SMTP & API > SMTP: create an SMTP key. Verify a sender address/domain. Then:
`SMTP_URL=smtps://<login>:<smtp-key>@smtp-relay.brevo.com:465` (URL-encode special characters in the login/key), `EMAIL_FROM="EAR <your-verified-sender@domain>"`. Gmail alternative: `smtps://you%40gmail.com:<app-password>@smtp.gmail.com:465`. Without working email nobody can verify or reset passwords (`EMAIL_TRANSPORT=smtp`).

### 3.6 API on Render
1. Render > New > **Blueprint** > connect the GitHub repo, blueprint path `deploy/render.yaml` (or New > Web Service > Docker, Dockerfile `apps/api/Dockerfile`, context `.`, plan **Free**, health check `/health`).
2. Fill the `sync: false` env vars from the table below. Initially you do not know the Vercel URLs: use placeholders, finish 3.7, then update `WEB_URL`, `WEB_ORIGINS`, `ADMIN_ORIGINS` and redeploy.
3. Deploy. Migrations run on boot (`AUTO_MIGRATE=true`). Check `https://<api>/health` and `/ready`.
4. Note the API URL, e.g. `https://ear-api.onrender.com`.

### 3.7 Web + Admin on Vercel
**Web:** Add New Project > import repo > **Root Directory `apps/web`**, tick "Include source files outside of the Root Directory". Framework Next.js (`apps/web/vercel.json` sets install/build). Environment variables: `API_URL=https://ear-api.onrender.com`, `NEXT_PUBLIC_SITE_URL=https://<your-web>.vercel.app` (both are build-time: redeploy after changing). 

**Admin:** Vercel rewrites cannot read env, so generate the config and commit it:
```bash
API_URL=https://ear-api.onrender.com node deploy/gen-vercel-config.mjs admin
git add apps/admin/vercel.json && git commit -m "admin: point rewrites at API" && git push
```
(committed file currently contains the placeholder `https://your-api.onrender.com` - you must regenerate it). New Project > same repo > Root Directory `apps/admin`, include files outside root. No env vars needed. The admin SPA is same-origin to its own Vercel domain, which is why `ADMIN_ORIGINS` must list it.

### 3.8 Back to Render: final URLs
Set `WEB_URL`, `WEB_ORIGINS` = web URL; `ADMIN_ORIGINS` = admin URL; `API_URL` = Render URL; redeploy.

### 3.9 First admin
Render shell is not on the free plan, so run the seed from your laptop against the Neon DB:
```bash
cd <repo> && npm ci
DATABASE_URL='<neon direct url>' NODE_ENV=production APP_SECRET=<same secret> \
ADMIN_SEED_EMAIL=you@example.com ADMIN_SEED_PASSWORD='<strong password>' \
npm run db:seed -w @unsaid/api
```
It refuses to run in production with the default password. Then log in at the admin URL. Change the password afterwards if it passed through shell history.

### 3.10 Smoke test
```bash
WEB_URL=https://<web>.vercel.app API_URL=https://ear-api.onrender.com scripts/smoke.sh
```
Manual curls: `curl https://<api>/health`, `curl https://<api>/ready`, `curl -i https://<web>/api/v1/profiles/nobody_here` (expect 404 JSON `{"error":{...}}`), `curl -I https://<web>/install`, `curl -I https://<web>/manifest.webmanifest`, `curl -I https://<web>/` (CSP, HSTS, nosniff, X-Frame-Options). Then in a browser: sign up -> receive the verification mail -> log in -> upload an avatar (check it survives an API redeploy) -> send an anonymous message from a private window.

## 4. Environment variable table

| Var | Where | Value |
|---|---|---|
| NODE_ENV | API | `production` |
| AUTO_MIGRATE | API | `true` |
| APP_SECRET | API | `openssl rand -hex 32` (required in prod) |
| DATABASE_URL | API | Neon direct URL with `?sslmode=require` |
| WEB_URL | API | `https://<web>.vercel.app` |
| API_URL | API | `https://<api>.onrender.com` |
| WEB_ORIGINS | API | web origin(s), comma separated, no trailing slash |
| ADMIN_ORIGINS | API | admin origin(s) |
| TRUST_PROXY | API | `true` - only correct because Vercel and Render sit in front; never expose the API directly with it on |
| COOKIE_SECURE | API | `true` (also the default in production) |
| EMAIL_TRANSPORT / EMAIL_FROM / SMTP_URL | API | `smtp` / `"EAR <sender>"` / `smtps://user:key@host:465` |
| STORAGE_DRIVER | API | `s3` |
| S3_BUCKET | API | `ear-media` |
| S3_REGION | API | `auto` (R2) |
| S3_ENDPOINT | API | `https://<accountid>.r2.cloudflarestorage.com` (path-style is enabled automatically when set) |
| S3_PUBLIC_BASE_URL | API | optional public bucket URL (else served via `/media`) |
| AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY | API | R2 token (read by the AWS SDK default credential chain; the code has no S3_KEY vars) |
| POW_DIFFICULTY, SOURCE_HASH_RETENTION_DAYS, EXPO_PUSH_ENABLED | API | defaults fine (16 / 30 / true) |
| RATE_LIMIT_DISABLED | API | must stay unset (the server refuses it in production) |
| ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD | seed command only | your email / strong password |
| API_URL, NEXT_PUBLIC_SITE_URL (+ optional NEXT_PUBLIC_CONTACT_EMAIL, NEXT_PUBLIC_SAFETY_EMAIL, NEXT_PUBLIC_IOS_APP_URL, NEXT_PUBLIC_ANDROID_APP_URL) | Web (Vercel, build-time) | see 3.7 |
| EXPO_PUBLIC_API_URL, EXPO_PUBLIC_WEB_URL | Mobile build | API and web URLs |

Leave `PORT` unset on Render only if it injects `PORT` (it does); the image defaults to 4000.

## 5. Free-tier gotchas
- **Cold starts**: Render free sleeps after ~15 min; first visitor waits ~30-60 s. Ping `https://<api>/health` every ~10 min with a free monitor (UptimeRobot, cron-job.org, GitHub Actions cron). Check the provider's terms; an always-on ping may use up the monthly instance hours (750 h roughly covers one always-on service).
- **In-memory rate limiter** resets on restart and is per-instance; acceptable for one instance, not a hard abuse barrier. PoW and source hashing are DB-backed.
- **Ephemeral disk**: never use `STORAGE_DRIVER=local` publicly.
- **Neon**: storage cap, compute auto-suspend, use the direct URL for migrations; pooled URL is fine for apps that don't use advisory locks.
- **Supabase** (if chosen instead): projects pause after a week of inactivity.
- **Vercel Hobby**: non-commercial use only; `API_URL` change needs a rebuild; rewrite proxy timeouts apply to slow cold starts (first request may 504; retry).
- Web `/api/share-card` and OG images run as serverless functions with execution limits.
- Build note: `apps/api` is bundled with esbuild (`npm run build -w @unsaid/api` -> `dist/app/server.js`) because the sources use extensionless imports and `@unsaid/shared` ships as TypeScript. Migrations are resolved relative to that file; do not move the output path.

## 6. Custom domain later
Buy a domain, add it in Vercel (web) and update `WEB_URL`, `WEB_ORIGINS`, `NEXT_PUBLIC_SITE_URL` (redeploy web), put admin on `admin.<domain>` (update `ADMIN_ORIGINS`), optionally an API custom domain on Render (update `API_URL`, regenerate admin vercel.json, redeploy web). Add SPF/DKIM DNS records for your SMTP sender.

## 7. PWA install
The web app ships `manifest.webmanifest` and a service worker (production only). Installing needs **HTTPS**: both `*.vercel.app` and custom domains qualify. Chrome/Edge: install icon in the address bar; Android: menu > Install app; iOS Safari: Share > Add to Home Screen. See `/install` on the site. This is the zero-cost "mobile app".

## 8. Expo mobile without app stores
- Dev/testing: `npm run dev:mobile`, scan the QR with **Expo Go** (set `EXPO_PUBLIC_API_URL` to the Render URL first). Some native modules (push notifications) are limited in Expo Go.
- Android APK sharing: `npx eas-cli build -p android --profile preview` (set `"distribution": "internal"` in an `eas.json` you create) - EAS free tier has a monthly build quota and queues (unverified). iOS internal distribution requires a paid Apple Developer account; there is no free route besides Expo Go/PWA.
- Needs `EXPO_PUBLIC_EAS_PROJECT_ID` after `eas init`.

## 9. Backups
- Neon free keeps a short point-in-time-restore history (unverified, ~hours-days): Branches > Restore.
- Own copy (also protects against account loss): 
```bash
pg_dump "$DATABASE_URL" --no-owner -Fc -f ear-$(date +%F).dump     # restore: pg_restore --no-owner -d <url> file
```
Run weekly from cron or a scheduled GitHub Action storing the dump as an encrypted artifact (do not commit it - it contains user data). R2 objects are not backed up automatically.

## 10. Local prod-like run
`APP_SECRET=$(openssl rand -hex 32) docker compose up --build` (db + api + web, http://localhost:3000). Without Docker: `npm run db:up`, `npm run build -w @unsaid/api`, then `PORT=4100 NODE_ENV=production AUTO_MIGRATE=true APP_SECRET=... DATABASE_URL=... npm start -w @unsaid/api`.

## 11. CI
`.github/workflows/ci.yml`: install, typecheck all workspaces, API tests (Postgres 16 service, `TEST_DATABASE_URL`), API prod build, web tests + build, admin build, mobile tests. Vercel/Render auto-deploy on push to main; enable "wait for CI" in their settings if you want gating.
