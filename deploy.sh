#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

git pull origin master

docker compose up -d --build api hub
