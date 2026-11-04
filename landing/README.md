# Лендинг Kaluger Tutor

Отдельный пакет Next.js + React + Tailwind. Статический export в `out/`.
Установка — общий [setup на Mac](../docs/local-development.md), затем из `landing/`:

```bash
npm run dev -- --port 3100
npm run lint
npm test
npm run build
```

Порт 3100 — пример: если занят одним из dev-worktree, выберите другой.
Проверки root `npm run check` не включают этот пакет. Для просмотра production
export нужен статический HTTP-сервер для `out/`; `next start` для static export
не используется. Деплой относится к отдельному процессу восстановления продакшена.
