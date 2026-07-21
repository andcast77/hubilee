#!/bin/sh
set -e
echo "Running database migrations..."
pnpm --filter @hubilee/api migrate:deploy
echo "Starting API..."
exec "$@"
