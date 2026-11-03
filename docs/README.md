# Карта документации

## Текущая разработка

- [README](../README.md) — быстрый запуск и структура.
- [AGENTS.md](../AGENTS.md) — общие инструкции Codex; в пакетах есть уточнения.
- [Подготовка Mac](local-development.md) — инструменты, зависимости, worktree, env.
- [Работа с Codex](codex-workflow.md) — задачи, спецификации, review, QA, PR.
- [Навыки Codex](skills.md) — все перенесённые команды, создание issues, changelog и news.
- [Сабагенты](subagents.md) — независимые reviewer-роли, параллельные аудиты и этапы разработки.
- [Dev-стек](dev-stack.md) — HMR, отдельные базы и порты.
- [QA Docker](qa-docker.md) — проверка production-сборки в одноразовом окружении.
- [Frontend](conventions/frontend.md), [backend](conventions/backend.md),
  [frontend tests](conventions/frontend-testing.md),
  [backend tests](conventions/backend-testing.md), [E2E](conventions/e2e-testing.md).
- [Приоритет issues](issue-priority.md), [lint roadmap](lint-roadmap.md).

## Требования и история

`specs/` сохраняет существующие требования и контракты. Датированные QA-отчёты,
review JSON, mockups и исследования фиксируют состояние на момент проверки.
Упоминания Claude, `home`, старых портов и команд в них — история, а не инструкции
для новой сессии. Для текущей среды используйте документы выше.

## Операционные материалы

[Бэкапы](ops/offsite-backups.md) и [TURN](ops/turn-relay.md) описывают прежнюю схему
VPS + `home`. По состоянию на 03.11.2026 VPS недоступен. Их оставили для будущего
восстановления; локальная разработка не запускает эти процедуры.
