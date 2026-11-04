#!/usr/bin/env bash
# Idempotent local checkout setup. Does not start Docker, copy prod secrets, or touch databases.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major < 20 || (major === 20 && minor < 19) || (major === 22 && minor < 12)) { console.error("Use the Node version in .nvmrc: nvm install && nvm use"); process.exit(1); }'
for package_dir in . backend frontend landing; do
  if [ -L "$package_dir/node_modules" ]; then
    echo "$package_dir/node_modules is a symlink. Remove only the link, then rerun setup for independent dependencies." >&2
    exit 1
  fi
done
for package_dir in . backend frontend landing; do
  (cd "$package_dir" && npm ci --no-audit --no-fund)
done
npm --prefix backend run db:generate
node scripts/setup-local-env.mjs
echo "Setup complete. Start Docker Desktop, then: bash scripts/dev-stack.sh up"
