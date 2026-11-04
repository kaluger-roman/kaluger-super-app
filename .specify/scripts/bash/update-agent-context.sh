#!/usr/bin/env bash
# Update only the managed Spec Kit block, preserving human agent instructions.
# Compatible with the macOS system Bash 3.2.
set -euo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

if [[ $# -gt 1 ]]; then
    echo "Usage: $0 [agent_type]" >&2
    exit 1
fi
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    echo "Usage: $0 [claude|gemini|copilot|cursor-agent|qwen|opencode|codex|windsurf|kilocode|auggie|roo|codebuddy|amp|shai|q|agy|bob|qoder]"
    echo "Without an agent, update existing context files; default to AGENTS.md if none exist."
    echo "Set SPECIFY_FEATURE to the exact feature slug when the branch is not its identity."
    exit 0
fi

REPO_ROOT="$(get_repo_root)"
FEATURE_SLUG="$(get_current_branch)"
FEATURE_SLUG="${FEATURE_SLUG#codex/}"
if [[ -n "${SPECIFY_FEATURE:-}" ]]; then
    FEATURE_DIR="$REPO_ROOT/specs/$FEATURE_SLUG"
else
    FEATURE_DIR="$(find_feature_dir_by_prefix "$REPO_ROOT" "$FEATURE_SLUG")"
    FEATURE_SLUG="${FEATURE_DIR##*/}"
fi

exec node "$SCRIPT_DIR/../node/update-agent-context.mjs" \
    "$REPO_ROOT" "$FEATURE_DIR/plan.md" "$FEATURE_SLUG" "${1:-}"
