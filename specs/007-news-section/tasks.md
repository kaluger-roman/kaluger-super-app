# Tasks: Раздел «Новости»

**Input**: Design documents from `/specs/007-news-section/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/news-api.md, quickstart.md

**Tests**: Not explicitly requested in spec — test tasks omitted.

**Organization**: Tasks grouped by user story. US1 and US3 are both P1; US1 first (enables viewing), US3 second (enables content creation). US2 is P2 (enhancement).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Prisma models, migration, and shared types that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 Add `NewsItem` and `NewsReadStatus` models to `backend/prisma/schema.prisma` per data-model.md (fields: id, title, content, version, publishedAt, createdAt, updatedAt for NewsItem; id, userId, lastReadAt for NewsReadStatus with unique userId and cascade delete)
- [x] T002 Run Prisma migration from `backend/`: `npm run db:migrate` (migration name: `add-news`)
- [x] T003 Add news-related types to `backend/src/types/index.ts`: `NewsItemResponse` (id, title, content, version, publishedAt, createdAt), `NewsPaginationResponse` (page, limit, total, totalPages)

**Checkpoint**: Database schema ready, types defined — user story implementation can begin

---

## Phase 2: User Story 1 — Просмотр новостей (Priority: P1) 🎯 MVP

**Goal**: Пользователь открывает раздел «Новости» и видит список обновлений приложения на русском языке с пагинацией. При пустом списке — сообщение «Пока нет новостей».

**Independent Test**: Вручную создать записи NewsItem в БД, открыть /news и проверить отображение списка. Проверить пустое состояние.

### Backend

- [x] T004 [US1] Create `getNews` controller in `backend/src/controllers/news/getNews.ts` — per contracts/news-api.md: query params `page` (default 1), `limit` (default 20); response `{ news: NewsItemResponse[], pagination: NewsPaginationResponse }`; sort by `publishedAt` DESC; use `AuthRequest` type
- [x] T005 [US1] Create controllers index in `backend/src/controllers/news/index.ts` — re-export `getNews`
- [x] T006 [US1] Create news routes in `backend/src/routes/news.ts` — apply `authenticateToken` to all routes; `GET /` → `getNews`
- [x] T007 [US1] Mount news routes in `backend/src/index.ts` — import newsRoutes and add `app.use("/api/news", newsRoutes)` after existing route mounts

### Frontend

- [x] T008 [P] [US1] Add frontend types to `frontend/src/shared/types/index.ts` — `NewsItem` (id, title, content, version, publishedAt, createdAt), `NewsPagination` (page, limit, total, totalPages), `NewsListResponse` (news: NewsItem[], pagination: NewsPagination)
- [x] T009 [P] [US1] Create news API client in `frontend/src/shared/api/news.ts` — `newsApi.getAll(page, limit): Promise<NewsListResponse>` using `api.get("/news", { params })`; export from `frontend/src/shared/api/index.ts`
- [x] T010 [US1] Create news entity model in `frontend/src/entities/news/news.model.ts` — stores: `$news` (NewsItem[]), `$pagination` (NewsPagination | null), `$isNewsLoading`; effects: `loadNewsFx`; events: `loadNews`, `loadMoreNews`; sample logic to load and append news. Create `frontend/src/entities/news/index.ts` namespace export and add to `frontend/src/entities/index.ts`
- [x] T011 [US1] Create news feature model in `frontend/src/features/news/models/news-page.model.ts` — `NewsPageGate` (createGate); on gate open → trigger `newsModel.loadNews`; create `frontend/src/features/news/models/index.ts` namespace export
- [x] T012 [P] [US1] Create `NewsCard` component in `frontend/src/features/news/ui/NewsCard/` — displays single news item: title, publishedAt (formatted date), content (rendered Markdown); MUI Card-based; styled-component file `NewsCard.styled.ts`; index.ts export
- [x] T013 [P] [US1] Create `NewsList` component in `frontend/src/features/news/ui/NewsList/` — maps `$news` to `NewsCard` list; shows «Пока нет новостей» empty state; pagination «Загрузить ещё» button when more pages available; index.ts export
- [x] T014 [US1] Create feature exports in `frontend/src/features/news/ui/index.ts` and `frontend/src/features/news/index.ts` — re-export models and UI components
- [x] T015 [US1] Create `NewsPage` in `frontend/src/pages/news/NewsPage.tsx` and `frontend/src/pages/news/NewsPage.styled.ts` — use `useGate(NewsPageGate)`; render page title «Новости» and `NewsList`; follow existing page patterns (StudentsPage). Create `frontend/src/pages/news/index.ts` and add export to `frontend/src/pages/index.ts`
- [x] T016 [US1] Add `/news` route to `frontend/src/app/components/AppRoutes/AppRoutes.tsx` — wrap `NewsPage` with `ProtectedRoute`; add «Новости» item to sidebar `navigationItems` array in `frontend/src/widgets/sidebar/Sidebar.tsx` with NewspaperIcon (from MUI icons)

**Checkpoint**: Раздел «Новости» полностью функционален — список с пагинацией, пустое состояние, навигация через сайдбар

---

## Phase 3: User Story 2 — Индикатор непрочитанных новостей (Priority: P2)

**Goal**: Бейдж на пункте «Новости» в сайдбаре показывает наличие новых непрочитанных новостей. При посещении раздела бейдж исчезает.

**Independent Test**: Создать новость в БД, проверить бейдж в сайдбаре, открыть /news, убедиться что бейдж исчез.

### Backend

- [x] T017 [P] [US2] Create `hasUnreadNews` controller in `backend/src/controllers/news/hasUnreadNews.ts` — per contracts: find `NewsReadStatus` by userId; if not exists and news exist → `{ hasUnread: true }`; if `lastReadAt < latest publishedAt` → `{ hasUnread: true }`; else `{ hasUnread: false }`
- [x] T018 [P] [US2] Create `markNewsRead` controller in `backend/src/controllers/news/markNewsRead.ts` — per contracts: upsert `NewsReadStatus` with `lastReadAt = new Date()`; response `{ message: "Новости отмечены как прочитанные" }`
- [x] T019 [US2] Update `backend/src/controllers/news/index.ts` to re-export `hasUnreadNews` and `markNewsRead`; add `GET /has-unread` and `POST /mark-read` routes to `backend/src/routes/news.ts`

### Frontend

- [x] T020 [US2] Add `hasUnread` and `markRead` methods to `frontend/src/shared/api/news.ts` — `newsApi.hasUnread(): Promise<{ hasUnread: boolean }>` via `GET /news/has-unread`; `newsApi.markRead(): Promise<void>` via `POST /news/mark-read`
- [x] T021 [US2] Add unread tracking to `frontend/src/entities/news/news.model.ts` — store: `$hasUnread` (boolean, default false); effects: `checkUnreadFx` (calls `newsApi.hasUnread`), `markReadFx` (calls `newsApi.markRead`); events: `checkUnread`, `markRead`; sample logic: on checkUnreadFx.doneData → set $hasUnread, on markReadFx.done → set $hasUnread to false
- [x] T022 [US2] Update `frontend/src/features/news/models/news-page.model.ts` — on `NewsPageGate.open` → trigger `newsModel.markRead` (mark news as read when page opens); on `markReadFx.done` → `$hasUnread` becomes false
- [x] T023 [US2] Add Badge to sidebar in `frontend/src/widgets/sidebar/Sidebar.tsx` — import `newsModel` from entities; use `useUnit(newsModel.$hasUnread)`; wrap NewspaperIcon with MUI `Badge` component (color="error", variant="dot") when `hasUnread` is true; trigger `newsModel.checkUnread` on app init or sidebar mount

**Checkpoint**: Бейдж отображается/скрывается корректно, прочтение фиксируется на сервере

---

## Phase 4: User Story 3 — Создание новости из changelog (Priority: P1)

**Goal**: CLI-скрипт парсит CHANGELOG.md, фильтрует пользовательски значимые изменения (Added, Changed, Fixed, Removed, Security), генерирует заголовок и контент на русском, создаёт запись NewsItem в БД. Не создаёт дубликаты.

**Independent Test**: Обновить CHANGELOG.md, запустить `npm run news:generate`, проверить появление записи в БД. Запустить повторно — дубликат не должен создаваться.

### Implementation

- [x] T024 [US3] Create `generateNews` CLI script in `backend/src/scripts/generateNews.ts` — read and parse `../../CHANGELOG.md` (Keep a Changelog format); extract latest entry (between first and second `## ` headers); filter sections: include Added→«Новое», Changed→«Изменено», Fixed→«Исправлено», Removed→«Удалено», Security→«Безопасность»; skip Infrastructure section entirely; generate title from date/version (e.g. «Обновление от 22.02.2026»); compose content as Markdown list in Russian; check for duplicate by `version` field; create NewsItem via Prisma; log result to console
- [x] T025 [US3] Add `news:generate` npm script to `backend/package.json` — `"news:generate": "npx tsx src/scripts/generateNews.ts"`; also add `news:generate:test` variant with `dotenv -e .env.test` for test DB

**Checkpoint**: Новости создаются из changelog без дубликатов, текст на русском языке

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and workflow integration

- [x] T026 Update `CLAUDE.md` to document `npm run news:generate` command in Backend commands section and update the changelog workflow note to include news generation step after `/changelog`
- [x] T027 Verify all quality gates pass: run `npm run lint` and `npx tsc --noEmit` in both `frontend/` and `backend/`; run `npm run find-cycle` in `frontend/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately. BLOCKS all user stories
- **US1 (Phase 2)**: Depends on Foundational completion — delivers MVP viewing
- **US2 (Phase 3)**: Depends on Foundational completion — can start in parallel with US1 (backend), but frontend integration needs Sidebar changes from US1 T016
- **US3 (Phase 4)**: Depends on Foundational completion only — fully independent CLI script
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundational → US1. No dependencies on other stories
- **US2 (P2)**: Foundational → US2. Frontend T023 depends on sidebar item existing (US1 T016)
- **US3 (P1)**: Foundational → US3. Fully independent — only needs Prisma models

### Within Each User Story

- Backend controllers → routes → mount
- Frontend types → API → entity model → feature model → UI → page → routing

### Parallel Opportunities

**Within Foundational:**
- T001 → T002 → T003 (sequential — migration before types)

**Within US1:**
- T008 + T009 can run in parallel (different files)
- T012 + T013 can run in parallel (different UI components)
- Backend (T004-T007) and frontend types/API (T008-T009) can run in parallel

**Within US2:**
- T017 + T018 can run in parallel (different controller files)

**US1 + US3 can run in parallel** (after Foundational — no shared files except re-exports)

---

## Parallel Example: User Story 1

```bash
# Backend and frontend types/API in parallel:
Task: "Create getNews controller in backend/src/controllers/news/getNews.ts"
Task: "Add frontend types to frontend/src/shared/types/index.ts"
Task: "Create news API client in frontend/src/shared/api/news.ts"

# UI components in parallel (after feature model exists):
Task: "Create NewsCard component in frontend/src/features/news/ui/NewsCard/"
Task: "Create NewsList component in frontend/src/features/news/ui/NewsList/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (T001–T003)
2. Complete Phase 2: User Story 1 (T004–T016)
3. **STOP and VALIDATE**: Вручную создать NewsItem в БД, открыть /news, проверить отображение
4. Deploy/demo if ready

### Incremental Delivery

1. Foundational → Schema and types ready
2. US1 → Просмотр новостей работает (MVP!) — вручную наполнить данными для демо
3. US3 → Скрипт генерации → автоматическое наполнение из changelog
4. US2 → Бейдж непрочитанных → полная фича
5. Polish → Документация, quality gates

### Recommended Order (Single Developer)

1. Phase 1: Foundational (T001–T003)
2. Phase 2: US1 backend (T004–T007) → US1 frontend (T008–T016)
3. Phase 4: US3 (T024–T025) — создать контент для тестирования
4. Phase 3: US2 backend (T017–T019) → US2 frontend (T020–T023)
5. Phase 5: Polish (T026–T027)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Total: 27 tasks (3 foundational, 13 US1, 7 US2, 2 US3, 2 polish)
- No new runtime dependencies needed
- All API responses follow existing pattern: `{ resource?, message?, error?, pagination? }`
- All error messages in Russian
- Commit after each phase or logical task group
