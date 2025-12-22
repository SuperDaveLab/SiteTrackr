#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
API_DIR="$PROJECT_ROOT/apps/api"
ENV_FILE="$API_DIR/.env"
SEED_FILE="$API_DIR/seed-demo.sql"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC2046,SC1090
  source "$ENV_FILE"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set. Define it in apps/api/.env or export it before running this script." >&2
  exit 1
fi

CLEAN_URL="${DATABASE_URL%%\?*}"
if [[ "$CLEAN_URL" != */* ]]; then
  echo "DATABASE_URL must include a database name" >&2
  exit 1
fi

DB_NAME="${CLEAN_URL##*/}"
if [[ -z "$DB_NAME" ]]; then
  echo "Unable to parse database name from DATABASE_URL" >&2
  exit 1
fi

BASE_WITH_DB="${CLEAN_URL%/*}"
if [[ -z "$BASE_WITH_DB" ]]; then
  echo "Unable to determine admin connection string" >&2
  exit 1
fi

DB_BASE_URL="${BASE_WITH_DB}/postgres"

if [[ -z "$DB_BASE_URL" || -z "$DB_NAME" ]]; then
  echo "Failed to parse DATABASE_URL for admin connection." >&2
  exit 1
fi

psql "$DB_BASE_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME';" >/dev/null
psql "$DB_BASE_URL" -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
psql "$DB_BASE_URL" -c "CREATE DATABASE \"$DB_NAME\";"

pushd "$API_DIR" >/dev/null
npm run prisma:migrate --silent
psql "$DATABASE_URL" -f "$SEED_FILE"
popd >/dev/null

echo "Database '$DB_NAME' has been recreated and seeded."
