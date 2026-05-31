# Implementation Plan: Личный кабинет ученика (MVP)

**Branch**: `029-student-cabinet` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/029-student-cabinet/spec.md`

## Summary

Полный MVP личного кабинета ученика: преподаватель в карточке ученика генерирует одноразовую ссылку-приглашение, ученик по ней регистрируется (ФИО + email + пароль), email подтверждается стандартным flow (как у преподавателя), и попадает в кабинет с двумя разделами — "Расписание" (понедельный вид со своими уроками, отдельные компоненты от репетиторских) и "Настройки" (ФИО, email, ФИО преподавателя — только чтение). Аккаунты учеников живут в **отдельной таблице `StudentUser`**, изолированной от существующей `User` (преподаватели не меняются, admin не меняется), и ходят через **отдельный namespace `/api/student-auth/*` + `/api/student-cabinet/*`** со своим JWT-секретом и middleware. Логин и преподавателя, и ученика выполняется на общей странице `/login` с тумблером "Войти как: преподаватель / ученик", который определяет, в какую подсистему уходит запрос — никаких автоматических fallback-поисков по обеим таблицам.

## Technical Context

**Language/Version**: TypeScript 5.x (strict) — фронт и бек, Node.js 20
**Primary Dependencies**:
- Backend: Express, Prisma, bcryptjs, jsonwebtoken, express-rate-limit, Resend (email через существующий `services/email.ts`)
- Frontend: React 18, Effector, Material UI, styled-components, axios, react-router-dom

**Storage**: PostgreSQL через Prisma ORM. Две новые таблицы (`student_users`, `student_invitations`) + одно новое поле в `students` (`studentUserId`).

**Testing**: Backend — Jest + Supertest + реальная тестовая БД (`npm run db:migrate:test`); Frontend — Vitest + React Testing Library + MSW; E2E — Playwright.

**Target Platform**: Современные браузеры (десктоп и мобильный — Material UI отзывчивый), Node 20 на сервере.

**Project Type**: web (монорепо `frontend/` + `backend/`).

**Performance Goals**: стандарт проекта — p95 API-ответа <200 мс, открытие "Расписания" ученика <500 мс.

**Constraints**:
- UI и тексты ошибок — на русском
- StudentUser-аутентификация **физически изолирована** от User (отдельная таблица, отдельный JWT-секрет, отдельный middleware, отдельный prefix). Изоляция распространяется и на WebSocket — отдельный путь `/ws/student` со своей auth-функцией и отдельным пулом клиентов в общем `WebSocketManager` (см. R-09)
- Компоненты "Расписания" ученика — **отдельные от репетиторских** (не импортировать из `features/lessons/...`); допустимо переиспользовать только примитивы из `@shared/ui`
- Нельзя ломать существующие auth-эндпоинты `/api/auth/*` и поведение преподавателей
- Расписание ученика обновляется **в реальном времени** при изменении уроков — через WebSocket-уведомления сервера (создание/обновление/удаление/смена статуса урока)

**Scale/Scope**: десятки преподавателей, несколько сотен учеников у каждого, до тысяч уроков. Нагрузка низкая.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Feature-Sliced Design (Frontend) — ✅ PASS

- Новые страницы (`pages/studentCabinet/*`, `pages/studentInvite`) импортируют только из `features/*`, `entities/*`, `shared/*` — направление импортов сохраняется
- Новые feature-слайсы: `features/studentAuth`, `features/studentSchedule`, `features/studentSettings`, `features/tutorStudentInvitation` (репетиторская часть — генерация ссылки в карточке ученика)
- Новые сущности: `entities/studentUser`, `entities/studentInvitation`
- Каждая папка экспортирует API через `index.ts` — никаких глубоких импортов
- Никаких обратных импортов (entities не тянет features) — проверено `madge` через `npm run find-cycle`

### II. Layered MVC (Backend) — ✅ PASS

- Новые routes: `routes/studentAuth.ts`, `routes/studentCabinet.ts`, `routes/studentInvitations.ts` (плюс новые эндпоинты `POST/GET/DELETE /api/students/:id/invitations` через расширение `routes/students.ts`)
- Новые controllers: `controllers/studentAuth.ts`, `controllers/studentCabinet.ts`, `controllers/studentInvitations.ts` (валидация + HTTP-обвязка)
- Новые services: `services/studentAuth.ts`, `services/studentCabinet.ts`, `services/studentInvitation.ts` (вся бизнес-логика)
- Pure utils: `utils/studentAuth.ts` (хеширование/верификация JWT под отдельным секретом), `utils/studentInvitationToken.ts` (генерация/хеширование токенов)
- Контроллеры не работают с Prisma напрямую — только через services

### III. Effector State Management — ✅ PASS

- Состояния: `$studentSession`, `$studentSchedule`, `$studentSettings`, `$loginRoleToggle`, `$tutorStudentInvitation`
- Effects: `studentLoginFx`, `studentRegisterByInviteFx`, `studentVerifyEmailFx`, `loadStudentLessonsFx`, `generateInvitationFx`, `revokeInvitationFx`
- События: `loginRoleToggled`, `weekChanged`, `studentLoggedOut`
- Связи только через `sample`, никаких `.on()`/`.watch()`/`forward()`/`guard()`
- Формы (регистрация, логин) — состояние в Effector-сторах, не `useState`
- Все use-кейсы в React-компонентах — через `useUnit`

### IV. Type Safety — ✅ PASS

- Все новые типы в `backend/src/types/index.ts` (StudentJwtPayload, StudentRequest, StudentRegisterDto, StudentLoginDto, StudentInvitationDto, …)
- На фронте — рядом с фичами в `*.types.ts` (например, `features/studentAuth/student-auth.types.ts`)
- Только `type`, `import type`; никаких `interface` и `any`

### V. Code Consistency — ✅ PASS

- Все экспорты — именованные
- Все функции — стрелочные `const fn = () => {…}`
- Никаких inline-стилей — используем `styled-components` (`*.styled.ts`)
- Каждая папка — `index.ts`
- Размеры компонентов/моделей под лимиты (150/200/150) — крупные UI режутся на под-компоненты заранее
- UI и сообщения — на русском

### VI. Testing Discipline — ✅ PASS

**Backend**:
- Unit: `services/__tests__/studentAuth.test.ts`, `studentInvitation.test.ts`, `studentCabinet.test.ts` — реальная БД (`db:migrate:test`), без моков Prisma
- Integration: `controllers/__tests__/studentAuth.test.ts`, `studentInvitations.test.ts`, `studentCabinet.test.ts`, `students.invitations.test.ts` (расширение)
- Middleware: `middleware/__tests__/studentAuth.test.ts`, `rateLimit.test.ts` (расширение)
- Cross-role security: тесты, что student JWT не пускает в `/api/lessons`, и tutor JWT не пускает в `/api/student-cabinet/lessons`

**Frontend**:
- Unit: `features/studentAuth/models/*.test.ts`, `features/studentSchedule/models/*.test.ts` — fork-based тесты Effector
- Component: `pages/studentInvite/__tests__/StudentInvitePage.test.tsx`, `pages/studentCabinet/.../*.test.tsx`, login-toggle тесты — RTL + MSW
- E2E: новый `e2e/student-onboarding.spec.ts`, `e2e/student-cabinet.spec.ts` — полный путь "ссылка → регистрация → email-верификация → расписание"

### VII. Simplicity — ✅ PASS

- Нет преждевременных абстракций: email-верификация для StudentUser **переиспользует существующий код** через тонкий шаблон-подобный сервис, а не вводит общую "verifiable account" абстракцию (Решение #4 в research.md)
- Нет ролевой системы поверх User — спецификация явно выбрала отдельную таблицу
- Нет фича-флагов и совместимости: фича включается сразу
- Никакого "запоминания тумблера" в первой итерации — добавляется только если планировщик задач решит включить (опциональный пункт)

**Итог**: Constitution Check — проходит без нарушений. Раздел "Complexity Tracking" в плане **не требуется**.

## Project Structure

### Documentation (this feature)

```text
specs/029-student-cabinet/
├── plan.md              # Этот файл
├── research.md          # Phase 0 — решения по неоднозначным точкам
├── data-model.md        # Phase 1 — Prisma-схема delta + правила валидации
├── quickstart.md        # Phase 1 — сценарий ручной приёмки
├── contracts/           # Phase 1 — OpenAPI 3 для новых эндпоинтов
│   ├── student-auth.openapi.yaml
│   ├── student-cabinet.openapi.yaml
│   └── student-invitations.openapi.yaml
└── tasks.md             # Phase 2 — генерируется через /speckit.tasks (этот /speckit.plan их не создаёт)
```

### Source Code (repository root)

Используется существующая структура монорепо: `backend/` (Express + Prisma) и `frontend/` (React + Effector). Новые файлы добавляются по существующим паттернам.

```text
backend/
├── prisma/
│   ├── schema.prisma                                # +модели StudentUser, StudentInvitation; +поле Student.studentUserId
│   └── migrations/                                  # +миграция 029_student_cabinet
├── src/
│   ├── routes/
│   │   ├── studentAuth.ts                           # NEW: /api/student-auth/*
│   │   ├── studentCabinet.ts                        # NEW: /api/student-cabinet/*
│   │   ├── studentInvitations.ts                    # NEW: /api/student-invitations/validate/:token (публичный)
│   │   └── students.ts                              # MODIFIED: +POST/GET/DELETE /:id/invitations (репетитор)
│   ├── controllers/
│   │   ├── studentAuth.ts                           # NEW: register/login/verify-email/resend/me/logout
│   │   ├── studentCabinet.ts                        # NEW: getLessonsByWeek, getSettings
│   │   ├── studentInvitations.ts                    # NEW: validateToken (public)
│   │   └── students/
│   │       └── invitations.ts                       # NEW: tutorIssueInvitation, tutorReadInvitationStatus
│   ├── services/
│   │   ├── studentAuth.ts                           # NEW
│   │   ├── studentCabinet.ts                        # NEW
│   │   ├── studentInvitation.ts                     # NEW
│   │   └── studentEmailVerification.ts              # NEW: тонкая обёртка над существующим email.ts с другими шаблонами
│   ├── middleware/
│   │   ├── studentAuth.ts                           # NEW: authenticateStudent
│   │   └── rateLimit.ts                             # MODIFIED: +studentAuthRateLimiter, studentRegistrationRateLimiter
│   ├── utils/
│   │   ├── studentAuth.ts                           # NEW: generateStudentToken, verifyStudentToken
│   │   └── studentInvitationToken.ts                # NEW: генерация и хеширование токенов
│   ├── types/
│   │   └── index.ts                                 # MODIFIED: +StudentJwtPayload, StudentRequest, *Dto
│   └── lib/
│       ├── prisma.ts                                # без изменений
│       └── websocket/
│           ├── WebSocketManager.ts                  # MODIFIED: +studentClients pool, +setupStudentPath, +студент-aware broadcastLessonStatusUpdate
│           ├── auth.ts                              # без изменений (tutor)
│           ├── studentAuth.ts                       # NEW: authenticateStudentWebSocket
│           └── types.ts                             # MODIFIED: +AuthenticatedStudentWebSocket
└── tests/                                           # см. выше

frontend/
└── src/
    ├── pages/
    │   ├── studentInvite/                           # NEW: публичная страница регистрации по токену
    │   │   ├── StudentInvitePage.tsx
    │   │   ├── StudentInvitePage.styled.ts
    │   │   ├── StudentInvitePage.helpers.ts
    │   │   ├── StudentInvitePage.types.ts
    │   │   ├── components/                          # под-компоненты формы
    │   │   ├── __tests__/
    │   │   └── index.ts
    │   ├── studentCabinet/                          # NEW: layout + редиректы /student/cabinet → /student/cabinet/schedule
    │   │   └── … (StudentCabinetLayout, navigation tabs)
    │   ├── studentSchedule/                         # NEW: страница "Расписание"
    │   │   └── … (использует features/studentSchedule)
    │   └── studentSettings/                         # NEW: страница "Настройки"
    │       └── … (использует features/studentSettings)
    ├── features/
    │   ├── studentAuth/                             # NEW: модели логина/регистрации/верификации, formStores
    │   │   ├── ui/  models/  api/  index.ts
    │   ├── studentSchedule/                         # NEW: weekly-вид со своими компонентами (НЕ из features/lessons)
    │   │   ├── ui/StudentWeeklyView/
    │   │   ├── ui/StudentLessonCard/
    │   │   ├── models/student-schedule.model.ts
    │   │   ├── models/student-schedule-ws.model.ts  # NEW: WS-подключение, реакция на lesson_*-события
    │   │   └── api/
    │   ├── studentSettings/                         # NEW
    │   ├── tutorStudentInvitation/                  # NEW: UI в карточке репетитора — кнопка/статус/индикатор
    │   │   ├── ui/InvitationManager/
    │   │   ├── models/  api/
    │   └── auth/                                    # MODIFIED: тумблер "tutor/student" в LoginPage; модели логина расширяются
    ├── entities/
    │   ├── studentUser/                             # NEW: тип, $studentSession, getCurrentStudentFx
    │   │   └── model/  types/  index.ts
    │   ├── studentInvitation/                       # NEW: статусы, типы, helpers
    │   ├── student/                                 # MODIFIED: +поле studentUserId, +inviteStatus
    │   └── lesson/                                  # MODIFIED (минимально): новый суженный тип StudentVisibleLesson
    ├── shared/
    │   ├── api/
    │   │   ├── studentAuth.ts                       # NEW: axios-клиенты к /api/student-auth/*
    │   │   ├── studentCabinet.ts                    # NEW
    │   │   └── studentInvitations.ts                # NEW
    │   ├── auth/                                    # NEW (или extend существующего): хранилище токенов
    │   │   ├── tokenStorage.ts                      # tutor: 'token', student: 'studentToken'
    │   │   └── index.ts
    │   └── routing/                                 # MODIFIED: +student-only Guard
    ├── widgets/
    │   └── studentSidebar/                          # NEW: сайдбар/нижняя панель кабинета ученика (2 пункта)
    └── components/                                  # без изменений
```

**Structure Decision**: Web-приложение в монорепо. Все новые файлы соответствуют двум существующим архитектурам — Layered MVC на бэке и Feature-Sliced Design на фронте. Никаких новых корневых пакетов или подсистем не вводится. Изоляция от репетиторской подсистемы проводится по пути в иерархии (`/student/*` фронт-роуты, `/api/student-*` бэк-роуты, `features/student*`, `entities/studentUser`) — название каждой папки начинается с `student`, чтобы случайный импорт из `features/lessons` в `features/studentSchedule` (или наоборот) выглядел подозрительно при code-review.

## Constitution Check (post-design re-evaluation)

После генерации `research.md`, `data-model.md`, `contracts/`, `quickstart.md` и обновления agent-context — повторная проверка против Constitution v1.0.0:

| Принцип | Статус | Комментарий |
|---------|--------|-------------|
| I. FSD (Frontend) | ✅ Pass | Импорты строго `pages → features → entities → shared`; новые слайсы изолированы префиксом `student*` для визуальной защиты от утечки. |
| II. Layered MVC (Backend) | ✅ Pass | Routes → Controllers → Services чисто разнесены; Prisma не утекает в контроллеры. Авторизационный слой реализован отдельным middleware `authenticateStudent`. |
| III. Effector | ✅ Pass | Перечислены `$store`/`Fx`/`event`-имена для основных state; `useUnit`/`sample`-only — будут проверены ESLint-правилами при реализации. |
| IV. Type Safety | ✅ Pass | DTO/JwtPayload/Request типы перечислены; `any` нет; `import type` используется. |
| V. Code Consistency | ✅ Pass | Все новые файлы укладываются в лимиты размера; стили — в `*.styled.ts`; UI на русском. |
| VI. Testing Discipline | ✅ Pass | Тесты на каждом слое (services/controllers/middleware/E2E) — план содержит явные тестовые цели в `quickstart.md` и в `Constitution Check` плана. |
| VII. Simplicity | ✅ Pass | Один точечный отказ от обобщения email-verification (R-04); никаких feature-flags; UX trade-off на повторный показ raw-URL осознан (R-16). |

**Итог Phase 1**: проектные документы созданы, Constitution-нарушений нет, секция Complexity Tracking пуста.

## Complexity Tracking

> Не требуется — Constitution Check пройден без нарушений.
