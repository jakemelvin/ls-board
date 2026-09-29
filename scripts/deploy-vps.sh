#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
service_name="sendamhub-ls-board"
cd "$project_root"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required. Install Node.js 22 LTS and run: corepack enable" >&2
  exit 1
fi
if [[ ! -f .env.production ]]; then
  echo "Missing .env.production. Copy .env.production.template and set the production values." >&2
  exit 1
fi

echo "==> Installing locked dependencies"
pnpm install --frozen-lockfile
echo "==> Running quality checks"
pnpm lint
pnpm exec tsc --noEmit
echo "==> Building the application"
pnpm build
echo "==> Restarting $service_name"
sudo systemctl restart "$service_name"
sudo systemctl --no-pager --full status "$service_name"
