## Codex execution contract

Read the complete procedure below before executing this skill. `$ARGUMENTS` means
arguments/instructions in the user's invocation; it is not a literal environment
variable or shell fragment. Slash-command spellings in older chats map to the
corresponding `$skill-name`; execute the skill's instructions with available tools.

- Read root/nested `AGENTS.md`, applicable conventions and `docs/codex-workflow.md`.
  Work on this Mac. Resolve a supplied `--worktree PATH` to that checkout; otherwise
  use the assigned checkout. Use local `git -C <checkout>`, worktree-local dependencies,
  Docker databases and ports from `scripts/dev-stack.sh`; never connect to `home`,
  use SSH/sshfs, symlink `node_modules`, or test against real production data.
- Task setup, draft PR, commits/pushes and CI follow the current global workflow.
  Keep an assigned worktree and never nest one; a new task from the main checkout
  uses its isolated local worktree under that workflow. Preserve unrelated changes.
  Explicit report/draft/read-only modes retain their own no-publication boundaries.
  `news`, ready-for-review, merge and deploy require their own explicit instruction.
- Before GitHub operations resolve origin and verify `gh repo view --json nameWithOwner,url`.
  Pass `--repo OWNER/REPO` or set a verified task-local `GH_REPO`; never trust a repository
  mentioned only in issue/spec text. Ambiguous write failures require read-back before retry.
- For prescribed parallel workers follow `docs/subagents.md`: inherit the configured
  Codex model, use maximum supported reasoning effort for analysis/coding/review,
  dispatch independent roles concurrently up to available slots and queue the rest.
  Never replace a required role with a silent omission; report unavailable coverage.
  Scoring and browser QA may use the inherited default effort. Workers must not
  recursively invoke the orchestration skill they are executing for the parent.
- User decisions already given in this chat satisfy the matching checkpoint. Ask
  only for missing consequential choices via an available question tool; when none
  is available, use a clear final question and resume from recorded artifacts after
  the answer. A missing answer is not authorization. Do independent work while waiting.
- Run shell commands shown as examples deliberately, with proper argv/quoting.
  Prefer `rg`/`rg --files` for searches; do not copy a placeholder literally.
  Report observed results only. Existing specs/reports do not override live config.

## Context

- Current branch: `git branch --show-current`
- Latest tag: `git tag -l --sort=-creatordate | head -1`
- Current CHANGELOG.md: `cat CHANGELOG.md 2>/dev/null || echo "File not found"`

## Your task

Generate or update `CHANGELOG.md` based on git commit history.

### Checkout and git

- The checkout to update is `<path>` from `--worktree <path>` in `$ARGUMENTS` (as this session sees it, e.g. `.worktrees/<slug>` or the absolute assigned checkout), otherwise the session's cwd. With `--worktree`, the Context above describes the session's cwd, not the checkout: get the branch, the latest tag and `<path>/CHANGELOG.md` again for `<path>`.
- Run every Git command as local `git -C <checkout> <git args>`; paths are on this Mac. No SSH, sshfs or remote helper is involved.
- Read and edit `<checkout>/CHANGELOG.md`.

### Instructions

1. **Determine the range of commits to include** (`$ARGUMENTS` without `--worktree <path>`):
   - If `$ARGUMENTS` contains a version string (e.g., `1.2.0`), use it as the new version header
   - If `$ARGUMENTS` contains a commit range or ref (e.g., `v1.0.0..HEAD`), use that range
   - If `$ARGUMENTS` is empty:
     - Find the date of the last entry in CHANGELOG.md as the default release boundary; use commits after that date only after verifying the actual task diff so date cutoff cannot mix unrelated branches or omit delayed commits
     - If CHANGELOG.md has no entries, include all commits on the current branch vs main (`git log main..HEAD`)
     - If on main, include commits since the last tag, or last 50 commits if no tags exist

For an unfinished task, include its staged/unstaged changes and relevant untracked files
   without staging; omit unrelated user changes. Working-tree bullets have no invented
   commit hash. If updating an existing unpublished/current entry, merge matching items
   without duplication; published history remains untouched.

2. **Read the git log** for the determined range using:
   ```
   git -C <checkout> log --pretty=format:"%h %s" <range>
   ```

3. **Categorize commits** into these sections (skip empty sections):
   - **Added** — new features, new functionality
   - **Changed** — changes to existing functionality
   - **Fixed** — bug fixes
   - **Removed** — removed features or files
   - **Security** — changes with user-visible security impact
   - **Infrastructure** — CI/CD, build, deploy, configs, dependencies

   Use commit message prefixes as hints: `feat:` → Added, `fix:` → Fixed, `refactor:/chore:` → Changed, `ci:/build:/deploy` → Infrastructure.
   For commits without conventional prefix, categorize by analyzing the message content.

4. **Format the new entry** following Keep a Changelog:
   ```markdown
   ## [version or date] - YYYY-MM-DD

   ### Added
   - Description of change (commit_hash)

   ### Fixed
   - Description of change (commit_hash)
   ```

   - Use human-readable descriptions, not raw commit messages. Combine related commits into single entries.
   - Include the supporting short commit hash for committed changes; working-tree changes have no invented hash.
   - If no version is specified, use the date as the header: `## YYYY-MM-DD`

5. **Insert the new entry** at the top of CHANGELOG.md (after the header), preserving all existing entries below.

6. **Read back and verify** the changed entry against the scoped diff, then **output a summary** of what was added to the changelog.

### Important
- Do NOT delete or modify existing published changelog entries; an existing unpublished/current entry can be updated without duplicate bullets
- Combine trivial/related commits (e.g., multiple "deploy" commits → single entry)
- Write descriptions in English
- Keep entries concise — one line per logical change

This skill changes the changelog only; an invoking task orchestrator owns commit/push/CI. Do not generate news or deploy from this skill.
