#!/usr/bin/env bash
# Runs git in a checkout of this repo on the machine that holds it.
#
# A Claude session on the server sees the repo on the dev machine through an
# sshfs mount. Git does not work there for worktrees (their .git file points
# at a path that exists only on the dev machine) and is slow over the mount,
# so for a directory under an sshfs mount git runs over ssh in the same
# directory on the remote side. Anywhere else this is plain `git -C <dir>`.
#
# Usage: bash scripts/repo-git.sh [-C <dir>] <git args...>   (<dir> defaults to the cwd)

set -euo pipefail

dir="$PWD"
if [ "${1:-}" = "-C" ]; then
  if [ $# -lt 2 ]; then
    echo "repo-git: -C needs a directory" >&2
    exit 2
  fi
  dir="$2"
  shift 2
fi
case "$dir" in
  /*) ;;
  *) dir="$PWD/$dir" ;;
esac

# findmnt lists every mount on the path (systemd automount adds an autofs one
# under the sshfs mount), so pick the sshfs line. Raw output escapes spaces as \x20.
mount_line="$(findmnt -n -r -o FSTYPE,SOURCE,TARGET -T "$dir" 2>/dev/null |
  awk '$1 == "fuse.sshfs" { print $2, $3; exit }' || true)"
if [ -z "$mount_line" ]; then
  exec git -C "$dir" "$@"
fi

source="$(printf '%b' "${mount_line%% *}")"
target="$(printf '%b' "${mount_line#* }")"
host="${source%%:*}"
remote_root="${source#*:}"
remote_dir="${remote_root:-.}${dir#"$target"}"

ssh_args=(-o BatchMode=yes)
# The mount authenticates with the IdentityFile from its fstab entry, not
# through an ssh config alias, so reuse that key.
identity="$(findmnt -s -n -o OPTIONS --target "$target" 2>/dev/null | tr ',' '\n' | sed -n 's/^IdentityFile=//p' | head -1 || true)"
if [ -n "$identity" ]; then
  ssh_args+=(-i "$identity" -o IdentitiesOnly=yes)
fi

printf -v remote_command 'cd %q && exec git' "$remote_dir"
for arg in "$@"; do
  printf -v remote_command '%s %q' "$remote_command" "$arg"
done
exec ssh "${ssh_args[@]}" "$host" "$remote_command"
