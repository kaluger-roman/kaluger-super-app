# Совместимость рабочего процесса

Исходная версия: `97585332f38b7b9ac5e14aee730f28d84c4fbb4f` (до переноса).
Сокращённые навыки первого варианта миграции заменены полными адаптированными
процедурами. Таблица фиксирует поведение, а не только совпадение названий файлов.

## Команды и параметры

Вызов Codex — `$имя`; старое `/имя` в тексте запроса является alias по инструкции.
`$ARGUMENTS` в procedure означает аргументы пользователя, а не shell expansion.
Legacy `/project:frontend` и dotted `/speckit.*` также сопоставлены с навыками.
Клиентское slash-меню Claude не переносится как меню Codex.

| Прежняя команда | Текущий навык / полный контракт | Проверяемые механики |
| --- | --- | --- |
| auto-feature | [procedure](../.agents/skills/auto-feature/references/procedure.md) | описание, пустой ввод, --new, --resume; spec/mockup approvals, state v1, mock→model, review5/QA3, CI |
| auto-bug-fix | [procedure](../.agents/skills/auto-bug-fix/references/procedure.md) | issue/описание, --new/--resume, диагноз approval, regression, review3/QA3, исходный баг — blocker |
| code-review-local | [procedure](../.agents/skills/code-review-local/references/procedure.md) | --worktree, --base-ref, --threshold, --iter, --feature, --silent; 9 reviewers/scorers, JSON v1 |
| manual-qa | [procedure](../.agents/skills/manual-qa/references/procedure.md) | feature/URL, --host/--fix/--teardown/--context; полная JSON v1, autofix границы, rechecks/coverage |
| qa-roam | [procedure](../.agents/skills/qa-roam/references/procedure.md) | --budget N%, --host, --teardown; seeded выбор/модификаторы, 30-day dedupe, Impact×Effort |
| bug-hunt | [workflow](../.agents/skills/bug-hunt/references/workflow.md) | area, --fix, --report, default issues; 7 workers, top10, bug-hunt label, review5/QA5 |
| improve-hunt | [workflow](../.agents/skills/improve-hunt/references/workflow.md) | area, --fix, --report; 9 workers, top10, improve-hunt label, Quick Wins, review5/QA5 |
| e2e-check | [workflow](../.agents/skills/e2e-check/references/workflow.md) | base-ref, coverage/affected/dead tests, draft scaffolds и tags |
| e2e-hunt | [workflow](../.agents/skills/e2e-hunt/references/workflow.md) | area, 8 workers, top25 journeys, coverage matrix и priority |
| changelog | [workflow](../.agents/skills/changelog/references/workflow.md) | версия, ref/range, --worktree; история и группы, diff без изменения index |
| news | [workflow](../.agents/skills/news/references/workflow.md) | дополнительные инструкции, русский JSON, фильтры, release date/version, duplicate guard |
| score-issues | [workflow](../.agents/skills/score-issues/references/workflow.md) | номера, --all, unscored default; batches8, rubric0–100, JSON validation/retry, единый writer |
| frontend | [skill](../.agents/skills/frontend/SKILL.md) | прежняя writer-роль, FSD/Effector/conventions |
| backend | [skill](../.agents/skills/backend/SKILL.md) | прежняя writer-роль, слои/Prisma/auth/conventions |
| test-frontend | [skill](../.agents/skills/test-frontend/SKILL.md) | прежняя test-writer-роль, Vitest/RTL/MSW |
| test-backend | [skill](../.agents/skills/test-backend/SKILL.md) | прежняя test-writer-роль, Jest/Supertest/изолированная БД |
| speckit.specify | [workflow](../.agents/skills/speckit-specify/references/workflow.md) | шаблон, feature/branch/slug, checklist pass/fail, validation≤3, clarification limits |
| speckit.clarify | [workflow](../.agents/skills/speckit-clarify/references/workflow.md) | ambiguity taxonomy, вопросы/ответы, incremental spec updates |
| speckit.plan | [workflow](../.agents/skills/speckit-plan/references/workflow.md) | research workers, constitution gates, модели/contracts/quickstart, agent context |
| speckit.tasks | [workflow](../.agents/skills/speckit-tasks/references/workflow.md) | IDs, dependencies, story groups, parallel markers и validation |
| speckit.analyze | [workflow](../.agents/skills/speckit-analyze/references/workflow.md) | read-only consistency/coverage, severity, constitution conflicts |
| speckit.checklist | [workflow](../.agents/skills/speckit-checklist/references/workflow.md) | requirements quality, traceability≥80%, Gap/Ambiguity/Conflict/Assumption |
| speckit.constitution | [workflow](../.agents/skills/speckit-constitution/references/workflow.md) | semantic version, dates, dependent artifacts, sync-impact report |
| speckit.implement | [workflow](../.agents/skills/speckit-implement/references/workflow.md) | prerequisite/checklist gate, ordered tasks, tests, progress |
| speckit.taskstoissues | [workflow](../.agents/skills/speckit-taskstoissues/references/workflow.md) | tasks→issues, repo validation, dedupe, traceability/dependencies и scoring |

Дополнительный [create-issue](../.agents/skills/create-issue/SKILL.md) объединяет
общие прежние правила, включая finding provenance labels. Четыре Copilot writer
profiles снова есть в `.github/agents/`; доступность extension-specific tools
проверяется в клиенте, а не выдумывается текстом skill.

## Инструменты и платформенные замены

| Механизм | Реализация и граница |
| --- | --- |
| Стартовый PR | `scripts/start-task-pr.mjs`: прежние CLI flags, empty commit без повреждения index, base lag, draft reuse, Closes/session dedupe, локальный gh |
| Session links | Codex thread ID и команда resume; приватные local paths хранятся локально. Старые Claude session IDs не превращаются в Codex threads |
| PR hook | `.codex/hooks.json` + `scripts/changelog-gate.mjs --hook`; требуется штатное trust через /hooks. Guard `scripts/gh-pr.mjs` и CI — исполняемые дополнительные слои |
| Pre-commit | Сохранены lint-staged, защита partially staged changes и проверки установленного formatter; зависимости каждого worktree самостоятельны |
| QA budget | `scripts/qa-budget.mjs`: start/check, --budget/--source/--state, Codex refresh, stale/missing stop и window rollover. Проценты относятся к выбранному реальному окну аккаунта |
| repo-git | `scripts/repo-git.sh`: прежние Git аргументы локально; удалённое sshfs dispatch намеренно отсутствует, согласно переносу на Mac |
| Agent context | `.specify/scripts/bash/update-agent-context.sh`: alias codex и прежние agent names, Bash3.2 wrapper, atomically updated managed block без стирания ручного текста |
| Панель агентов | [VS Code extension](../scripts/vscode-agents/README.md): 3 views/14 commands, feed/status/notifications, issue board/start/resume; Codex app-server adapter |
| Панель внутри Codex | [Локальный плагин](../scripts/codex-panel/README.md): MCP App с global/thread entrypoints, issues/приоритеты, сессии/лента и подготовка выбранного workflow |
| Живой мониторинг | Нужен общий daemon/socket с наблюдаемыми threads; отдельный app-server читает историю, но не выдаётся за live monitor desktop-процесса |
| State и артефакты | Полный state JSON, legacy import, уникальные iter/report paths, screenshots/state ignored; product specs и конвенции сохранены |
| Worktrees | Назначенный worktree переиспользуется; новая задача из main изолируется локально. Нет SSH/home и общих node_modules |

## Проверка совместимости

Проверки состоят из четырёх разных уровней: сравнение полных процедур с исходными,
независимые сценарии исполнения skill, автоматические регрессии скриптов на
временных репозиториях/fixture API, и интеграционные проверки доступной среды.
Успешный YAML-validator сам по себе не доказывает совместимость поведения.

Панель упаковывается в VSIX, но установка/визуальный запуск VS Code отдельно от
unit/API tests. Доверие новому hook и требуемые GitHub branch protection checks
не появляются автоматически из коммита. Текущая доступность этих интеграций должна
быть явно указана при передаче результата; отсутствие smoke-test не считается pass.
