---
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(git tag:*), Bash(git rev-list:*), Read, Edit
description: Generate or update CHANGELOG.md from git history
---

## Context

- Current branch: !`git branch --show-current`
- Latest tag: !`git tag -l --sort=-creatordate | head -1`
- Current CHANGELOG.md: !`cat CHANGELOG.md 2>/dev/null || echo "File not found"`

## Your task

Generate or update `CHANGELOG.md` based on git commit history.

### Instructions

1. **Determine the range of commits to include:**
   - If `$ARGUMENTS` contains a version string (e.g., `1.2.0`), use it as the new version header
   - If `$ARGUMENTS` contains a commit range or ref (e.g., `v1.0.0..HEAD`), use that range
   - If `$ARGUMENTS` is empty:
     - Find the date of the last entry in CHANGELOG.md and include commits after that date
     - If CHANGELOG.md has no entries, include all commits on the current branch vs main (`git log main..HEAD`)
     - If on main, include commits since the last tag, or last 50 commits if no tags exist

2. **Read the git log** for the determined range using:
   ```
   git log --pretty=format:"%h %s" <range>
   ```

3. **Categorize commits** into these sections (skip empty sections):
   - **Added** — new features, new functionality
   - **Changed** — changes to existing functionality
   - **Fixed** — bug fixes
   - **Removed** — removed features or files
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
   - Include the short commit hash in parentheses at the end of each entry.
   - If no version is specified, use the date as the header: `## YYYY-MM-DD`

5. **Insert the new entry** at the top of CHANGELOG.md (after the header), preserving all existing entries below.

6. **Output a summary** of what was added to the changelog.

### Important
- Do NOT delete or modify existing changelog entries
- Combine trivial/related commits (e.g., multiple "deploy" commits → single entry)
- Write descriptions in English
- Keep entries concise — one line per logical change
