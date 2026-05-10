#!/usr/bin/env bash
# PreToolUse hook on `gh pr create` — blocks the command if CHANGELOG.md
# was not modified between this branch and main.
#
# Project rule (CLAUDE.md): "Before creating a PR, always run /changelog…
# After /changelog, run /news…". This script is the gate that enforces it.

set -euo pipefail

# The hook filter (`if: "Bash(gh pr create *)"`) already narrowed to gh pr create.
# We don't need stdin — drain it so the harness doesn't see a closed pipe.
cat >/dev/null

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

base="origin/main"
if ! git rev-parse --verify --quiet "$base" >/dev/null 2>&1; then
  base="main"
fi
if ! git rev-parse --verify --quiet "$base" >/dev/null 2>&1; then
  # No main ref to compare against — nothing we can check, allow.
  exit 0
fi

changed="$(git diff --name-only "$base"...HEAD 2>/dev/null || true)"

if printf '%s\n' "$changed" | grep -qx 'CHANGELOG.md'; then
  # CHANGELOG.md is in the branch diff — looks good.
  exit 0
fi

# Block — emit JSON for the new-style PreToolUse output.
cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "CHANGELOG.md не обновлён в этой ветке относительно main. Перед `gh pr create` обязательно: 1) запусти /changelog (обновит CHANGELOG.md из git history), 2) запусти /news (создаст пользовательскую запись в backend/prisma/news/), 3) закоммить и пушни. Это требование CLAUDE.md проекта. Если PR действительно не требует changelog (чисто внутренний рефактор/документация) — добавь пустую строку в CHANGELOG.md или временно отключи hook через /hooks."
  }
}
JSON
