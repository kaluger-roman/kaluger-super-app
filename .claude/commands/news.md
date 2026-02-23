---
allowed-tools: Bash(cd backend && npm run news:generate*), Read, Bash(git log:*), Bash(git diff:*)
description: Generate a news entry from CHANGELOG.md for end users
---

## Context

- Current CHANGELOG.md: !`cat CHANGELOG.md 2>/dev/null || echo "File not found"`
- Current date: !`date +%Y-%m-%d`

## Your task

Generate a user-facing news entry from the project changelog and save it as a JSON file. The file will be automatically synced to the production database during deployment.

### Instructions

1. **Read `CHANGELOG.md`** and extract the latest entry (the first `## [...]` section).

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

7. **Run the generate script** from the `backend/` directory:
   ```bash
   cd backend && npm run news:generate -- --title "Обновление от DD.MM.YYYY" --content "markdown content here" --version "version-string"
   ```

   **Important**: The content argument should be properly escaped for shell. Use single quotes or heredoc if the content contains special characters.

8. **Report the result** — show the generated title, version, and the full content. Remind the user that the JSON file needs to be committed — it will be synced to the production DB automatically during deployment.

### Important
- Do NOT include infrastructure/DevOps changes — users don't care about CI/CD
- Write ONLY in Russian
- Keep it concise — 1-2 sentences per change maximum
- If the script reports a duplicate (version already exists), inform the user and stop
- If `$ARGUMENTS` is provided, use it as additional context or instructions for generating the news
