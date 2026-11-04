# Kaluger Super App

Приложение для репетиторов: ученики, расписание, оплаты, статистика, кабинет ученика
и видеозвонки. Интерфейс на русском.

| Каталог | Назначение |
| --- | --- |
| `frontend/` | React + TypeScript + Effector + Material UI, CRA/Craco |
| `backend/` | Express + TypeScript + Prisma + PostgreSQL |
| `landing/` | Next.js, статический лендинг |
| `specs/` | Требования, планы, контракты и история функций |
| `docs/` | Конвенции, разработка, QA и операционные инструкции |

## Быстрый старт на Mac

```bash
nvm install
nvm use
bash scripts/setup-local.sh
open -a Docker
bash scripts/dev-stack.sh up
```

В двух отдельных терминалах из корня проекта:

```bash
bash scripts/dev-stack.sh run-backend
bash scripts/dev-stack.sh run-frontend
```

Адреса: `bash scripts/dev-stack.sh ports`. Демо-данные:
`bash scripts/dev-stack.sh seed` (печатает доступы). В каждой рабочей копии собственные
порты и БД. Лендинг отдельно: `npm --prefix landing run dev -- --port 3100`.

[Подготовка Mac](docs/local-development.md) · [Dev-стек](docs/dev-stack.md) ·
[Работа с Codex](docs/codex-workflow.md) · [Навыки](docs/skills.md) ·
[Карта документации](docs/README.md).

На 03.11.2026 разработка перенесена на Mac. Прежний VPS недоступен;
`home` пока не является новым продом. Восстановление и перенос продакшена — отдельная задача.
