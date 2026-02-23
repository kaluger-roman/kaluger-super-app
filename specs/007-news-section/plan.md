# Implementation Plan: Раздел «Новости»

**Branch**: `007-news-section` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-news-section/spec.md`

## Summary

Раздел «Новости» — новая страница в приложении, отображающая пользователям (репетиторам) информацию об обновлениях приложения на русском языке. Контент извлекается из CHANGELOG.md через backend CLI-скрипт, фильтрующий пользовательски значимые изменения. Бейдж в сайдбаре уведомляет о непрочитанных новостях.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend + backend)
**Primary Dependencies**: React, Effector, MUI (frontend); Express, Prisma (backend)
**Storage**: PostgreSQL через Prisma ORM — две новые таблицы: `news_items`, `news_read_statuses`
**Testing**: Vitest + RTL + MSW (frontend); Jest + Supertest (backend)
**Target Platform**: Web-приложение (SPA + REST API)
**Project Type**: Web (monorepo: frontend + backend)
**Performance Goals**: Загрузка списка новостей < 2 секунд
**Constraints**: Нет новых runtime-зависимостей. Нет админ-панели — новости создаются через CLI-скрипт
**Scale/Scope**: Десятки новостей (по одной на релиз), единицы пользователей

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Design | PASS | Новые слои: page (`news`), feature (`news`), entity (`news`), shared (api, types) — строго по FSD |
| II. Layered MVC | PASS | Routes → Controllers → Prisma. Сервис-слой не нужен (нет бизнес-логики) |
| III. Effector State | PASS | Gates, events, effects, stores, sample — стандартный паттерн |
| IV. Type Safety | PASS | Типы в `types/index.ts` (backend) и `*.types.ts` (frontend), Prisma-generated типы |
| V. Code Consistency | PASS | Named exports, function expressions, index.ts реэкспорты, русские сообщения |
| VI. Testing Discipline | PASS | Backend: Jest + Supertest + real DB. Frontend: Vitest + RTL + MSW |
| VII. Simplicity | PASS | Минимальная реализация: 3 эндпоинта, 1 страница, 1 CLI-скрипт. Нет overengineering |

**Post-Phase 1 Re-check**: Все принципы соблюдены. Нет новых зависимостей. Структура следует существующим паттернам.

## Project Structure

### Documentation (this feature)

```text
specs/007-news-section/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output — resolved decisions
├── data-model.md        # Phase 1 output — entity design
├── quickstart.md        # Phase 1 output — implementation guide
├── contracts/
│   └── news-api.md      # Phase 1 output — API contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   └── schema.prisma          # + NewsItem, NewsReadStatus models
├── src/
│   ├── controllers/
│   │   └── news/
│   │       ├── index.ts
│   │       ├── getNews.ts
│   │       ├── hasUnreadNews.ts
│   │       └── markNewsRead.ts
│   ├── routes/
│   │   └── news.ts
│   ├── scripts/
│   │   └── generateNews.ts    # CLI: parse changelog → create news
│   ├── types/
│   │   └── index.ts           # + NewsItem types
│   └── index.ts               # + mount /api/news

frontend/
├── src/
│   ├── shared/
│   │   ├── api/
│   │   │   ├── news.ts        # newsApi: getNews, hasUnread, markRead
│   │   │   └── index.ts       # + export newsApi
│   │   └── types/
│   │       └── index.ts       # + NewsItem, NewsPagination types
│   ├── entities/
│   │   ├── news/
│   │   │   ├── news.model.ts  # $news, $hasUnread, loadNewsFx, etc.
│   │   │   └── index.ts
│   │   └── index.ts           # + export news entity
│   ├── features/
│   │   └── news/
│   │       ├── models/
│   │       │   ├── news-page.model.ts  # NewsPageGate, page logic
│   │       │   └── index.ts
│   │       ├── ui/
│   │       │   ├── NewsCard/
│   │       │   ├── NewsList/
│   │       │   └── index.ts
│   │       └── index.ts
│   ├── pages/
│   │   ├── news/
│   │   │   ├── NewsPage.tsx
│   │   │   ├── NewsPage.styled.ts
│   │   │   └── index.ts
│   │   └── index.ts           # + export NewsPage
│   ├── widgets/
│   │   └── sidebar/
│   │       └── Sidebar.tsx    # + news menu item with badge
│   └── app/
│       └── components/
│           └── AppRoutes/
│               └── AppRoutes.tsx  # + /news route
```

**Structure Decision**: Web application (Option 2). Новые файлы добавляются в существующую структуру монорепо по установленным паттернам. Никаких новых пакетов или директорий верхнего уровня.
