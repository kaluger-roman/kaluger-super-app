---
description: "Task list for 029-student-cabinet"
---

# Tasks: Личный кабинет ученика (MVP)

**Input**: Design documents from `/specs/029-student-cabinet/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/

**Tests**: ОБЯЗАТЕЛЬНЫ (`CLAUDE.md`: "All new code must have full test coverage").

**Organization**: Задачи сгруппированы по user stories спеки. Каждая story после Phase 2 — независимо тестируема.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно делать параллельно с другими [P]-тасками той же фазы (разные файлы, независимы)
- **[Story]**: к какой user story относится (US1=P1 онбординг, US2=P2 расписание, US3=P3 настройки)
- Все пути в задачах — абсолютные или относительно корня монорепо (`backend/`, `frontend/`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Конфиг и переменные окружения, без которых не запустится новая подсистема.

- [X] T001 Добавить `STUDENT_JWT_SECRET` в `backend/.env.example` (с пояснением "длинная случайная строка, отличная от `JWT_SECRET` и `ADMIN_JWT_SECRET`"); если есть `backend/.env.test` — добавить туда же; обновить deploy-конфиги (`.github/workflows/deploy.yml` или эквивалент) и README с инструкцией для локальной разработки

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: База, на которой будут стоять все user stories: новая Prisma-схема, типы, утилиты, middleware, WS-инфраструктура, базовые фронтенд-сторы и роутинг.

**⚠️ CRITICAL**: ни одна US-фаза не может начаться, пока не завершена Phase 2.

### Backend — схема и миграция

- [X] T002 Обновить `backend/prisma/schema.prisma`: добавить enum `StudentInvitationStatus` (PENDING/USED/REVOKED), модель `StudentUser` (поля и индексы — см. `data-model.md`), модель `StudentInvitation`; добавить виртуальные обратные связи `studentUser`, `invitations` в `model Student` и `studentInvitations` в `model User`
- [X] T003 Сгенерировать миграцию: `cd backend && npm run db:migrate -- --name 029_student_cabinet` (создаст файл в `backend/prisma/migrations/<timestamp>_029_student_cabinet/migration.sql`)
- [X] T004 Обновить Prisma Client: `cd backend && npm run db:generate`

### Backend — типы и DTO

- [X] T005 [P] Дополнить `backend/src/types/index.ts` всеми новыми типами из `data-model.md`: `StudentJwtPayload`, `StudentRequest`, `StudentRegisterByInviteDto`, `StudentLoginDto`, `StudentSettingsResponse`, `StudentLesson`/`StudentLessonResponse`, `StudentLessonsByWeekResponse`, `TutorIssueInvitationResponse`, `TutorInvitationStatusResponse`, `ValidateInvitationResponse`, `StudentLessonWsEvent`

### Backend — общие утилиты

- [X] T006 [P] Создать `backend/src/utils/passwordPolicy.ts` (минимум 8 символов, заглавные/строчные буквы, цифра — единая helper-функция); отрефакторить существующую валидацию пароля преподавателя (`services/changePassword.ts` и регистрацию в `controllers/auth.ts`) на этот helper, чтобы политика была единой
- [X] T007 [P] Создать `backend/src/utils/studentAuth.ts`: `generateStudentToken(payload)`, `verifyStudentToken(token)` — использует `STUDENT_JWT_SECRET` (НЕ `JWT_SECRET`), `expiresIn: "7d"` (как у tutor)
- [X] T008 [P] Создать `backend/src/utils/studentInvitationToken.ts`: `generateRawToken()` (32 байта `crypto.randomBytes` → base64url), `hashToken(raw)` (sha256 hex), `getInvitationExpiry()` (createdAt + 365d)

### Backend — middleware

- [X] T009 Создать `backend/src/middleware/studentAuth.ts` с `authenticateStudent(req: StudentRequest, res, next)` — извлекает Bearer-токен, валидирует через `verifyStudentToken`, кладёт payload в `req.studentUser`, иначе 401
- [X] T010 [P] В `backend/src/middleware/rateLimit.ts` добавить лимитеры: `studentAuthRateLimiter` (для login/resend), `studentRegistrationRateLimiter` (для register), `studentInvitationValidationRateLimiter` (для public validate)

### Backend — WebSocket-инфраструктура (общая для US2)

- [X] T011 [P] В `backend/src/lib/websocket/types.ts` добавить тип `AuthenticatedStudentWebSocket = WebSocket & { studentUserId?: string; email?: string }`
- [X] T012 [P] Создать `backend/src/lib/websocket/studentAuth.ts` с `authenticateStudentWebSocket` — зеркало `auth.ts`, но через `verifyStudentToken` и `STUDENT_JWT_SECRET`
- [X] T013 Расширить `backend/src/lib/websocket/WebSocketManager.ts`: добавить отдельный пул `studentClients: Map<string, AuthenticatedStudentWebSocket>`, метод `setupStudentPath()` для пути `/ws/student?token=<studentJwt>`, методы `sendToStudent(studentUserId, message)` и `broadcastStudentLessonEvent(studentUserId, event)`. Существующий путь `/ws` и пул `clients` — не ломать

### Backend — точка монтирования

- [X] T014 В `backend/src/index.ts` (или там, где инициализируется WebSocketManager) — вызвать `wsManager.setupStudentPath()` рядом с существующим `setupTutorPath()`/эквивалентом, чтобы оба пути слушались на старте

### Frontend — общая инфраструктура

- [X] T015 [P] Создать `frontend/src/shared/auth/tokenStorage.ts` с явным разделением: `getTutorToken/setTutorToken/clearTutorToken` (ключ `'token'`, сохраняем существующее поведение) и `getStudentToken/setStudentToken/clearStudentToken` (ключ `'studentToken'`); экспорт через `index.ts`. Отрефакторить существующие места доступа к `localStorage.getItem('token')` в коде преподавателя на `getTutorToken()`
- [X] T016 [P] Создать axios-клиенты-скелеты (без методов — они появятся в US-фазах): `frontend/src/shared/api/studentAuth.ts`, `frontend/src/shared/api/studentCabinet.ts`, `frontend/src/shared/api/studentInvitations.ts`. Каждый клиент использует свой `Authorization: Bearer ${getStudentToken()}` interceptor (или статически пробрасываемый header), плюс публичные эндпоинты — без авторизации. Все три экспортируются через свои `index.ts`
- [X] T017 [P] Создать `frontend/src/entities/studentUser/` (model, types, index): `$studentSession: Store<StudentSession | null>`, `getCurrentStudentFx` (вызывает `GET /api/student-auth/me`), `studentLoggedOut` event (через `sample` сбрасывает стор и чистит токен)
- [X] T018 [P] Создать `frontend/src/entities/studentInvitation/` (types, helpers, index): тип `StudentInvitationView` (см. data-model.md), helper `formatInvitationStatus`
- [X] T019 Добавить student-only Guard в `frontend/src/shared/routing/`: HOC/wrapper, который проверяет наличие `getStudentToken()` и валидность через `getCurrentStudentFx`; иначе редирект на `/login`. Создать также `tutorOnlyGuard` если не существует — чтобы tutor-роуты не открывались под student-токеном (защита изоляции)
- [X] T020 Создать пустой layout-каркас `frontend/src/pages/studentCabinet/StudentCabinetLayout.tsx` (header + sidebar slot + Outlet) — конкретные разделы наполнятся в US2/US3
- [X] T021 Создать `frontend/src/widgets/studentSidebar/` — навигация кабинета ученика (2 пункта: "Расписание", "Настройки"); пока ссылки могут вести на пустые страницы-заглушки

**Checkpoint**: фундамент готов — `npm run build` (backend) и `npm run lint && npm test` (frontend, базовые) проходят, миграция применена. Можно начинать US1.

---

## Phase 3: User Story 1 — Регистрация ученика по приглашению (Priority: P1) 🎯 MVP

**Goal**: Преподаватель в карточке ученика создаёт ссылку, ученик переходит, регистрируется (ФИО + email + пароль), email подтверждается стандартным flow, ученик попадает в кабинет; ссылка-приглашение сгорает; повторная генерация заблокирована.

**Independent Test**: Ручной — пройти по quickstart.md разделы 1.1–1.4 и 4.1–4.8. Автоматический — E2E `student-onboarding.spec.ts`.

### Backend — сервисы

- [X] T022 [P] [US1] Создать `backend/src/services/studentInvitation.ts` с методами: `issueInvitation(tutorId, studentId)` (проверяет `Student.tutorId === tutorId`, проверяет отсутствие связанного `StudentUser`, проверяет `Student.archived`, ревокирует существующий `PENDING`, создаёт новый, возвращает `{ inviteUrl, expiresAt }`), `getInvitationStatus(tutorId, studentId)`, `revokeInvitation(tutorId, studentId)`, `validateRawToken(rawToken)` (возвращает `Student` + `tutor.name` если PENDING+не expired+карточка не удалена; иначе null)
- [X] T023 [P] [US1] Создать `backend/src/services/studentEmailVerification.ts` (тонкая обёртка над `utils/verification.ts` и `services/email.ts`): `sendStudentVerificationEmail(studentUser)` (генерирует код, выставляет `verificationCode*`, шлёт письмо отдельной функцией `sendStudentVerificationCode` из `services/email.ts` либо новым шаблоном), `verifyStudentEmailCode(studentUserId, code)` (с учётом `MAX_VERIFICATION_ATTEMPTS`, expiry), `resendStudentVerificationCode(studentUserId)` (с учётом `RESEND_COOLDOWN_SECONDS`)
- [X] T024 [US1] Создать `backend/src/services/studentAuth.ts` с `registerStudentByInvite(dto)` — атомарная транзакция (`prisma.$transaction`): валидируем `rawToken`, проверяем уникальность email в `student_users`, hashPassword, создаём `StudentUser` с `studentId`, помечаем `StudentInvitation` как `USED+usedAt=now()`, инициируем `sendStudentVerificationEmail`, возвращаем `{ token: studentJwt, student }`. Метод `loginStudent({email, password})` — стандартный compare + JWT. Метод `getStudentSettings(studentUserId)` — читает `StudentUser` + связанный `Student.tutor.name` (если связь есть)

### Backend — контроллеры

- [X] T025 [P] [US1] Создать `backend/src/controllers/studentAuth.ts`: `register`, `login`, `verifyEmail`, `resendVerification`, `me`, `logout`. Валидация входа (формат email, пароли совпадают, etc.) — здесь; бизнес-логика — в сервисе. Тексты ошибок на русском
- [X] T026 [P] [US1] Создать `backend/src/controllers/studentInvitations.ts`: `validateToken` (публичный, читает `:token` из path, возвращает `ValidateInvitationResponse`)
- [X] T027 [P] [US1] Создать `backend/src/controllers/students/invitations.ts`: `tutorIssueInvitation` (POST, проверка владельца через `req.user.id === student.tutorId`), `tutorReadInvitationStatus` (GET — без raw URL, только метаданные согласно скорректированному контракту), `tutorRevokeInvitation` (DELETE). Подключить к существующему `controllers/index.ts` экспорту

### Backend — роуты

- [X] T028 [P] [US1] Создать `backend/src/routes/studentAuth.ts` со всеми эндпоинтами `/register`, `/login` (rate-limit + публичные), `/verify-email`, `/resend-verification` (rate-limit + `authenticateStudent`), `/me` (`authenticateStudent`), `/logout` (`authenticateStudent`)
- [X] T029 [P] [US1] Создать `backend/src/routes/studentInvitations.ts` с публичным `GET /validate/:token` (rate-limit `studentInvitationValidationRateLimiter`)
- [X] T030 [US1] Расширить `backend/src/routes/students.ts` тремя эндпоинтами: `POST /:studentId/invitations` (tutorIssueInvitation), `GET /:studentId/invitations` (tutorReadInvitationStatus), `DELETE /:studentId/invitations` (tutorRevokeInvitation) — все под `authenticateToken` (tutor JWT)
- [X] T031 [US1] В `backend/src/index.ts` смонтировать `app.use("/api/student-auth", studentAuthRouter)` и `app.use("/api/student-invitations", studentInvitationsRouter)` рядом с существующими `app.use("/api/auth", authRouter)`

### Backend — тесты US1

- [X] T032 [P] [US1] `backend/src/services/__tests__/studentInvitation.test.ts` — issue (happy path, archived block, already-registered block, чужая карточка), revoke старого при выдаче нового, validateRawToken (PENDING/USED/REVOKED/expired/несуществующий)
- [X] T033 [P] [US1] `backend/src/services/__tests__/studentAuth.test.ts` — registerStudentByInvite (атомарность: если email занят — invitation НЕ помечается USED), login (правильный пароль, неправильный пароль), getStudentSettings (с tutor и без — после удаления карточки)
- [X] T034 [P] [US1] `backend/src/services/__tests__/studentEmailVerification.test.ts` — sendCode, verifyCode (правильный/неправильный/истёкший/превышены попытки), resend (cooldown)
- [X] T035 [P] [US1] `backend/src/controllers/__tests__/studentAuth.test.ts` (Supertest) — все 6 эндпоинтов; включая 401 на tutor JWT для `/me`
- [X] T036 [P] [US1] `backend/src/controllers/__tests__/studentInvitations.test.ts` — публичный `validate/:token` (valid → данные, invalid/used/revoked → `{valid: false}` с одинаковым ответом), rate-limit
- [X] T037 [P] [US1] `backend/src/controllers/__tests__/students.invitations.test.ts` — POST/GET/DELETE; 403 при попытке управлять чужой карточкой; 409 при попытке создать ссылку для зарегистрированной карточки или архивированной
- [X] T038 [P] [US1] `backend/src/middleware/__tests__/studentAuth.test.ts` — отсутствие токена → 401; tutor JWT → 401 (не подходит к секрету); валидный student JWT → next() с заполненным `req.studentUser`

### Frontend — invitation manager в карточке tutor

- [X] T039 [P] [US1] Создать `frontend/src/features/tutorStudentInvitation/` (model, api, ui, index): Effector-сторы `$invitationStatus`, `$ephemeralInviteUrl` (только что созданный URL — живёт в памяти до перезагрузки страницы, см. R-16), эффекты `loadInvitationStatusFx`, `issueInvitationFx`, `revokeInvitationFx`. Компонент `InvitationManager` показывает один из трёх состояний (`not_issued` → кнопка "Создать ссылку"; `pending` без URL → "Ожидает регистрации (создана X дней назад) | Создать новую | Отозвать"; `pending` с ephemeral URL → "Скопировать ссылку | Создать новую | Отозвать"; `registered` → бейдж "Ученик зарегистрирован" + дата + email)
- [X] T040 [US1] Встроить `InvitationManager` в существующую карточку ученика репетитора (найти место в `frontend/src/features/students/` или `frontend/src/pages/students/...`, где открывается детальная карточка/диалог); загружать статус при открытии карточки
- [X] T041 [P] [US1] Тесты в `frontend/src/features/tutorStudentInvitation/__tests__/`: model-тесты (Effector fork) и component-тесты (RTL: рендер в каждом из трёх состояний, клик "Скопировать", клик "Создать новую" → переход в новый ephemeral URL)

### Frontend — публичная страница регистрации

- [X] T042 [P] [US1] Создать `frontend/src/features/studentAuth/` (models/api/ui/index): form-сторы (`$nameField`, `$emailField`, `$passwordField`, `$passwordConfirmField`, `$formErrors`), эффекты `validateInvitationTokenFx`, `registerStudentByInviteFx`, `studentLoginFx`, `studentVerifyEmailCodeFx`, `studentResendVerificationFx`. После успешной регистрации — кладёт студенческий токен через `setStudentToken`, обновляет `$studentSession`, редиректит на `/student/cabinet`
- [X] T043 [P] [US1] Создать `frontend/src/pages/studentInvite/StudentInvitePage.tsx` (+ `.styled.ts`, `.helpers.ts`, `.types.ts`, `index.ts`, `components/`): на mount вызывает `validateInvitationTokenFx(:token)`, рендерит либо состояние "ссылка недействительна" (с инструкцией обратиться к преподавателю), либо форму регистрации (с приветствием по `studentName` из ответа), либо предупреждение "Вы вошли как преподаватель — выйдите из сессии" если детектится tutor-токен (FR-AC8)
- [X] T044 [US1] Добавить роут `/student-invite/:token` в `frontend/src/app/` (или в существующем routing-файле) — публичный, без guard
- [X] T045 [P] [US1] Тесты в `frontend/src/pages/studentInvite/__tests__/StudentInvitePage.test.tsx` (RTL+MSW): валидный токен → форма; недействительный → сообщение; submit с ошибочным паролем → инлайн-валидация; успешный submit → редирект на `/student/cabinet`; tutor-сессия активна → предупреждение

### Frontend — тумблер на /login и редиректы по ролям

- [X] T046 [US1] Модифицировать `frontend/src/features/auth/` (login UI/model): добавить `$loginRoleToggle: Store<"tutor" | "student">` (default "tutor"), Material UI `ToggleButtonGroup` "Войти как: преподаватель / ученик". `loginFx` ветвится по положению тумблера: либо `POST /api/auth/login` (как сейчас, кладёт `tutorToken`), либо `POST /api/student-auth/login` (через `shared/api/studentAuth`, кладёт `studentToken`)
- [X] T047 [US1] После успешного логина: tutor → `/dashboard` (как сейчас), student → `/student/cabinet`. Расширить редирект-логику в `LoginPage` или соответствующем эффекте
- [X] T048 [P] [US1] Тесты `frontend/src/features/auth/__tests__/login-toggle.test.ts(x)`: тумблер по умолчанию "преподаватель"; переключение меняет вызываемый эндпоинт; неверные креды показывают одинаковую формулировку независимо от положения; redirect согласно роли

### Frontend — кабинет (минимальный shell для US1) и email-verification банер

- [X] T049 [US1] Заполнить `StudentCabinetLayout` (T020): использовать `widgets/studentSidebar` для навигации, добавить email-verification банер `<StudentEmailVerificationBanner />` (рендерится если `$studentSession.isEmailVerified === false`); банер содержит инпут кода, кнопку "Подтвердить" (вызывает `studentVerifyEmailCodeFx`), кнопку "Отправить заново" с индикатором cooldown (вызывает `studentResendVerificationFx`)
- [X] T050 [US1] Добавить роут `/student/cabinet` (внутри student-only Guard, T019) с дочерними `index` (редирект на `/student/cabinet/schedule`-stub до US2), `schedule` (заглушка "будет в US2"), `settings` (заглушка "будет в US3"); нужно для прохождения end-to-end onboarding-сценария
- [X] T051 [P] [US1] Тесты для StudentCabinetLayout и `StudentEmailVerificationBanner` в `frontend/src/pages/studentCabinet/__tests__/` и `frontend/src/features/studentAuth/__tests__/email-banner.test.tsx`

### E2E для US1

- [ ] T052 [P] [US1] `frontend/e2e/student-onboarding.spec.ts` — Playwright-сценарии: (a) tutor создаёт ссылку → копирует → student открывает в новом контексте → регистрируется → видит баннер email-верификации → подтверждает → попадает в кабинет; (b) повторное использование URL → "ссылка уже использована"; (c) невалидный токен → "ссылка недействительна"; (d) перевыпуск ссылки до регистрации → старая невалидна, новая работает; (e) tutor открывает invitation-URL → предупреждение

**Checkpoint**: US1 полностью функциональна — преподаватель может приглашать учеников, ученики регистрируются и попадают в кабинет (пусть пока с заглушками "Расписание/Настройки в разработке"). Можно мерджить как отдельный MVP.

---

## Phase 4: User Story 2 — Просмотр расписания (Priority: P2)

**Goal**: Ученик видит понедельный календарь со своими уроками; карточка урока read-only; live-обновления при изменениях; никаких чужих учеников и tutor-функций.

**Independent Test**: Quickstart.md разделы 2.1–2.5 + E2E `student-schedule.spec.ts`.

### Backend — REST endpoint расписания

- [X] T053 [US2] Создать `backend/src/services/studentCabinet.ts` с `getLessonsByWeek(studentUserId, weekStart?)` — резолвит `studentUserId → student.id`, фильтрует `Lesson` по `studentId` и диапазону `[weekStart, weekStart+7d)` (если `weekStart` не задан — текущий понедельник часового пояса сервера, см. R-10), маппит в `StudentLessonResponse` (только id, subject, startTime, endTime, status — никаких price/isPaid/notes/homework). Если `studentId === null` (карточка удалена) — возвращает `{ weekStart, lessons: [] }`
- [X] T054 [P] [US2] Создать `backend/src/controllers/studentCabinet.ts` с `getLessonsByWeek` — извлекает `weekStart` из query (валидирует ISO-дату), вызывает сервис
- [X] T055 [P] [US2] Создать `backend/src/routes/studentCabinet.ts` с `GET /lessons` под `authenticateStudent`
- [X] T056 [US2] В `backend/src/index.ts` смонтировать `app.use("/api/student-cabinet", studentCabinetRouter)`

### Backend — WS realtime broadcast

- [X] T057 [US2] В местах мутаций уроков преподавателя (`backend/src/services/lessons*.ts`, `backend/src/services/lessonStatusUpdater.ts`, `backend/src/services/recurringLessons.ts`, и контроллеры/services где меняется Lesson): после коммита транзакции — определить связанный `studentUser.id` через `lesson.student.studentUser?.id` (если карточка уже не удалена и аккаунт создан) и вызвать `wsManager.broadcastStudentLessonEvent(studentUserId, event)` с правильным типом (`lesson_created`/`lesson_updated`/`lesson_deleted`/`lesson_status_updated`); существующие tutor-broadcasts не ломать
- [X] T058 [P] [US2] `backend/src/lib/websocket/__tests__/student-broadcast.test.ts` — открытие WS на `/ws/student?token=<student>` пускает; на `/ws/student?token=<tutor>` отклоняет (1008); событие `lesson_updated` отправляется только в `studentClients` нужного `studentUserId`, а не всем

### Backend — тесты US2

- [X] T059 [P] [US2] `backend/src/services/__tests__/studentCabinet.test.ts` — `getLessonsByWeek` (с уроками, без уроков, после удаления Student → пустой), исключение чужих учеников
- [X] T060 [P] [US2] `backend/src/controllers/__tests__/studentCabinet.test.ts` — 401 без токена, 401 с tutor JWT, 200 со student JWT возвращает только свои уроки, валидация `weekStart`-параметра

### Frontend — UI расписания

- [X] T061 [P] [US2] Создать `frontend/src/features/studentSchedule/ui/StudentLessonCard/` — read-only карточка (subject, дата, время начала, длительность/время окончания, статус). НИКАКИХ кнопок действий. Стили в `*.styled.ts`. Никаких импортов из `frontend/src/features/lessons/...`
- [X] T062 [P] [US2] Создать `frontend/src/features/studentSchedule/ui/StudentWeeklyView/` — сетка ПН-ВС с временной шкалой; визуально похожа на `features/lessons/.../WeeklyView`, но реализована **отдельным компонентом** (без импортов). Допустимо переиспользовать примитивы из `@shared/ui` и helper'ы вычисления недели из `@shared/utils` (если они общего назначения; если нет — продублировать в `features/studentSchedule/helpers`)
- [X] T063 [P] [US2] Создать `frontend/src/features/studentSchedule/models/student-schedule.model.ts` — `$weekStart`, `$lessons`, `$isLoading`, события `weekChanged`, `todayClicked`, эффект `loadStudentLessonsFx` (через `shared/api/studentCabinet`)
- [X] T064 [US2] Создать `frontend/src/features/studentSchedule/models/student-schedule-ws.model.ts` — открытие WS-подключения к `/ws/student?token=...` при появлении `$studentSession`, обработчик `lesson_*`-событий, реакция на `$weekStart` (не подписываемся на серверной стороне — все события приходят в одно соединение, фронт сам решает релевантность по `lesson.startTime` ∈ текущая неделя). Реконнект с экспоненциальным backoff'ом (как в существующем tutor-WS клиенте). Закрытие при `studentLoggedOut`
- [X] T065 [US2] Создать `frontend/src/pages/studentSchedule/StudentSchedulePage.tsx` (+ styled, helpers, types, index): использует `StudentWeeklyView`, кнопки "← неделя", "Сегодня", "неделя →" (через события `weekChanged`/`todayClicked`); монтирует WS-модель
- [X] T066 [US2] Заменить заглушку `/student/cabinet/schedule` (T050) на реальный `StudentSchedulePage`; ставится как индексный редирект-таргет для `/student/cabinet`
- [X] T067 [P] [US2] Тесты `frontend/src/features/studentSchedule/__tests__/`: model (Effector fork: load lessons, week change, ws-update интеграция), components (RTL: render, переключение недели, пустая неделя, click по карточке не показывает action-кнопки), ws (mock WebSocket: `lesson_created` добавляет карточку, `lesson_deleted` убирает)

### E2E для US2

- [X] T068 [P] [US2] `frontend/e2e/student-schedule.spec.ts` — quickstart 2.1–2.5: отображение своих уроков, переключение недели, пустая неделя, realtime-добавление урока (один контекст tutor добавляет, другой контекст student видит без перезагрузки), realtime-смена статуса, изоляция (student не видит уроки другого студента того же tutor)

**Checkpoint**: US2 полностью функциональна; вместе с US1 кабинет почти полный (нет только Настроек).

---

## Phase 5: User Story 3 — Настройки (Priority: P3)

**Goal**: Раздел "Настройки" показывает ФИО ученика, email со статусом верификации и ФИО преподавателя; полностью read-only.

**Independent Test**: Quickstart.md раздел 3 + E2E `student-settings.spec.ts`.

### Backend

> Backend-часть уже покрыта `GET /api/student-auth/me` (T024 → `getStudentSettings`), который возвращает `StudentSettingsResponse` со всеми нужными полями. Дополнительные эндпоинты НЕ нужны.

### Frontend — UI настроек

- [X] T069 [P] [US3] Создать `frontend/src/features/studentSettings/` (ui, model, index): `$studentSettingsView` (derived из `entities/studentUser.$studentSession`); компоненты `StudentInfoSection` (ФИО + email + статус верификации), `TutorInfoSection` (ФИО преподавателя или "Связь с преподавателем прекращена" если `tutor === null`); подсказка "для изменения данных обратитесь к преподавателю" — read-only
- [X] T070 [US3] Создать `frontend/src/pages/studentSettings/StudentSettingsPage.tsx` (+ styled, helpers, types, index): композирует `StudentInfoSection` + `TutorInfoSection`
- [X] T071 [US3] Заменить заглушку `/student/cabinet/settings` (T050) на реальный `StudentSettingsPage`
- [X] T072 [P] [US3] Тесты `frontend/src/features/studentSettings/__tests__/` и `frontend/src/pages/studentSettings/__tests__/`: рендер с tutor, рендер с tutor=null (карточка удалена → "Связь прекращена"), рендер с не подтверждённым email (бейдж рядом с email)

### E2E для US3

- [X] T073 [P] [US3] `frontend/e2e/student-settings.spec.ts` — quickstart раздел 3: видит свои ФИО, email с пометкой "подтверждён", ФИО преподавателя; tutor меняет своё ФИО → ученик после refresh видит обновление; tutor удаляет карточку → ученик видит "Связь с преподавателем прекращена"

**Checkpoint**: все три user stories независимо функциональны; кабинет полный (Расписание + Настройки).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Кросс-сюжетные регрессии, документация, ручная приёмка.

- [X] T074 [P] Cross-role security regression тесты: `backend/src/__tests__/cross-role-security.test.ts` — student JWT отвергается на `/api/auth/profile`, `/api/lessons`, `/api/students`, `/api/statistics`, `/api/tax-periods` и других tutor-эндпоинтах; tutor JWT отвергается на `/api/student-auth/me`, `/api/student-cabinet/lessons`, `/api/student-invitations/validate/:token` (последний публичный — отдельная проверка что любые авторизационные заголовки игнорируются). Покрывает SC-004
- [X] T075 [P] Frontend cross-role guard тест: `frontend/src/shared/routing/__tests__/student-guard.test.tsx` — попытка зайти на `/student/cabinet/schedule` без `studentToken` → редирект на `/login`; попытка зайти с `tutorToken` (но без `studentToken`) → редирект на `/login` (а не на `/dashboard`)
- [X] T076 Запустить `cd backend && npm run lint && npm run build && npm test` — ноль ошибок и все тесты зелёные
- [X] T077 Запустить `cd frontend && npm run lint && npm run format:check && npm test && npm run find-cycle` — ноль ошибок, ноль циклов
- [ ] T078 Запустить `cd frontend && npm run test:e2e` — все три новые e2e-спеки проходят
- [ ] T079 Пройти руками `specs/029-student-cabinet/quickstart.md` от начала до конца, отметив каждый чек-лист пункт; зафиксировать любые расхождения issue'ями
- [X] T080 [P] Обновить `docs/conventions/backend.md`: добавить раздел "Изолированные подсистемы аутентификации" с описанием паттерна (отдельный JWT-секрет → отдельный middleware → отдельный namespace роутов → отдельный пул WS-клиентов), на примере StudentUser. Это документирует подход для будущих ролей
- [ ] T081 Запустить `/changelog` — добавить запись 029-student-cabinet в `CHANGELOG.md`
- [ ] T082 Запустить `/news` — сгенерировать пользовательскую новость из CHANGELOG-записи и сохранить через `npm run news:generate` + `npm run news:sync`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: нет зависимостей
- **Foundational (Phase 2)**: зависит от Phase 1; БЛОКИРУЕТ все user stories
- **US1 (Phase 3)**: зависит только от Phase 2
- **US2 (Phase 4)**: зависит от Phase 2; **может стартовать параллельно с US1** при наличии 2 разработчиков (US2 backend/frontend сами по себе изолированы; единственный практический блок — для ручного теста US2 нужен зарегистрированный student-аккаунт, который даёт US1)
- **US3 (Phase 5)**: зависит от Phase 2 + от наличия `entities/studentUser` (Phase 2) и `GET /me` (US1.T024). Если US1 в работе, US3-frontend всё равно может писаться против моков `MSW`
- **Polish (Phase 6)**: зависит от завершения US1+US2+US3

### Внутри Phase 2

- T002 → T003 → T004 (схема → миграция → клиент) — строго последовательно
- T005 (типы) — независимый [P], стартует параллельно с T002
- T006/T007/T008 (utils) — параллельно после T005
- T009 (middleware) зависит от T007 (нужен `verifyStudentToken`)
- T010 (rate-limit) — параллельно с T009
- T011 → T012 → T013 → T014 (WS) — внутри последовательно (типы → auth → manager → монтаж)
- T015–T019 (frontend foundational) — параллельно после готовности T005-эквивалента типов на фронте (типы дублируются в FE)
- T020/T021 (cabinet shell + sidebar) — параллельно

### Внутри US1

- Сервисы (T022, T023, T024) → Контроллеры (T025-T027) → Роуты (T028-T030) → Монтаж (T031) — слоистая зависимость
- Тесты (T032-T038) — параллельно с реализацией (TDD-friendly), но финальный прогон после T031
- Frontend tutor invitation (T039, T040, T041) — параллельно с backend
- Frontend invite page + auth (T042, T043, T044, T045) — параллельно с backend
- Login toggle (T046, T047, T048) — после T039 (нужны axios-клиенты US1) и T015 (token storage)
- Cabinet shell + email banner (T049, T050, T051) — после T042 (нужны эффекты verify/resend)
- E2E (T052) — после полного цикла backend+frontend US1

### Внутри US2

- Backend REST (T053-T056) → Backend tests (T059, T060) — параллельно
- Backend WS broadcasts (T057) → WS tests (T058) — параллельно
- Frontend UI компоненты (T061, T062, T063) — параллельно
- Frontend WS-модель (T064) зависит от T013 (backend поддерживает `/ws/student`)
- Page (T065, T066) после T061-T064
- Component-tests (T067) — параллельно с реализацией
- E2E (T068) — финальный

### Внутри US3

- Frontend feature (T069), page (T070, T071), tests (T072) — последовательно
- E2E (T073) — финальный

---

## Parallel Opportunities

**Phase 2 (после T002→T004)**:
```bash
# Параллельно (разные файлы, нет взаимных зависимостей):
Task T005 (types)
Task T006 (passwordPolicy)
Task T007 (studentAuth utils)
Task T008 (invitationToken utils)
Task T010 (rateLimit)
Task T011 (WS types)
Task T015–T018 (frontend foundational)
```

**Phase 3 (US1) — после T024**:
```bash
# Параллельно:
Task T025 (controller studentAuth)
Task T026 (controller studentInvitations)
Task T027 (controller students/invitations)
Task T028 (route studentAuth)
Task T029 (route studentInvitations)
Task T032–T038 (все backend-тесты)
Task T039–T041 (tutorStudentInvitation feature)
Task T042–T045 (studentInvite page + studentAuth feature)
```

**Phase 4 (US2) — после T056**:
```bash
Task T059, T060 (backend tests)
Task T061, T062, T063 (UI компоненты)
Task T067 (frontend tests, по мере появления компонентов)
```

**Кросс-stories при ≥2 разработчиков**:
- Разработчик A: US1 (P1)
- Разработчик B: US2 backend (T053-T060) + WS infra (если T013 готов)
- Разработчик C: US3 frontend (T069-T072 на моках)

---

## Implementation Strategy

### MVP First — только US1

1. Phase 1 (T001) → Phase 2 (T002–T021) → Phase 3 (T022–T052)
2. Включает: онбординг, регистрацию, логин, email-верификацию, кабинет с заглушками "Расписание/Настройки в разработке"
3. **Демо**: 1.1–1.4 + 4.1–4.8 из quickstart
4. Можно мерджить и деплоить отдельным PR

### Incremental Delivery

1. Setup + Foundational + US1 → MVP, мердж
2. US2 (Расписание + realtime) → второй мердж
3. US3 (Настройки) → третий мердж
4. Polish (T074–T082) → финальный мердж + changelog/news

### Параллельная команда (3 человека после T021)

- Разработчик A: US1 backend → frontend → e2e
- Разработчик B: US2 backend (REST + WS) с моками; финальная интеграция после A.T031
- Разработчик C: US3 frontend (ждёт `getCurrentStudentFx` от B/A); тесты на MSW; финал после A.T024

---

## Notes

- Тесты обязательны во всех фазах (CLAUDE.md правило); запускаются после реализации соответствующей единицы
- [P]-таски в одной фазе можно делать параллельно — разные файлы, без взаимных импортов
- Каждый user story — независимый чекпойнт; можно мерджить отдельным PR
- При обнаружении регрессии в существующем tutor-flow (например, тумблер сломал что-то в `/login`) — фиксить в той же фазе, не откладывать
- `madge` (`npm run find-cycle`) обязательно после изменений во `frontend/` — feature-slice изоляция должна сохраняться
