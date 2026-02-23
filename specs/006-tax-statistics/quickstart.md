# Quickstart: 006-tax-statistics

## Порядок реализации

### 1. Backend: миграция и типы
```bash
# Добавить taxRate в schema.prisma, затем:
cd backend
npm run db:migrate       # Создать миграцию
npm run db:generate      # Обновить Prisma client
npm run db:migrate:test  # Применить к тестовой БД
```

### 2. Backend: контроллер профиля
- Расширить `updateProfile` в `controllers/auth.ts`: принять `taxRate`, валидировать 0–100
- Добавить `taxRate` в `select` всех запросов, возвращающих User

### 3. Backend: контроллер статистики
- В `getStatistics.ts`: добавить запрос `user.taxRate` в `Promise.all`
- Рассчитать `taxAmount = Math.round(earnings * taxRate / 100)`
- Добавить в ответ

### 4. Backend: тесты
- Тест updateProfile с валидным taxRate
- Тест updateProfile с невалидным taxRate (< 0, > 100)
- Тест getStatistics с кастомным taxRate
- Тест getStatistics с дефолтным taxRate (6%)

### 5. Frontend: типы и API
- Добавить `taxRate` в тип `User`
- Добавить `taxAmount` в тип `Statistics`
- Расширить `authApi.updateProfile` для передачи `taxRate`

### 6. Frontend: профиль
- Добавить `$taxRate`, `taxRateChanged` в `profile.model.ts`
- Расширить `updateProfileFx` для отправки `taxRate`
- Добавить TextField для ставки налога в `ProfilePage.tsx`

### 7. Frontend: дашборд статистики
- Добавить карточку «Налоги» в `FinancialStatistics.tsx`
- Отображать `statistics.taxAmount` в формате валюты

### 8. Frontend: тесты
- Тест profile.model: изменение и сохранение taxRate
- Тест FinancialStatistics: отображение карточки налога

## Проверка

```bash
# Backend
cd backend
npm run lint
npx tsc --noEmit
npm test

# Frontend
cd frontend
npm run lint
npx tsc --noEmit
npm test
npm run find-cycle
```
