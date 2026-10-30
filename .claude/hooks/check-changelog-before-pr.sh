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

# Cheap pre-filter; the real decision is made on the parsed command below.
case "$command" in
  *"gh pr create"* | *"gh pr ready"*) ;;
  *) exit 0 ;;
esac

# Splits a command into words and control operators the way the shell does
# (quotes, backslashes), so text inside a quoted argument — a commit message,
# a PR body — never reads as a command. Fills `tokens` with "w:<word>" and
# "o:<operator>" entries. Variables and `~` are left unexpanded. awk, not a
# bash loop: PR bodies run to kilobytes, and bash string slicing is quadratic.
tokenize() {
  local line
  tokens=()
  while IFS= read -r line; do
    tokens+=("${line//$'\036'/$'\n'}")
  done < <(printf '%s' "$1" | LC_ALL=C awk '
    function flush() {
      if (have) { gsub(/\n/, "\036", w); print "w:" w }
      w = ""; have = 0
    }
    { s = s (NR > 1 ? "\n" : "") $0 }
    END {
      n = length(s)
      for (i = 1; i <= n; i++) {
        c = substr(s, i, 1)
        if (c == " " || c == "\t") {
          flush()
        } else if (c == "\n" || c == ";" || c == "&" || c == "|" || c == "(" || c == ")") {
          last = substr(w, length(w), 1)
          if (c == "&" && have && (last == ">" || last == "<")) {
            w = w c # 2>&1
          } else {
            flush()
            if ((c == "&" || c == "|") && substr(s, i + 1, 1) == c) { c = c c; i++ }
            print "o:" (c == "\n" ? ";" : c)
          }
        } else if (c == "\047") {
          have = 1
          j = index(substr(s, i + 1), "\047")
          if (j == 0) j = n - i + 1
          w = w substr(s, i + 1, j - 1)
          i += j
        } else if (c == "\"") {
          have = 1
          for (i++; i <= n; i++) {
            c = substr(s, i, 1)
            if (c == "\"") break
            if (c == "\\" && index("\"\\$`", substr(s, i + 1, 1)) > 0 && i < n) { i++; c = substr(s, i, 1) }
            w = w c
          }
        } else if (c == "\\") {
          have = 1
          i++
          if (substr(s, i, 1) != "\n") w = w substr(s, i, 1)
        } else {
          have = 1
          w = w c
        }
      }
      flush()
    }')
}

expand_home() {
  local d="$1"
  d="${d/#\~/$HOME}"
  d="${d/#\$\{HOME\}/$HOME}"
  d="${d/#\$HOME/$HOME}"
  printf '%s' "$d"
}

# One simple command (no operators). `cd` updates cd_dir; the first
# `gh pr create|ready` call records gh_found/gh_dir/gh_head; an `ssh` call is
# queued in ssh_hosts/ssh_inners for the remote check.
scan_simple_command() {
  while [ "$#" -gt 0 ]; do
    if [[ "$1" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      shift
      continue
    fi
    case "$1" in
      env | command | exec | builtin | time | '!' | '{' | '}' | then | do | else) shift ;;
      *) break ;;
    esac
  done
  [ "$#" -gt 0 ] || return 0

  case "$1" in
    cd)
      shift
      if [ "${1:-}" = "--" ]; then shift; fi
      local d
      d="$(expand_home "${1:-~}")"
      case "$d" in
        -) ;;
        /*) cd_dir="$d" ;;
        *) cd_dir="${cd_dir:+$cd_dir/}$d" ;;
      esac
      ;;
    ssh)
      shift
      local flags f j
      while [ "$#" -gt 0 ]; do
        case "$1" in
          --)
            shift
            break
            ;;
          -?*)
            flags="${1#-}"
            shift
            j=0
            while [ "$j" -lt "${#flags}" ]; do
              f="${flags:j:1}"
              case "$f" in
                [BbcDEeFIiJLlmOoPpQRSWw])
                  # Option with a value: the rest of the word or the next one.
                  if [ "$((j + 1))" -eq "${#flags}" ] && [ "$#" -gt 0 ]; then shift; fi
                  break
                  ;;
              esac
              j=$((j + 1))
            done
            ;;
          *) break ;;
        esac
      done
      if [ "$#" -ge 2 ]; then
        ssh_hosts+=("$1")
        shift
        # ssh joins its remaining arguments with spaces into one remote command.
        ssh_inners+=("$*")
      fi
      ;;
    *)
      if [ "${1##*/}" = gh ] && [ "${2:-}" = pr ] && { [ "${3:-}" = create ] || [ "${3:-}" = ready ]; }; then
        gh_found=1
        gh_dir="$cd_dir"
        shift 3
        while [ "$#" -gt 0 ]; do
          case "$1" in
            --head | -H) gh_head="${2:-}" ;;
            --head=*) gh_head="${1#--head=}" ;;
          esac
          shift
        done
      fi
      ;;
  esac
}

scan_command() {
  gh_found=0 gh_dir="" gh_head="" cd_dir=""
  ssh_hosts=() ssh_inners=()
  tokenize "$1"
  local t words=()
  for t in ${tokens[@]+"${tokens[@]}"} "o:"; do
    if [ "${t:0:2}" = "w:" ]; then
      words+=("${t:2}")
      continue
    fi
    if [ "${#words[@]}" -gt 0 ]; then
      scan_simple_command "${words[@]}"
      if [ "$gh_found" = 1 ]; then return 0; fi
    fi
    words=()
  done
}

scan_command "$command"

# `ssh <host> '<inner command>'`: the repo and its worktrees live on the dev
# machine (the session only sees a mount, where worktree git dirs do not
# resolve), so run this same gate there on the inner command.
if [ "$gh_found" = 0 ]; then
  [ -z "${CHANGELOG_GATE_REMOTE:-}" ] || exit 0
  hosts=(${ssh_hosts[@]+"${ssh_hosts[@]}"})
  inners=(${ssh_inners[@]+"${ssh_inners[@]}"})
  for idx in ${inners[@]+"${!inners[@]}"}; do
    scan_command "${inners[idx]}"
    [ "$gh_found" = 1 ] || continue
    printf '%s' "$input" | jq --arg c "${inners[idx]}" '.tool_input.command = $c' |
      ${CHANGELOG_GATE_SSH:-ssh} "${hosts[idx]}" "cd ${CHANGELOG_GATE_REMOTE_REPO:-~/kaluger-super-app} && CHANGELOG_GATE_REMOTE=1 bash .claude/hooks/check-changelog-before-pr.sh" ||
      echo "changelog gate: cannot reach ${hosts[idx]}, skipping the check" >&2
    exit 0
  done
  exit 0
fi

# The last `cd` before the gh call names the checkout to diff.
if [ -n "$gh_dir" ] && [ -d "$gh_dir" ]; then
  cd "$gh_dir"
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

# `--head <branch>` names the PR branch explicitly. Worktrees share one
# object store, so the ref resolves from any checkout of the repo.
head_ref="${gh_head##*:}"
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

where="Проверялся checkout ${repo_root}."
if [ -n "$gh_dir" ] && [ ! -d "$gh_dir" ]; then
  where="Каталог из \`cd\` не найден (${gh_dir}), поэтому проверялся checkout ${repo_root}."
elif [ -z "$gh_dir" ] && [ -z "$gh_head" ]; then
  where="${where} В команде нет \`cd <worktree>\` перед \`gh\` и нет \`--head <ветка>\`, поэтому взята ветка этого checkout: если PR из другого worktree, укажи одно из них."
fi

# Block — emit JSON for the new-style PreToolUse output.
jq -n --arg reason "CHANGELOG.md не обновлён в ветке ${branch_label} относительно main. ${where} Перед \`gh pr create\` / \`gh pr ready\` обязательно: 1) запусти /changelog (обновит CHANGELOG.md из git history), 2) запусти /news (создаст пользовательскую запись в backend/prisma/news/), 3) закоммить и пушни. Это требование CLAUDE.md проекта. Если PR действительно не требует changelog (чисто внутренний рефактор/документация) — добавь пустую строку в CHANGELOG.md или временно отключи hook через /hooks." '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
