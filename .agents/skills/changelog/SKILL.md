---
name: changelog
description: "Generate or update Super App CHANGELOG.md from a branch diff, commit range, or release version while preserving existing release history."
---

# Update changelog

Read `AGENTS.md` and the current `CHANGELOG.md`. Use local `git` in the selected
checkout (`--worktree PATH` if supplied), not the launch directory of another chat.

- Honor an explicit commit range/base/version. Otherwise use the task branch against
  `origin/main` (or local `main` if that is the available verified base). On main,
  use the last release/tag or a clear changelog boundary; ask only if the release
  scope cannot be determined. Never use a date cutoff alone to infer branch contents.
- Inspect commit history and actual diff. Include staged/unstaged changes and read
  relevant untracked files for an unfinished task. Do not stage or reset the index
  merely to collect a diff, and do not mix unrelated user changes into the entry.
- Write English outcome-oriented entries under Added, Changed, Fixed, Removed,
  Security, or Infrastructure. Omit empty groups, combine related changes, and
  exclude internal orchestration artifacts and generated noise.
- Use the requested version/date or current user-local date. Follow existing header
  style (`## YYYY-MM-DD` is valid). Add to an existing unreleased/current entry
  without duplicating bullets; preserve previous published entries.
- Include short commit hashes only for real commits that support the entry. Working
  tree changes have no invented hash. Never claim a deployment or completed check
  solely because it appears in a plan or commit message.

Read back the changed section and verify it against the scoped diff. Return the file
link and brief summary. This skill edits the changelog only: no automatic news, DB
write, commit, push, PR, or deployment.
