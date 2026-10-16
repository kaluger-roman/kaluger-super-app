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

# The settings `if` filters should already narrow to `gh pr create` /
# `gh pr ready`, but they have matched unrelated compound commands — gate
# only the real thing. `gh pr ready` is gated because PRs are opened as
# drafts at task start (scripts/start-task-pr.mjs, not gated) and the
# changelog check moves to marking them ready.
case "$command" in
  *"gh pr create"* | *"gh pr ready"*) ;;
  *) exit 0 ;;
esac

# `ssh <host> '<inner command>'`: the repo and its worktrees live on the dev
# machine (the session only sees a mount, where worktree git dirs do not
# resolve), so run this same gate there on the inner command.
if [ -z "${CHANGELOG_GATE_REMOTE:-}" ]; then
  ssh_prefix="$(printf '%s' "$command" | sed -nE "s/^[[:space:]]*ssh[[:space:]]+([^'\"]*)['\"].*/\1/p")"
  if [ -n "$ssh_prefix" ]; then
    ssh_host="$(printf '%s' "$ssh_prefix" | awk '{print $NF}')"
    inner_command="$(printf '%s' "$command" | sed -E "s/^[[:space:]]*ssh[[:space:]]+[^'\"]*['\"]//; s/['\"][[:space:]]*\$//")"
    printf '%s' "$input" | jq --arg c "$inner_command" '.tool_input.command = $c' |
      ${CHANGELOG_GATE_SSH:-ssh} "$ssh_host" "cd ${CHANGELOG_GATE_REMOTE_REPO:-~/kaluger-super-app} && CHANGELOG_GATE_REMOTE=1 bash .claude/hooks/check-changelog-before-pr.sh" ||
      echo "changelog gate: cannot reach ${ssh_host}, skipping the check" >&2
    exit 0
  fi
fi

# `cd <worktree> && gh pr create …` — take the diff in that worktree.
target_dir="$(printf '%s' "$command" | sed -nE 's/^[[:space:]]*cd[[:space:]]+"([^"]+)".*/\1/p')"
if [ -z "$target_dir" ]; then
  target_dir="$(printf '%s' "$command" | sed -nE 's/^[[:space:]]*cd[[:space:]]+([^[:space:];&|]+).*/\1/p')"
fi
target_dir="${target_dir/#\~/$HOME}"
target_dir="${target_dir/#\$HOME/$HOME}"
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
jq -n --arg reason "CHANGELOG.md не обновлён в ветке ${branch_label} относительно main. Перед \`gh pr create\` / \`gh pr ready\` обязательно: 1) запусти /changelog (обновит CHANGELOG.md из git history), 2) запусти /news (создаст пользовательскую запись в backend/prisma/news/), 3) закоммить и пушни. Это требование CLAUDE.md проекта. Если PR действительно не требует changelog (чисто внутренний рефактор/документация) — добавь пустую строку в CHANGELOG.md или временно отключи hook через /hooks." '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
