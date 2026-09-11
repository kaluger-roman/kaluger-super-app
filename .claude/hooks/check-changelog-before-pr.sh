#!/usr/bin/env bash
# PreToolUse hook on `gh pr create` — blocks the command if CHANGELOG.md
# was not modified between the PR branch and main.
#
# Project rule (CLAUDE.md): "Before creating a PR, always run /changelog…
# After /changelog, run /news…". This script is the gate that enforces it.
#
# The PR branch is resolved from the command itself, not from the session
# cwd: tasks run in their own worktrees, so the branch checked out where the
# session started is often unrelated to the branch being submitted.

set -euo pipefail

input="$(cat)"
command="$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || true)"

# The settings `if` filter should already narrow to `gh pr create`, but it
# has matched unrelated compound `gh` commands — gate only the real thing.
case "$command" in
  *"gh pr create"*) ;;
  *) exit 0 ;;
esac

# `cd <worktree> && gh pr create …` — take the diff in that worktree.
target_dir="$(printf '%s' "$command" | sed -nE 's/^[[:space:]]*cd[[:space:]]+"([^"]+)".*/\1/p')"
if [ -z "$target_dir" ]; then
  target_dir="$(printf '%s' "$command" | sed -nE 's/^[[:space:]]*cd[[:space:]]+([^[:space:];&|]+).*/\1/p')"
fi
if [ -n "$target_dir" ] && [ -d "$target_dir" ]; then
  cd "$target_dir"
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

# `--head <branch>` names the PR branch explicitly. Worktrees share one
# object store, so the ref resolves from any checkout of the repo.
head_ref="$(printf '%s' "$command" | sed -nE 's/.*--head[= ]+"?([^"[:space:]]+)"?.*/\1/p')"
head_ref="${head_ref##*:}"
if [ -z "$head_ref" ] || ! git rev-parse --verify --quiet "$head_ref" >/dev/null 2>&1; then
  head_ref="HEAD"
fi

base="origin/main"
if ! git rev-parse --verify --quiet "$base" >/dev/null 2>&1; then
  base="main"
fi
if ! git rev-parse --verify --quiet "$base" >/dev/null 2>&1; then
  # No main ref to compare against — nothing we can check, allow.
  exit 0
fi

if [ -n "$(git diff --name-only "$base...$head_ref" -- CHANGELOG.md 2>/dev/null)" ]; then
  exit 0
fi

branch_label="$head_ref"
if [ "$head_ref" = "HEAD" ]; then
  branch_label="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)"
fi

# Block — emit JSON for the new-style PreToolUse output.
jq -n --arg reason "CHANGELOG.md не обновлён в ветке ${branch_label} относительно main. Перед \`gh pr create\` обязательно: 1) запусти /changelog (обновит CHANGELOG.md из git history), 2) запусти /news (создаст пользовательскую запись в backend/prisma/news/), 3) закоммить и пушни. Это требование CLAUDE.md проекта. Если PR действительно не требует changelog (чисто внутренний рефактор/документация) — добавь пустую строку в CHANGELOG.md или временно отключи hook через /hooks." '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
