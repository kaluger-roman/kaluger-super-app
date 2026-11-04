# Frontend Kaluger Tutor

React + TypeScript + Effector + Material UI; сборка CRA/Craco.
Feature-Sliced Design: pages → features → entities → shared.

Установка и запуск выполняются из корня репозитория по
[локальной инструкции](../docs/local-development.md). Сервер запускается через
`bash scripts/dev-stack.sh run-frontend`, чтобы API, WebSocket и порты совпадали
с текущим checkout. Не полагайтесь на стандартный порт CRA 3000.

Из `frontend/`:

```bash
npm test                 # Vitest, однократный прогон
npm test -- path         # выбранные тесты
npm run lint
npx tsc --noEmit
npm run format:check
npm run build
```

[Конвенции](../docs/conventions/frontend.md) ·
[Unit/component tests](../docs/conventions/frontend-testing.md) · [E2E](e2e/README.md).

Алиасы: `@app`, `@pages`, `@features`, `@entities`, `@shared`, `@components`, `@widgets`.
Импортируйте публичные barrel API, например `import { X } from "@entities/student"`.
