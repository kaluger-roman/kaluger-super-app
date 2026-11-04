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

## Feature identity and local setup

Resolve the exact `specs/<NNN-name>/` folder from explicit input or `SPECIFY_FEATURE`.
`feature_slug` is `NNN-name`; `branch` is the actual Git branch (usually
`codex/NNN-name` or the already assigned branch). Never use the branch including
`codex/` as a specs path. A detached HEAD or an ambiguous numeric prefix is not a
feature identity. Set `SPECIFY_FEATURE=<feature_slug>` for every helper when the
branch differs. Return `branch`, `feature_slug` and `spec_path` separately.
Use the artifact language already established in the spec; communicate with the user in Russian.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").
1. From the executed script, extract the path to **tasks**.
1. Get the Git remote by running:

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> ONLY PROCEED TO NEXT STEPS IF THE REMOTE IS A GITHUB URL

1. For each task in the list, use `gh` through the `create-issue` skill to create a deduplicated issue in the repository that is representative of the Git remote.

> [!CAUTION]
> UNDER NO CIRCUMSTANCES EVER CREATE ISSUES IN REPOSITORIES THAT DO NOT MATCH THE REMOTE URL

## Idempotent conversion and completion

Explicit conversion authorizes filing selected tasks; `--draft` prepares local bodies only.
Default to incomplete actionable tasks, preserving a requested subset/granularity. Read
spec/plan, preserve task IDs as deduplication keys, and search all issue states before writes.
Use Russian title/body with feature slug, task IDs, relevant files, acceptance/verification
criteria and dependencies; do not invent bug reproduction for a planning task.

Create dependency-ordered issues, then link known prerequisite issue numbers. Maintain a
task-ID → issue-URL mapping in `tasks.md` without checking implementation boxes. Score
new issues using `$score-issues`. On partial failure preserve successful mappings and
unpublished bodies for an idempotent retry. Return created/existing/skipped/failed items;
do not implement, close or assign issues as part of conversion.
