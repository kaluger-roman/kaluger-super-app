# Quickstart: Раздел «Новости»

**Branch**: `007-news-section` | **Date**: 2026-02-22

## Обзор

Раздел «Новости» отображает пользователям информацию об обновлениях приложения, извлечённую из changelog. Включает бейдж непрочитанных новостей в сайдбаре.

## Порядок реализации

### Этап 1: Backend — модель данных

1. Добавить модели `NewsItem` и `NewsReadStatus` в `backend/prisma/schema.prisma`
2. Создать и применить миграцию: `npm run db:migrate`

### Этап 2: Backend — API эндпоинты

1. Типы: добавить DTO в `backend/src/types/index.ts`
2. Контроллеры: создать `backend/src/controllers/news/`
   - `getNews.ts` — список с пагинацией
   - `hasUnreadNews.ts` — проверка непрочитанных
   - `markNewsRead.ts` — отметить прочитанными
   - `index.ts` — реэкспорт
3. Роуты: создать `backend/src/routes/news.ts`
4. Подключить роут в `backend/src/index.ts`: `app.use("/api/news", newsRoutes)`

### Этап 3: Backend — скрипт генерации новостей

1. Создать `backend/src/scripts/generateNews.ts`
   - Парсит `CHANGELOG.md`
   - Фильтрует пользовательски значимые секции (Added, Changed, Fixed, Removed, Security)
   - Формирует заголовок и контент на русском
   - Создаёт запись `NewsItem` через Prisma
   - Проверяет дубликаты по `version`
2. Добавить npm-скрипт: `"news:generate": "tsx src/scripts/generateNews.ts"`

### Этап 4: Frontend — API и entity

1. API: создать `frontend/src/shared/api/news.ts` с методами
2. Типы: добавить `NewsItem`, `NewsPagination` в `frontend/src/shared/types/index.ts`
3. Entity: создать `frontend/src/entities/news/news.model.ts`

### Этап 5: Frontend — страница и навигация

1. Страница: создать `frontend/src/pages/news/NewsPage.tsx`
2. Feature: создать `frontend/src/features/news/` с моделью и UI-компонентами
3. Роут: добавить `/news` в `AppRoutes.tsx`
4. Сайдбар: добавить пункт «Новости» с бейджем в `Sidebar.tsx`

### Этап 6: Интеграция с changelog

1. Обновить документацию/workflow для включения `npm run news:generate` после `/changelog`

## Ключевые файлы

| Артефакт                      | Путь                                           |
|-------------------------------|-------------------------------------------------|
| Prisma schema                 | `backend/prisma/schema.prisma`                  |
| Типы (backend)                | `backend/src/types/index.ts`                    |
| Контроллеры                   | `backend/src/controllers/news/`                 |
| Роуты                         | `backend/src/routes/news.ts`                    |
| Скрипт генерации              | `backend/src/scripts/generateNews.ts`           |
| API клиент (frontend)         | `frontend/src/shared/api/news.ts`               |
| Типы (frontend)               | `frontend/src/shared/types/index.ts`            |
| Entity модель                 | `frontend/src/entities/news/news.model.ts`      |
| Feature модель                | `frontend/src/features/news/models/`            |
| Страница                      | `frontend/src/pages/news/NewsPage.tsx`           |
| Сайдбар                       | `frontend/src/widgets/sidebar/Sidebar.tsx`       |
| Роутинг                       | `frontend/src/app/components/AppRoutes/`         |

## Зависимости

- Нет новых runtime-зависимостей
- Используются существующие: Prisma, Express, React, Effector, MUI
- `tsx` для запуска TypeScript-скриптов (уже установлен или `npx tsx`)
