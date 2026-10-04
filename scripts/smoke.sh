#!/usr/bin/env bash
# Post-deploy smoke test.  Usage: WEB_URL=https://ear.vercel.app API_URL=https://ear-api.onrender.com scripts/smoke.sh
set -u
WEB_URL="${WEB_URL:?set WEB_URL}"; API_URL="${API_URL:?set API_URL}"
WEB_URL="${WEB_URL%/}"; API_URL="${API_URL%/}"
fail=0
ok()  { echo "PASS  $1"; }
bad() { echo "FAIL  $1"; fail=1; }
code() { curl -s -o /dev/null -m 90 -w '%{http_code}' "$@"; }   # long timeout: free hosts cold-start

echo "(first request may take ~30-60s while the free API wakes up)"
[ "$(code "$API_URL/health")" = 200 ] && ok "API /health" || bad "API /health"
[ "$(code "$API_URL/ready")" = 200 ] && ok "API /ready (DB reachable)" || bad "API /ready"

body=$(curl -s -m 60 -w '\n%{http_code}' "$WEB_URL/api/v1/profiles/zz_smoke_nouser9")
st=${body##*$'\n'}; json=${body%$'\n'*}
if [ "$st" = 404 ] && echo "$json" | grep -q '"error"'; then ok "GET /api/v1/profiles/<nobody> via web rewrite -> 404 + error JSON"; else bad "profiles 404 shape (status=$st body=$json)"; fi

[ "$(code "$WEB_URL/")" = 200 ] && ok "web /" || bad "web /"
[ "$(code "$WEB_URL/install")" = 200 ] && ok "web /install" || bad "web /install"
mt=$(curl -s -m 30 -o /dev/null -w '%{http_code} %{content_type}' "$WEB_URL/manifest.webmanifest")
case "$mt" in "200 "*) ok "manifest.webmanifest ($mt)";; *) bad "manifest.webmanifest ($mt)";; esac

hdrs=$(curl -s -m 30 -D - -o /dev/null "$WEB_URL/" | tr -d '\r')
for h in content-security-policy x-content-type-options x-frame-options strict-transport-security referrer-policy; do
  echo "$hdrs" | grep -qi "^$h:" && ok "web header $h" || bad "web header $h missing"
done
ah=$(curl -s -m 30 -D - -o /dev/null "$API_URL/health" | tr -d '\r')
for h in x-content-type-options strict-transport-security; do
  echo "$ah" | grep -qi "^$h:" && ok "api header $h" || bad "api header $h missing"
done
[ $fail = 0 ] && echo "ALL OK" || echo "SOME CHECKS FAILED"
exit $fail
