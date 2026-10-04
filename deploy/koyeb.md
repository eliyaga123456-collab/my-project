# Koyeb alternative for the API (unverified, check current free-tier terms)
- Create Service > GitHub repo > Builder: Dockerfile, path `apps/api/Dockerfile`, build context = repo root.
- Port 4000 (HTTP), health check `/health`. Instance: free/eco type.
- Set the same env vars as `deploy/render.yaml` (APP_SECRET, DATABASE_URL, WEB_URL, ...).
- Free instances scale to zero when idle (cold start) and are region-limited; the in-memory rate limiter resets on each wake.
