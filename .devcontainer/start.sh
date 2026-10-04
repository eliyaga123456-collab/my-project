#!/usr/bin/env bash
# Runs every time the codespace starts: launches API, web and admin and makes the web port public.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p .data
export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@db:5432/unsaid}"

if [ -n "${CODESPACE_NAME:-}" ]; then
  DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  WEB_URL="https://${CODESPACE_NAME}-3000.${DOMAIN}"
  ADMIN_URL="https://${CODESPACE_NAME}-3100.${DOMAIN}"
  SECURE=true
else
  WEB_URL="http://localhost:3000"; ADMIN_URL="http://localhost:3100"; SECURE=false
fi

pkill -f "tsx watch" 2>/dev/null; pkill -f "next dev" 2>/dev/null; pkill -f "vite --port" 2>/dev/null
[ -f .data/app-secret ] || openssl rand -hex 32 > .data/app-secret

# API: its public base URL is the web origin because the web app proxies /api/v1 and /media (one origin, no CORS).
(
  export NODE_ENV=development PORT=4000 WEB_URL API_URL="$WEB_URL" WEB_ORIGINS="$WEB_URL" ADMIN_ORIGINS="$ADMIN_URL" \
         TRUST_PROXY=true COOKIE_SECURE="$SECURE" EMAIL_TRANSPORT=outbox APP_SECRET="$(cat .data/app-secret)" \
         MEDIA_DIR="$PWD/.data/media" EXPO_PUSH_ENABLED=false
  nohup npm run dev -w @unsaid/api > .data/api.log 2>&1 &
)
(
  export API_URL="http://localhost:4000" NEXT_PUBLIC_SITE_URL="$WEB_URL"
  nohup npm run dev -w @unsaid/web > .data/web.log 2>&1 &
)
(
  export VITE_API_URL="http://localhost:4000" __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=".github.dev,.app.github.dev"
  nohup npm run dev -w @unsaid/admin -- --host 0.0.0.0 > .data/admin.log 2>&1 &
)

# Make the web port public so the link works on any phone (best effort; you can also do this in the Ports tab).
if [ -n "${CODESPACE_NAME:-}" ] && command -v gh >/dev/null 2>&1; then
  for i in 1 2 3 4 5 6; do
    if gh codespace ports visibility 3000:public -c "$CODESPACE_NAME" >/dev/null 2>&1; then break; fi
    sleep 5
  done
fi
echo "EAR web:   $WEB_URL"
echo "EAR admin: $ADMIN_URL"
echo "EAR install page: $WEB_URL/install"
