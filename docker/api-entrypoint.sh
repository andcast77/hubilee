#!/bin/sh
set -e
echo "Running database migrations..."
pnpm --filter @hubilee/database migrate:deploy
echo "Starting API..."
exec "$@"
