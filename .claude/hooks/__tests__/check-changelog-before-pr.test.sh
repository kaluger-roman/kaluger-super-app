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

# Stand-in for `ssh <host> <command>`: drop the host, run the command locally
# with HOME pointing at a fake dev-machine home where the repo is checked out.
fake_home="$tmp/devhome"
mkdir -p "$fake_home"
ln -s "$repo" "$fake_home/kaluger-super-app"
mkdir -p "$repo/.claude/hooks"
cp "$hook" "$repo/.claude/hooks/"
printf '#!/usr/bin/env bash\nshift\nHOME="%s" bash -c "$*"\n' "$fake_home" >"$tmp/fake-ssh"
chmod +x "$tmp/fake-ssh"
git -C "$repo" worktree add -q --detach "$tmp/devhome/wt-ssh-with" with-changelog
git -C "$repo" worktree add -q --detach "$tmp/devhome/wt-ssh-without" without-changelog

failures=0
run_hook() {
  # $1 = cwd for the hook, $2 = command string
  local payload
  payload="$(jq -n --arg cwd "$1" --arg cmd "$2" '{cwd: $cwd, tool_name: "Bash", tool_input: {command: $cmd}}')"
  (cd "$1" && printf '%s' "$payload" | CHANGELOG_GATE_SSH="$tmp/fake-ssh" bash "$hook")
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
expect "denies gh pr ready without CHANGELOG" deny "$tmp/wt-without" "gh pr ready"
expect "allows gh pr ready with CHANGELOG" allow "$tmp/wt-with" "gh pr ready 73"
expect "resolves the worktree for gh pr ready from a leading cd" allow "$tmp/wt-without" "cd $tmp/wt-with && gh pr ready"
expect "ignores the start-of-task draft PR script" allow "$tmp/wt-without" "node scripts/start-task-pr.mjs --title x"

# `ssh <host> '<cmd>'` is gated on the dev machine (HOME and ~ resolve there).
expect "gates an ssh-wrapped gh pr create from a ~ worktree path (allow)" allow "$tmp/wt-without" "ssh home 'cd ~/wt-ssh-with && ~/.local/bin/gh pr create --title x'"
expect "gates an ssh-wrapped gh pr create from a ~ worktree path (deny)" deny "$tmp/wt-with" "ssh home 'cd ~/wt-ssh-without && gh pr create --title x'"
expect "gates an ssh-wrapped gh pr create from a \$HOME worktree path" deny "$tmp/wt-with" "ssh home 'cd \$HOME/wt-ssh-without && gh pr create'"
expect "handles a double-quoted ssh wrapper and ssh options" deny "$tmp/wt-with" "ssh -t home \"cd ~/wt-ssh-without && gh pr create\""
expect "resolves --head inside the ssh wrapper (allow)" allow "$tmp/wt-without" "ssh home 'gh pr create --head with-changelog'"
expect "resolves --head inside the ssh wrapper (deny)" deny "$tmp/wt-with" "ssh home 'gh pr create --head without-changelog'"
expect "gates an ssh-wrapped gh pr ready" deny "$tmp/wt-with" "ssh home 'cd ~/wt-ssh-without && gh pr ready'"
expect "ignores ssh-wrapped commands that are not gh pr create" allow "$tmp/wt-without" "ssh home 'gh run list --branch without-changelog'"

# A `cd` anywhere in the chain before gh counts, not only a leading one (#100).
expect "resolves a cd after an export prefix (allow)" allow "$tmp/wt-without" "export PATH=\$HOME/.local/bin:\$PATH; cd $tmp/wt-with && gh pr ready 98"
expect "resolves a cd after a source prefix (deny)" deny "$tmp/wt-with" "source ~/.nvm/nvm.sh; cd $tmp/wt-without && gh pr ready"
expect "takes the last cd before gh" allow "$tmp/wt-without" "cd $tmp/wt-without && cd $tmp/wt-with && gh pr create"
expect "resolves a relative cd against the previous one" allow "$tmp/wt-without" "cd $tmp && cd wt-with && gh pr create"
expect "ignores a cd after the gh call" deny "$tmp/wt-without" "gh pr create && cd $tmp/wt-with"
expect "splits on newlines" allow "$tmp/wt-without" "cd $tmp/wt-with"$'\n'"gh pr create"
expect "keeps redirections inside the word" allow "$tmp/wt-without" "cd $tmp/wt-with 2>/dev/null && gh pr ready 2>&1 | tail -1"
expect "gates gh inside a subshell" deny "$tmp/wt-with" "(cd $tmp/wt-without && gh pr create)"
expect "gates gh after env assignments" deny "$tmp/wt-without" "GH_TOKEN=x gh pr create --title x"
expect "gates gh called by path" deny "$tmp/wt-without" "\$HOME/.local/bin/gh pr ready 5"
expect "resolves the branch from -H" allow "$tmp/wt-without" "gh pr create -H with-changelog"
expect "gates an ssh gh pr ready after export (allow)" allow "$tmp/wt-without" "ssh home 'export PATH=\$HOME/.local/bin:\$PATH; cd ~/wt-ssh-with && gh pr ready 98'"
expect "gates an ssh gh pr ready after source and export (deny)" deny "$tmp/wt-with" "ssh home 'source ~/.nvm/nvm.sh; export PATH=\$HOME/.local/bin:\$PATH; cd ~/wt-ssh-without && gh pr ready 98'"
expect "skips ssh options that take a value" deny "$tmp/wt-with" "ssh -o BatchMode=yes -p 22 home 'cd ~/wt-ssh-without && gh pr ready'"
expect "gates the ssh call that runs gh, not the first one" allow "$tmp/wt-without" "ssh home 'git status' && ssh home 'cd ~/wt-ssh-with && gh pr ready 1'"
expect "gates the ssh call that runs gh, not the first one (deny)" deny "$tmp/wt-with" "ssh home 'git status' && ssh home 'cd ~/wt-ssh-without && gh pr ready 1'"

# Text that only mentions the command is not a call (#100).
expect "ignores gh pr ready inside a commit message" allow "$tmp/wt-without" "git commit -m \"run gh pr ready after review\""
expect "ignores gh pr ready inside a script argument" allow "$tmp/wt-without" "node scripts/start-task-pr.mjs --title x --summary 'then gh pr ready'"
expect "ignores gh pr create inside an issue comment over ssh" allow "$tmp/wt-without" "ssh home 'cd ~/wt-ssh-without && gh issue comment 1 --body \"use gh pr create\"'"
expect "ignores gh pr ready inside a double-quoted ssh command" allow "$tmp/wt-without" "ssh home \"git commit -m 'gh pr ready later'\""
expect "ignores an escaped quote around the text" allow "$tmp/wt-without" "echo \"say \\\"gh pr ready\\\" now\""
expect "still gates a command with an unterminated quote" deny "$tmp/wt-without" "gh pr create --body \"no closing quote"

expect_reason() {
  # $1 = name, $2 = cwd, $3 = command, $4 = fixed string the deny reason must contain
  local reason
  reason="$(run_hook "$2" "$3" | jq -r '.hookSpecificOutput.permissionDecisionReason // ""')"
  if printf '%s' "$reason" | grep -qF -- "$4"; then
    printf 'ok   %s\n' "$1"
  else
    printf 'FAIL %s: reason %s lacks %s\n' "$1" "$reason" "$4"
    failures=$((failures + 1))
  fi
}

expect_reason "names the checked checkout" "$tmp/wt-without" "gh pr ready" "Проверялся checkout $(cd "$tmp/wt-without" && pwd -P)"
expect_reason "hints at cd or --head when the command names no branch" "$tmp/wt-without" "gh pr ready" "нет \`cd <worktree>\`"
expect_reason "reports a cd target that does not exist" "$tmp/wt-without" "cd $tmp/missing && gh pr ready" "Каталог из \`cd\` не найден ($tmp/missing)"

if [ "$failures" -ne 0 ]; then
  printf '%s failure(s)\n' "$failures"
  exit 1
fi
printf 'all scenarios passed\n'
