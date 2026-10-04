#!/usr/bin/env bash
# Runs once when the codespace is created: install deps, migrate the DB, create an admin with a random password.
set -euo pipefail
cd "$(dirname "$0")/.."
npm install --no-audit --no-fund
mkdir -p .data
export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@db:5432/unsaid}"
npm run db:migrate -w @unsaid/api
if [ ! -f .data/admin-password.txt ]; then
  openssl rand -base64 18 | tr -d '/+=' > .data/admin-password.txt
fi
ADMIN_SEED_EMAIL="admin@ear.local" ADMIN_SEED_PASSWORD="$(cat .data/admin-password.txt)" npm run db:seed -w @unsaid/api
echo "Setup done. Admin login: admin@ear.local / $(cat .data/admin-password.txt)  (saved in .data/admin-password.txt)"
