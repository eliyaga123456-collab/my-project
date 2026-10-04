#!/usr/bin/env bash
# Starts a local PostgreSQL for development/testing (no Docker needed if postgres binaries are installed).
# Usage: scripts/db-up.sh   → listens on localhost:5432, creates DBs `unsaid` and `unsaid_test`.
set -euo pipefail
PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)
DATA="${PGDATA_DIR:-$(cd "$(dirname "$0")/.." && pwd)/.data/pg}"
if [ -z "$PGBIN" ]; then
  echo "postgres binaries not found; use: docker compose up -d db" >&2; exit 1
fi
RUN() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then mkdir -p "$DATA" && chown -R postgres:postgres "$(dirname "$DATA")"; fi
if [ ! -f "$DATA/PG_VERSION" ]; then RUN "$PGBIN/initdb -D '$DATA' -A trust -U postgres >/dev/null"; fi
if ! RUN "$PGBIN/pg_ctl -D '$DATA' status >/dev/null 2>&1"; then
  RUN "$PGBIN/pg_ctl -D '$DATA' -o '-p 5432 -k /tmp' -l '$DATA/server.log' -w start >/dev/null"
fi
for db in unsaid unsaid_test; do
  RUN "psql -h localhost -p 5432 -U postgres -tAc \"SELECT 1 FROM pg_database WHERE datname='$db'\" | grep -q 1 || createdb -h localhost -p 5432 -U postgres $db"
done
echo "PostgreSQL ready: postgres://postgres@localhost:5432/unsaid"
