#!/usr/bin/env bash
# Scenario tests for check-changelog-before-pr.sh. Builds a throwaway repo
# with two branches (one touching CHANGELOG.md, one not) and a worktree per
# branch, then feeds the hook PreToolUse payloads the way Claude Code does.
#
# Run: bash .claude/hooks/__tests__/check-changelog-before-pr.test.sh

set -euo pipefail

hook="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/check-changelog-before-pr.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

repo="$tmp/repo"
git init -q -b main "$repo"
git -C "$repo" config user.email test@example.com
git -C "$repo" config user.name test
git -C "$repo" config commit.gpgsign false
printf '# Changelog\n' >"$repo/CHANGELOG.md"
printf 'base\n' >"$repo/file.txt"
git -C "$repo" add -A && git -C "$repo" commit -qm base

git -C "$repo" checkout -qb with-changelog
printf '# Changelog\n\n- entry\n' >"$repo/CHANGELOG.md"
git -C "$repo" commit -qam "changelog"

git -C "$repo" checkout -q main
git -C "$repo" checkout -qb without-changelog
printf 'changed\n' >"$repo/file.txt"
git -C "$repo" commit -qam "code only"

git -C "$repo" checkout -q main
git -C "$repo" worktree add -q "$tmp/wt-with" with-changelog
git -C "$repo" worktree add -q "$tmp/wt-without" without-changelog

failures=0
run_hook() {
  # $1 = cwd for the hook, $2 = command string
  local payload
  payload="$(jq -n --arg cwd "$1" --arg cmd "$2" '{cwd: $cwd, tool_name: "Bash", tool_input: {command: $cmd}}')"
  (cd "$1" && printf '%s' "$payload" | bash "$hook")
}
expect() {
  # $1 = name, $2 = expected ("allow"|"deny"), $3 = cwd, $4 = command
  local out decision
  out="$(run_hook "$3" "$4")"
  if printf '%s' "$out" | jq -e '.hookSpecificOutput.permissionDecision == "deny"' >/dev/null 2>&1; then
    decision=deny
  else
    decision=allow
  fi
  if [ "$decision" = "$2" ]; then
    printf 'ok   %s\n' "$1"
  else
    printf 'FAIL %s: expected %s, got %s\n' "$1" "$2" "$decision"
    failures=$((failures + 1))
  fi
}

expect "allows when the checked-out branch touches CHANGELOG" allow "$tmp/wt-with" "gh pr create --title x"
expect "denies when the checked-out branch does not touch CHANGELOG" deny "$tmp/wt-without" "gh pr create --title x"
expect "resolves the worktree from a leading cd" allow "$tmp/wt-without" "cd $tmp/wt-with && gh pr create --title x"
expect "resolves a quoted worktree path from a leading cd" allow "$tmp/wt-without" "cd \"$tmp/wt-with\" && gh pr create --title x"
expect "resolves the branch from --head" allow "$tmp/wt-without" "gh pr create --head with-changelog --title x"
expect "resolves the branch from --head=owner:branch" allow "$tmp/wt-without" "gh pr create --head=owner:with-changelog"
expect "denies via --head even from a good checkout" deny "$tmp/wt-with" "gh pr create --head without-changelog"
expect "falls back to HEAD for an unknown --head ref" allow "$tmp/wt-with" "gh pr create --head no-such-branch"
expect "ignores commands that are not gh pr create" allow "$tmp/wt-without" "gh run list --branch without-changelog"
expect "ignores an empty payload" allow "$tmp/wt-without" ""

if [ "$failures" -ne 0 ]; then
  printf '%s failure(s)\n' "$failures"
  exit 1
fi
printf 'all scenarios passed\n'
