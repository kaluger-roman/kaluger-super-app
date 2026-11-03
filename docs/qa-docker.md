# Локальный QA-стек Docker

Для проверки production-сборки на Mac используйте `scripts/qa-stack.sh`.
Он собирает frontend (nginx), backend и отдельный PostgreSQL. `home` и прежний VPS
не используются. Это локальный QA, а не публикация приложения.

```text
Браузер на Mac → http://localhost:<порт> → nginx → backend → PostgreSQL
```

Имя `qa-<checkout>-<hash пути>` изолирует контейнеры, сети и тома для main, веток и
detached Codex worktree. Только nginx публикует случайный свободный порт на
`127.0.0.1`; backend/БД остаются в сети Docker.

## Запуск

```bash
open -a Docker
bash scripts/qa-stack.sh up
bash scripts/qa-stack.sh port
bash scripts/qa-stack.sh status
bash scripts/qa-stack.sh exec-backend 'npm run db:seed'
bash scripts/qa-stack.sh psql 'select email from users limit 5;'
bash scripts/qa-stack.sh down
```

`up` печатает JSON с URL, тестовым админом и путём env. Первый запуск требует
скачивания образов и npm-пакетов; последующие используют Docker build cache.
Образы собираются для архитектуры Mac без обязательного `linux/amd64`/эмуляции.

База изначально пустая, миграции применяются при старте. Demo seed выполняется
в контейнере и выводит доступы. Тестовый админ: `admin@qa.local` / `QaAdmin!2026`.
Resend настроен фиктивным ключом: реальная доставка писем не работает. Коды для
локальных проверок можно читать из БД. Не подставляйте продовые ключи/данные.

Стек остаётся работать после проверки, чтобы пользователь мог открыть URL.
`down` удаляет **весь QA-том с тестовыми данными** и `.qa/<project>.env`.
В отличие от dev `down`, здесь данные одноразовые. Общего `down-all` нет.

## Проверка и отчёт

Используйте доступный браузерный инструмент либо Playwright проекта. Проверяйте
фактические пользовательские сценарии, негативные случаи, адаптивность и realtime.
Фиксируйте ветку/commit, URL, шаги и результат; не объявляйте непроверенное успешным.
Постоянные сценарии оформляйте в E2E по `docs/conventions/e2e-testing.md`.

Для исследовательского QA заранее ограничьте область, число сценариев или время.
Приватный statusline/процент лимита Claude больше не используется. Подробный
процесс и места исторических отчётов — в [workflow Codex](codex-workflow.md).
