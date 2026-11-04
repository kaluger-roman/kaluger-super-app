#!/usr/bin/env bash
# Compatibility entry point: all checkouts and worktrees now live on this Mac.
# Usage: bash scripts/repo-git.sh [-C <directory>] <git arguments...>
# Pass every argument unchanged; never inspect mounts or connect to another host.
set -euo pipefail

dir="$PWD"
if [ "${1:-}" = "-C" ]; then
  if [ "$#" -lt 2 ] || [ -z "$2" ]; then
    echo "repo-git: -C needs a directory" >&2
    exit 2
  fi
  dir="$2"
  shift 2
fi
exec git -C "$dir" "$@"
