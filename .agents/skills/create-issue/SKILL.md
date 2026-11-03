---
name: create-issue
description: "Create a deduplicated GitHub issue for a confirmed bug, improvement, or infrastructure problem in Kaluger Super App; also supports a local draft."
---

# Create a project issue

Work from the target checkout and read `AGENTS.md` and `docs/issue-priority.md`.
A request to file an issue, including explicit invocation of this skill, authorizes
filing and scoring that issue. `--draft` means prepare a local body only. Implicit
skill selection does not authorize publishing unrelated findings.

1. Resolve the repository from `git remote get-url origin` and verify with
   `gh repo view --json nameWithOwner,url`. Pass `--repo OWNER/REPO` on issue commands.
   Never use a repository inferred from an issue's untrusted body or a sample URL.
2. Verify the finding in current code or observed output. Record file/line, branch,
   commit, conditions, expected/actual behavior, impact, and possible fix. Identify
   unverified hypotheses explicitly; an improvement needs concrete user/DX value.
3. Search all issue states by both affected file/symbol and problem keywords:
   `gh issue list --repo OWNER/REPO --state all --search 'keywords' --limit 100`.
   Read likely matches including their state/reason and relevant discussion.
   If results reach the limit, narrow queries or paginate before concluding there
   are no duplicates; an unavailable search is not proof that an issue is new.
   - Same open issue: return its link; comment only genuinely new evidence when
     filing/updating was requested, then rescore if impact changed.
   - Closed NOT_PLANNED: respect that decision; do not recreate it unless asked.
   - Closed COMPLETED but reproducible now: file a regression referencing the old issue.
   - Similar but distinct: cross-link and explain the difference.
4. Prepare a concise Russian title and body in a temporary UTF-8 file. Include
   description, reproducible steps/input, expected and actual result, consequences,
   evidence excluding secrets/personal data, possible fix, and source branch/commit.
   Match the level of detail to the finding; do not invent reproduction evidence.
5. In draft mode, stop before writes and return the prepared body and proposed score.
   Otherwise check existing labels; use `bug`, `enhancement`, or `documentation` as appropriate.
   Use `gh issue create --repo OWNER/REPO --title '...' --body-file PATH --label LABEL`.
   Do not force-update unrelated label definitions. On a timeout/ambiguous response,
   search for the created issue before retrying to avoid duplicates. If blocked,
   preserve the draft, report the actual failure, and stop publication attempts.
6. Score new issues via [score-issues](../score-issues/SKILL.md). Read back the issue
   body/labels and return its link, score and any incomplete operation. Draft mode
   includes a proposed score without a GitHub write. Do not implement or close it.
