# Навыки проекта

В `.agents/skills/` находятся 26 навыков Codex: аналоги всех 25 прежних команд
из `.claude/commands/` и отдельный `create-issue`. У каждого есть `SKILL.md`
с описанием назначения, этапами, проверками и результатом. Общие правила —
в `AGENTS.md`, подробные соглашения — в `docs/conventions/`.

Это файлы проекта: после коммита они переносятся вместе с репозиторием и доступны
в его worktree. По [документации Codex](https://learn.chatgpt.com/docs/build-skills),
навыки обнаруживаются в `.agents/skills` от текущего каталога до корня репозитория.
Если новый навык не появился в уже открытом клиенте, перезапустите его.

## Как пользоваться

Укажите имя навыка и задачу в сообщении. Можно также описать задачу обычным текстом;
Codex выбирает подходящий навык по его описанию. Старые имена `/speckit.*` стали
`$speckit-*`; остальные имена сохранились с префиксом `$`.

```text
$create-issue Ошибка при переносе оплаченного урока: <шаги и результат>
$create-issue --draft <описание проблемы>
$score-issues 123 124
$changelog
$news
$code-review-local --base-ref origin/main
$bug-hunt --report область расписания
$manual-qa 039-call-fullscreen --host
$auto-bug-fix #123
$speckit-plan 039-call-fullscreen
```

Явный вызов `create-issue`, `score-issues`, `speckit-taskstoissues`, а также
`bug-hunt`/`improve-hunt` в режиме issues включает соответствующие записи в GitHub.
`--draft`, `--report` и обычный запрос на аудит оставляют результат локальным.
Создание этих навыков само по себе не публикует issues или новости.

## Соответствие прежним командам

| Прежняя команда | Навык | Сохранённый сценарий |
| --- | --- | --- |
| Правила создания issues в `CLAUDE.md` и hunt-командах | [create-issue](../.agents/skills/create-issue/SKILL.md) | Подтверждение проблемы, поиск дублей, русский issue, приоритет, проверка записи |
| `/score-issues` | [score-issues](../.agents/skills/score-issues/SKILL.md) | Шкала 0–100, четыре критерия, блок в описании и метки P0–P4 |
| `/changelog` | [changelog](../.agents/skills/changelog/SKILL.md) | История изменений по diff/коммитам, группировка и сохранение старых записей |
| `/news` | [news](../.agents/skills/news/SKILL.md) | Русские продуктовые новости из changelog в JSON через существующий генератор |
| `/frontend` | [frontend](../.agents/skills/frontend/SKILL.md) | React, FSD, Effector, Material UI и проверка поведения |
| `/backend` | [backend](../.agents/skills/backend/SKILL.md) | Express, сервисы, Prisma, права доступа и миграции |
| `/test-frontend` | [test-frontend](../.agents/skills/test-frontend/SKILL.md) | Vitest, Effector, RTL, MSW, изоляция состояния |
| `/test-backend` | [test-backend](../.agents/skills/test-backend/SKILL.md) | Jest/Supertest и настоящая изолированная PostgreSQL |
| `/code-review-local` | [code-review-local](../.agents/skills/code-review-local/SKILL.md) | Проверенные находки, порог оценки, JSON-отчёты по итерациям |
| `/bug-hunt` | [bug-hunt](../.agents/skills/bug-hunt/SKILL.md) | Поиск подтверждённых багов: issues, отчёт или выбранные исправления |
| `/improve-hunt` | [improve-hunt](../.agents/skills/improve-hunt/SKILL.md) | Обоснованные улучшения: issues, отчёт или выбранные изменения |
| `/manual-qa` | [manual-qa](../.agents/skills/manual-qa/SKILL.md) | Приёмочные сценарии в браузере, Markdown/JSON, recheck и опциональные исправления |
| `/qa-roam` | [qa-roam](../.agents/skills/qa-roam/SKILL.md) | Исследование приложения глазами пользователя, доказательства и отчёт |
| `/e2e-check` | [e2e-check](../.agents/skills/e2e-check/SKILL.md) | Покрытие изменений Playwright-тестами, пробелы и опциональные draft-тесты |
| `/e2e-hunt` | [e2e-hunt](../.agents/skills/e2e-hunt/SKILL.md) | Инвентаризация пользовательских сценариев и приоритет пробелов E2E |
| `/auto-feature` | [auto-feature](../.agents/skills/auto-feature/SKILL.md) | Спецификация → макеты при необходимости → план → реализация → review/QA → changelog |
| `/auto-bug-fix` | [auto-bug-fix](../.agents/skills/auto-bug-fix/SKILL.md) | Диагностика → регрессия и исправление → review/QA → changelog |
| `/speckit.specify` | [speckit-specify](../.agents/skills/speckit-specify/SKILL.md) | Спецификация и checklist требований |
| `/speckit.clarify` | [speckit-clarify](../.agents/skills/speckit-clarify/SKILL.md) | Значимые вопросы и внесение ответов в спецификацию |
| `/speckit.plan` | [speckit-plan](../.agents/skills/speckit-plan/SKILL.md) | План, нужные исследования, модели данных, контракты и quickstart |
| `/speckit.tasks` | [speckit-tasks](../.agents/skills/speckit-tasks/SKILL.md) | Задачи с зависимостями, стабильными ID и проверками |
| `/speckit.analyze` | [speckit-analyze](../.agents/skills/speckit-analyze/SKILL.md) | Анализ согласованности spec/plan/tasks без изменений файлов |
| `/speckit.checklist` | [speckit-checklist](../.agents/skills/speckit-checklist/SKILL.md) | Качество требований, полнота, однозначность и измеримость |
| `/speckit.constitution` | [speckit-constitution](../.agents/skills/speckit-constitution/SKILL.md) | Изменение принципов проекта и синхронизация зависимых инструкций |
| `/speckit.implement` | [speckit-implement](../.agents/skills/speckit-implement/SKILL.md) | Выполнение плана с актуальными задачами и доказательствами проверок |
| `/speckit.taskstoissues` | [speckit-taskstoissues](../.agents/skills/speckit-taskstoissues/SKILL.md) | Задачи → issues с дедупликацией, зависимостями и картой ID → URL |

Процедуры четырёх прежних `.github/agents/*-writer.agent.md` также представлены
навыками `frontend`, `backend`, `test-frontend`, `test-backend`. Конвенции остаются
источником подробных правил; их не копируют целиком в каждый навык.

## Что адаптировано

- Локальные `git`, Docker и браузер на Mac; текущий checkout/worktree и его порты.
  SSH, sshfs, `repo-git.sh` и общие `node_modules` больше не нужны.
- Нет зависимости от конкретной модели Claude, его `Agent`/`EnterWorktree`, hooks,
  `$ARGUMENTS`, автоподстановок shell в Markdown и пятичасового лимита подписки.
  Задача и параметры берутся из сообщения, лимит QA — из области, сценариев или времени.
- Сами процессы с сабагентами сохранены: девять углов review и отдельный scoring,
  параллельные hunt-аудиты, пачки issues, этапы auto-* и research для плана.
  [Протокол и роли](subagents.md) задают очередь при нехватке слотов, max effort
  для анализа/реализации/review и проверку результатов основным агентом.
- Комплексные навыки сохраняют прогресс и ограничивают повторные review/QA.
  `--checkpoints` включает остановки для проверки спецификации/макетов или диагноза;
  без него уже согласованные решения не требуют повторного подтверждения.
- Review/changelog не меняют Git index ради получения diff. Отчёты не перезаписывают
  предыдущие итерации. Точное имя спецификации учитывает повторяющиеся числовые ID.
- `news` готовит JSON; `news:sync` и восстановление продакшена остаются отдельной
  задачей. Инфраструктурные изменения не становятся продуктовыми новостями.

Оригинальные команды сохранены в Git-истории до миграции. Текущие навыки следует
менять вместе с соответствующими скриптами и конвенциями, если процесс меняется.
