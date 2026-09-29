#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Engine and the Docker Compose plugin first." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is required." >&2
  exit 1
fi
if [[ ! -f .env.production ]]; then
  echo "Missing .env.production. Copy .env.production.template and set the production values." >&2
  exit 1
fi

compose=(docker compose --env-file .env.production -f compose.yaml)
echo "==> Validating Docker Compose configuration"
"${compose[@]}" config --quiet

echo "==> Building the application image"
"${compose[@]}" build --pull app

echo "==> Starting the application"
"${compose[@]}" up --detach --remove-orphans --wait --wait-timeout 120 app

echo "==> Application is healthy"
"${compose[@]}" ps
