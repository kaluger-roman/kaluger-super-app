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

- Current CHANGELOG.md: `cat CHANGELOG.md 2>/dev/null || echo "File not found"`
- Current date: `date +%Y-%m-%d`

## Your task

Generate a user-facing news entry from the project changelog and save it as a JSON file. It is a local source artifact for a future release. Production is currently unavailable; this skill does not sync a database or deploy.

### Instructions

1. **Read `CHANGELOG.md`** and extract the requested entry, or the latest when unspecified (date-only `## YYYY-MM-DD` and bracketed `## [...]` headers are both valid).

2. **Filter sections** — include ONLY user-visible changes:
   - **Added** (new features)
   - **Changed** (changes to existing functionality)
   - **Fixed** (bug fixes)
   - **Removed** (removed features)
   - **Security** (security improvements)

   **SKIP entirely**: Infrastructure, CI/CD, build, deploy, DevOps — these are NOT user-relevant.

3. **If no user-visible changes exist** in the latest entry, report this and stop. Do not create a news item.

4. **Generate the news content in Russian** — rewrite the changelog entries into a user-friendly, marketing-style announcement:
   - Write in Russian, addressing the user informally (ты/вы depending on context)
   - Replace technical jargon with user-understandable language
   - Focus on USER VALUE — what improved for them, not how it was done
   - Use friendly, conversational tone (not dry technical)
   - Format as a plain text list with bold section headers (e.g., "**Новое**", "**Исправлено**")
   - Do NOT use markdown headers (###) — use **bold** for section names instead
   - Section name mapping: Added → "**Новое**", Changed → "**Изменено**", Fixed → "**Исправлено**", Removed → "**Удалено**", Security → "**Безопасность**"
   - Skip empty sections

   **Examples of good rewrites:**
   - "Add pagination to news list endpoint" → "Новости теперь загружаются постепенно — быстрее и удобнее"
   - "Fix lesson duration calculation bug" → "Исправлен подсчёт длительности занятий"
   - "Implement WebSocket reconnection logic" → "Улучшена стабильность обновлений в реальном времени"

5. **Generate the title** — format: `Обновление от DD.MM.YYYY` where the date comes from the changelog entry header.

6. **Extract the version** — use the version/date string from the changelog header (e.g., `2026-02-22`).

Version filenames may contain letters, digits, dots, underscores and hyphens only; reject path separators/traversal. Preserve the selected entry date/version. Inspect existing `backend/prisma/news/*.json` examples; the generated `publishedAt` is the generation timestamp.

7. **Run the generate script** from the `backend/` directory:
   ```bash
   cd backend && npm run news:generate -- --title "Обновление от DD.MM.YYYY" --content "markdown content here" --version "version-string"
   ```

   **Important**: The content argument should be properly escaped for shell. Prefer structured argv, or properly shell-quote every argument while preserving actual newlines and literal `$`/backticks. Never treat JSON.stringify as shell escaping.

8. **Report the result** — show the generated title, version, and the full content. Parse the written JSON and verify title/content/version before reporting its path and full content. The script can report a duplicate with exit 0, so exit status alone does not prove creation. Never run `news:sync` or promise automatic delivery.

### Important
- Do NOT include infrastructure/DevOps changes — users don't care about CI/CD
- Write ONLY in Russian
- Keep it concise — 1-2 sentences per change maximum
- If the script reports a duplicate (version already exists), inform the user and stop
- If `$ARGUMENTS` is provided, use it as additional context or instructions for generating the news
