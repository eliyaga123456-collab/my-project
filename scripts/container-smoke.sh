#!/usr/bin/env bash
# End-to-end check of the combined container through its ONE public port.  Usage: scripts/container-smoke.sh http://localhost:3000
set -euo pipefail
BASE="${1:?base url}"
H=(-H "x-requested-with: unsaid" -H "content-type: application/json")
for i in $(seq 1 90); do curl -fsS "$BASE/health" >/dev/null 2>&1 && break; sleep 2; [ "$i" = 90 ] && { echo "web never became healthy"; exit 1; }; done
echo "web healthy"
for i in $(seq 1 60); do curl -fsS "$BASE/api/v1/profiles/nobody-here" -o /dev/null -w "%{http_code}" 2>/dev/null | grep -q 404 && break; sleep 2; [ "$i" = 60 ] && { echo "API not reachable through the website"; exit 1; }; done
echo "api reachable through web proxy (404 for unknown profile)"
for p in / /install /manifest.webmanifest /sw.js /offline /privacy; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$p"); [ "$code" = 200 ] || { echo "GET $p -> $code"; exit 1; }
done
echo "pages ok"
U="smoke$RANDOM$RANDOM"
JAR=$(mktemp)
curl -fsS -c "$JAR" "${H[@]}" -X POST "$BASE/api/v1/auth/register" -d "{\"email\":\"$U@example.com\",\"password\":\"correct horse battery\",\"username\":\"$U\"}" | jq -e '.user.username' >/dev/null
echo "register ok"
curl -fsS "${H[@]}" -X POST "$BASE/api/v1/messages" -d "{\"username\":\"$U\",\"body\":\"Hello from the smoke test $RANDOM\"}" | jq -e '.status=="delivered"' >/dev/null
echo "anonymous send ok"
N=$(curl -fsS -b "$JAR" "$BASE/api/v1/messages?status=inbox" | jq '.items | length'); [ "$N" = 1 ] || { echo "inbox has $N messages"; exit 1; }
echo "inbox ok"
R=$(curl -fsS -b "$JAR" "${H[@]}" -X POST "$BASE/api/v1/links" -d '{"label":"Smoke round","prompt":"Question?"}' | jq -r .slug)
curl -fsS "$BASE/api/v1/links/public/$R" | jq -e '.prompt=="Question?"' >/dev/null
curl -fsS "$BASE/l/$R" | grep -q "Question?"
echo "rounds ok"
curl -fsSI "$BASE/" | grep -qi "x-content-type-options: nosniff"
echo "ALL OK"
