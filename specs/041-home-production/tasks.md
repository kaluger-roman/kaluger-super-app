# Выполнение

- [x] Проверить машину, бэкапы и конфигурацию без вывода секретов.
- [x] Подтвердить LAN/Tailscale scope и разрешение миграции.
- [x] Создать isolated worktree/task-ветку и draft PR.
- [x] Подготовить production compose, Dockerfiles и nginx.
- [x] Сохранить серверные runtime-секреты отдельно от dev.
- [x] Восстановить внешний доступ home после отключения потерянного exit node.
- [x] Восстановить production-БД и проверить агрегаты (4 / 31 / 1494).
- [x] Проверить Prisma migration status/deploy перед запуском backend: 44, pending нет.
- [x] Собрать и запустить все production-сервисы.
- [x] Включить приватный HTTPS и проверить IP клиента через прокси.
- [x] Проверить новый бэкап, health, WebSocket, изоляцию и перезапуск.
- [x] По отдельному разрешению остановить старые dev/QA-контейнеры и obsolete cron.
- [x] Обновить runbook, infrastructure boundary и changelog.
- [x] Выполнить локальные scripts-проверки: 195 passed / 145 Linux-only skipped.
- [ ] Завершить повторное review, commit/push и дождаться CI draft PR #206.
