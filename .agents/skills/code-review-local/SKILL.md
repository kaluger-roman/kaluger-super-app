---
name: code-review-local
description: "Review local Super App changes with nine independent reviewer roles, independent per-finding scoring, configurable filters and a stable JSON report."
---

# Локальное review: девять ролей и независимый scoring

Выполнить [полную процедуру](references/procedure.md); контракт отчёта —
[report.schema.json](references/report.schema.json).
Флаги: `--worktree PATH`, `--base-ref REF` (default main), `--threshold N` (0–100,
default 50), `--iter N` (default max+1), `--feature SLUG`, `--silent`.
Сохранять committed + working-tree + relevant untracked diff без мутаций index.

Обязательны **девять отдельных независимых reviewers**: AGENTS/conventions, shallow
bugs, deep logic, security, types/contracts, removed behavior, cross-file calls,
wrapper/proxy, hacks/false-positive tests. Затем отдельный независимый scorer для
каждого кандидата. Настроенная модель Codex + maximum supported reasoning effort;
параллельно до лимита слотов, остальные в очереди. Wrapper-worker, ожидающий их,
не занимает слот. Недоступные/failed роли сохранять как пробел покрытия.

Скоринг 0/25/50/75/100, подтверждённый конкретный hack ≥50, сомнение → ниже.
Scorer deadline 30 s от фактического старта; timeout → score null и filtered_out,
не «проблем нет». Deduplicate по первопричине, сохранить источники, final score≥threshold.
Исторический JSON ключ `claude-md` означает нынешние AGENTS.md/конвенции.

Писать `docs/code-reviews/<safe-slug>/iter-<N>.json`, не затирая прошлые итерации;
точные counts, filtered_out и reviewer/scorer statuses обязательны. `--silent`
возвращает только путь. Не менять исходники, не запускать tests/lint/build,
не коммитить/публиковать/comment PR. Обычный final — top-3 + полный JSON + gaps.
