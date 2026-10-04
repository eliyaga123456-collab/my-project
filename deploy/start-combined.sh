#!/usr/bin/env bash
# Starts the API (private) and the website (public) in one container. If either dies, exit so the platform restarts us.
set -u
PUBLIC_URL="${PUBLIC_URL:-${RENDER_EXTERNAL_URL:-http://localhost:${PORT:-3000}}}"
PUBLIC_URL="${PUBLIC_URL%/}"
echo "[ear] public url: $PUBLIC_URL"

(
  cd /repo/apps/api
  export PORT=4000 HOST=127.0.0.1 WEB_URL="$PUBLIC_URL" API_URL="$PUBLIC_URL" WEB_ORIGINS="$PUBLIC_URL"
  exec node dist/app/server.js
) &
API_PID=$!

(
  cd /repo/apps/web
  export SITE_URL="$PUBLIC_URL" API_URL="http://localhost:4000"
  exec /repo/node_modules/.bin/next start -p "${PORT:-3000}" -H 0.0.0.0
) &
WEB_PID=$!

trap 'kill $API_PID $WEB_PID 2>/dev/null' TERM INT
wait -n "$API_PID" "$WEB_PID"
CODE=$?
echo "[ear] a process exited (code $CODE); stopping"
kill "$API_PID" "$WEB_PID" 2>/dev/null
exit 1
