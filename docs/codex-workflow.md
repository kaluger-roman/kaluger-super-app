# Работа с Codex

Это перенос прежнего процесса на локальный Mac. Полные процедуры находятся в
`.agents/skills/<name>/references/`, входы — в `SKILL.md`; связанный полный документ
обязателен к чтению при выполнении навыка. [Каталог](skills.md),
[делегирование](subagents.md), [совместимость](workflow-compatibility.md).

## Задача и Git

1. Проверить текущий checkout, ветку, изменения и относящиеся конвенции.
2. Использовать уже назначенный Codex worktree или task-ветку. Новая задача из main
   получает отдельный локальный worktree в `.worktrees/`, от свежего `origin/main`.
   Не создавать вложенные worktrees. Detached HEAD именовать `codex/<task>` до push.
   Каждый checkout имеет собственные зависимости, Docker БД и порты.
3. В начале задачи открыть draft PR:

   ```bash
   node scripts/start-task-pr.mjs --title 'Краткое название' --summary 'Описание' --closes 123
   ```

   `--closes` только для полностью решаемого issue. Скрипт восстанавливает прежние
   пустой стартовый коммит при необходимости, push, поиск существующего PR,
   дедупликацию `Closes`, проверку отставания базы и привязку сессии Codex.
   `--base`, `--session-id`, `--resume-cwd`, `--web-session-id` сохранены. Последний —
   совместимый старый вход, а не обещание существования Claude web-сессии в Codex.
   Локальные пути продолжения хранятся в приватном Git-файле `codex-task-sessions.json` (путь через `git rev-parse --git-path`), не в публичном PR.
4. Во время review/QA не коммитить между раундами. Фиксы проверяются по рабочему diff.
5. После завершения обновить changelog, выполнить затронутые проверки (для кода
   frontend/backend — `npm run check -- --full` перед коммитом), коммитить и пушить
   task-ветку без дополнительного вопроса, дождаться CI и исправить ошибки.
6. `news`, PR ready, merge, deploy, push в main и force-push требуют отдельной явной
   команды. Не закрывать частично решённый issue через `Closes`.

Read-only, draft/report-режимы и явно заданный пользователем локальный результат
не создают PR/issues и не пушат. Конкретный пользовательский delivery scope имеет
приоритет. Существующий PR обновляется, новый не создаётся.

## Оркестрация и продолжение

`$auto-feature`: spec → **согласование** → настоящие mockup-компоненты в целевых
FSD-путях и screenshots desktop/mobile → **согласование** → clarify/plan/tasks →
реализация с заменой mock/TODO на настоящий model → review → QA → changelog/Git/CI.
`$auto-bug-fix`: диагностика → **согласование** → регрессия и фикс → review → QA →
changelog/Git/CI. Backend-only фичи пропускают неприменимые mockups/браузер.

Checkpoint по умолчанию обязателен. `--checkpoints` остаётся совместимым явным
синонимом. Сохранённое согласование не запрашивается повторно без изменения артефакта.

Состояние: `.codex/workflow/auto-feature/<slug>/state.json` и
`.codex/workflow/auto-bug-fix/<slug>/state.json`, включая версии схемы, фазы,
согласования, артефакты, review/QA итерации и следующий шаг. `--resume <slug>`,
`--new <описание>` и выбор активного запуска при пустом вводе сохраняются.
Legacy `.claude/auto-*` импортируется с сохранением исходника и проверки путей,
а не молча отбрасывается. Полная процедура импорта — в runtime-reference auto-feature.

Review: девять независимых ролей, отдельные scorer'ы, порог 50. Лимиты auto-feature
5, auto-bug-fix 3. Сигнатура `category:file:line:title[0:30]`, ≥80% повторения —
convergence с фиксацией причины остановки. QA до трёх раундов с обязательными context
JSON, `must_check`, очередью `recheck`, накопленным coverage и причинами
`clean/exhausted/cap`. Повтор исходного бага блокирует завершение bug-fix.
`bug-hunt --fix` и `improve-hunt --fix` сохраняют свои лимиты 5 review / 5 QA.

## Спецификации

Сохраняются все этапы `$speckit-*`, шаблоны и артефакты. Числовые префиксы в истории
могут повторяться: использовать полное имя, отдельно от `codex/` в имени ветки.

```bash
SPECIFY_FEATURE=039-call-fullscreen bash .specify/scripts/bash/check-prerequisites.sh --json
SPECIFY_FEATURE=039-call-fullscreen bash .specify/scripts/bash/update-agent-context.sh codex
```

Генератор обновляет только управляемый блок контекста; ручные инструкции AGENTS
сохраняются. Полные циклы validation/checklists, traceability и стоп-условия
constitution находятся в соответствующих навыках.

## Поиск проблем и issues

Подтверждённые посторонние проблемы не расширяют текущую правку: создаётся русский
issue после поиска дублей, затем оценка через `score-issues`, ссылка/оценка в итоге.
Использовать `create-issue`, а не переписывать правила оформления каждый раз.
Существующий issue переиспользуется; комментарий требует соответствующей авторизации.

Hunt: до 10 итоговых находок, метки `bug-hunt`/`improve-hunt` вместе с типом,
Impact × Effort и Quick Wins для улучшений; E2E hunt — до 25 journeys. Работники
параллельны, дедупликация и публикация — у основного агента. `--report`/`--draft`
оставляют результат локальным; `--fix` соблюдает полный review/QA workflow.

## QA

[Dev-стек](dev-stack.md), [production-build QA](qa-docker.md). Проверять реальные
эффекты UI/API, негативные пути, права, два пользователя и responsive layout по
применимости. `manual-qa` сохраняет прежние Markdown и JSON schema v1, включая
`feature_id`, `readiness`, `coverage`, `recheck_results`, `unambiguous_fix`,
`autofix_status` и сведения о файлах/тестах фикса. Схема в полном reference.
`--fix` не разрешает миграции, изменение публичного API, архитектуры или package.json.

`qa-roam`: seeded random выбор 2–3 областей, модификаторы, дедупликация по отчётам
за 30 дней, Impact × Effort/Quick Wins. `--budget N%` восстановлен:

```bash
node scripts/qa-budget.mjs start --budget 20% --refresh
node scripts/qa-budget.mjs check --refresh
```

Бюджет измеряется по **реальному выбранному окну Codex**, с duration/reset в ответе,
а не предполагаемым пятичасовым окном Claude. Это расход всего аккаунта во время
прогона, включая параллельные задачи. Данные обновляются перед каждой проверкой;
отсутствующие/протухшие данные дают stop, не разрешение продолжать бесконечно.
`--source`, `--state` и прежние переменные совместимости описаны в навыке.

## Автоматическая проверка changelog

`.codex/hooks.json` регистрирует PreToolUse → `scripts/changelog-gate.mjs --hook`.
Codex требует доверия **к конкретному hook**: просмотрите его через `/hooks` и
подтвердите в интерфейсе. Не используйте обход hook trust. До активации hook нельзя
называть блокировку всех shell-вызовов работающей. [Официальные hooks](https://learn.chatgpt.com/docs/hooks).

Для публикации есть исполняемый guard независимо от hook:

```bash
node scripts/gh-pr.mjs create --draft --body-file /path/to/body.md
node scripts/gh-pr.mjs ready 123
```

Обычный `gh` используется для остальных операций. `start-task-pr.mjs` также вызывает
проверку; только пустой стартовый draft имеет прежнее исключение. CI содержит
Changelog gate, в том числе при ready_for_review; обязательность status check в
branch protection зависит от настроек GitHub и не устанавливается этим коммитом.
Git pre-commit по-прежнему отвечает за lint/format, а не заменяет PR hook.

## Панель агентов и границы среды

Возвращена [панель VS Code](../scripts/vscode-agents/README.md): сессии, лента,
уведомления, issues, связь issue→сессия и запуск навыков. Используется Codex API,
локальный gh и корректно экранированные команды. Живые статусы требуют подключения
к тому же app-server, где работают сессии; fallback истории явно обозначается.

Продуктовые news — русский JSON через существующий генератор, без DB write.
Скрипт deploy сохранён как исторический механизм; недоступный VPS и будущий перенос
на home не входят в локальный процесс. Продовые данные и бэкапы не используются.
