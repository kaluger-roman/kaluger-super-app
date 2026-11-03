---
name: news
description: "Create Russian user-facing Super App news JSON from a changelog entry; excludes infrastructure-only changes and does not publish to a database."
---

# Prepare product news

Read `AGENTS.md`, the requested entry in `CHANGELOG.md` (latest if unspecified), and
existing `backend/prisma/news/*.json` examples. Headers may be date-only or bracketed
versions. Keep the selected release's date/version; do not substitute today's date.

1. Include only user-visible Added/Changed/Fixed/Removed/Security items. Exclude
   infrastructure, CI, developer docs, agent skills and refactors without user impact.
   If nothing remains, explain why and create no file.
2. Rewrite in concise Russian, focusing on what improved for a tutor/student.
   Use **Новое**, **Изменено**, **Исправлено**, **Удалено**, **Безопасность** as needed,
   with bullets and no `###` headings. Avoid implementation jargon and exaggerated claims.
3. Title: `Обновление от DD.MM.YYYY`; version comes from the entry. Restrict the
   version filename to letters, digits, dots, underscores and hyphens, with no path
   separators/traversal. If that version already exists, report it without overwriting
   or inventing another version; editing existing news requires an edit request.
4. Generate via the existing script, which writes JSON without database access:

```bash
npm --prefix backend run news:generate -- --title 'Обновление от DD.MM.YYYY' --content 'Текст новости' --version 'YYYY-MM-DD'
```

Pass text through structured argv or proper shell quoting, preserving newlines and
literal `$`/backticks. Inspect `backend/src/scripts/generateNews.ts` if needed; the
result has `title`, `content`, `version`, `publishedAt` (generation timestamp).
Parse the written JSON, compare its text/version, and show the path/title/content.
A duplicate is reported with exit 0 by the script: verify file contents instead of
claiming a new file was created based only on the exit code.

The result is a local source artifact for a future release. Do not run `news:sync`,
write to production, or promise automatic delivery while production is unavailable.
