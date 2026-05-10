---

description: "Tasks for implementing 028-forgot-password (Восстановление пароля)"

---

# Tasks: Восстановление пароля ("Забыли пароль")

**Input**: Design documents from `/specs/028-forgot-password/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Включены — конституция проекта (Principle VI) и `CLAUDE.md` мандатируют покрытие тестами для всего нового кода. Бэкенд — Jest + Supertest (без моков Prisma). Фронт — Vitest + RTL + MSW; Effector-стора с `fork`. Регрессионные сценарии для всех edge cases из spec.md.

**Organization**: Tasks сгруппированы по user story (US1 → US2 → US3) для независимого внедрения и тестирования.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Можно запускать параллельно (разные файлы, без зависимостей на незавершённые задачи)
- **[Story]**: К какой user story относится задача (US1, US2, US3)
- В описании каждой задачи — точные пути файлов

## Path Conventions

- Backend: `backend/src/`, тесты — `backend/src/<layer>/__tests__/`
- Frontend: `frontend/src/`, тесты — рядом с файлом в `__tests__/`
- Prisma: `backend/prisma/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Подготовить окружение и убедиться, что зависимости и конвенции под рукой.

- [x] T001 Прочитать `docs/conventions/frontend.md`, `docs/conventions/backend.md`, `docs/conventions/frontend-testing.md`, `docs/conventions/backend-testing.md` (mandatory согласно `CLAUDE.md` перед написанием кода/тестов)
- [x] T002 [P] Проверить, что в `backend/package.json` присутствуют `express-rate-limit`, `resend`, `bcryptjs`, `@prisma/client` (все уже установлены — задача документирует факт; новые зависимости добавлять не нужно)
- [x] T003 [P] Добавить переменную `FRONTEND_URL` в `backend/.env.example` с комментарием `# Base URL фронта для построения ссылок в письмах (e.g. http://localhost:3000)`. Если переменная уже есть — пропустить

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Инфраструктура (БД, утилиты, типы, email-шаблон, фронтовый API), от которой зависят ВСЕ user stories.

**⚠️ CRITICAL**: Никакая работа над US1/US2/US3 не начинается до завершения этого phase.

- [x] T004 Добавить модель `PasswordResetToken` и обратную связь `passwordResetTokens PasswordResetToken[]` в модель `User` в `backend/prisma/schema.prisma` согласно `data-model.md` (поля: `id`, `userId`, `tokenHash` unique, `expiresAt`, `usedAt?`, `createdAt`; индексы по `userId` и `expiresAt`; FK с `onDelete: Cascade`; `@@map("password_reset_tokens")`)
- [x] T005 Сгенерировать и применить Prisma-миграцию: `cd backend && npx prisma migrate dev --name add_password_reset_tokens`. Зафиксировать сгенерированный файл `backend/prisma/migrations/<timestamp>_add_password_reset_tokens/migration.sql`. Перегенерировать клиент: `npm run db:generate`
- [x] T006 [P] Создать `backend/src/utils/passwordResetToken.ts`: функции `createResetToken()` (возвращает `{ token: string, tokenHash: string }`, токен — `crypto.randomBytes(32)` → `base64url`, хеш — `sha256(token).hex`); `hashResetToken(token: string)` (sha256 hex для lookup); `getResetTokenExpiry()` (now + 15 минут); `isResetTokenExpired(date: Date)`. Никаких побочных эффектов
- [x] T007 [P] Создать `backend/src/utils/__tests__/passwordResetToken.test.ts`: уникальность токенов (1000 итераций — все разные), длина и формат base64url, согласованность `hashResetToken` (детерминированность), `getResetTokenExpiry` возвращает дату ~15 минут от now (±100ms), `isResetTokenExpired` true для дат в прошлом, false для дат в будущем
- [x] T008 Добавить экспорт `passwordResetToken` в `backend/src/utils/index.ts` (`export * from "./passwordResetToken";`)
- [x] T009 [P] Добавить три DTO в `backend/src/types/index.ts`: `ForgotPasswordDto = { email: string }`, `VerifyResetTokenDto = { token: string }`, `ResetPasswordDto = { token: string; newPassword: string; confirmPassword: string }`
- [x] T010 [P] Добавить функцию `sendPasswordResetEmail(email: string, resetUrl: string)` в `backend/src/services/email.ts`: HTML-шаблон в стиле существующих писем (заголовок "Восстановление пароля", текст с CTA-кнопкой содержащей `resetUrl`, plain-text копия ссылки, предупреждение "Если вы не запрашивали — проигнорируйте", срок действия 15 минут). Тема письма: "Восстановление пароля"
- [x] T011 [P] Добавить три API-метода в `frontend/src/shared/api/auth.ts` согласно `contracts/api.md`: `forgotPassword({ email })`, `verifyResetToken({ token })`, `resetPassword({ token, newPassword, confirmPassword })`. Использовать существующий `api` instance из `./base`

**Checkpoint**: Foundation готова — БД, утилиты, типы, email-шаблон и API-методы существуют. Все user stories теперь могут начинаться параллельно.

---

## Phase 3: User Story 1 - Восстановление доступа по email-ссылке (Priority: P1) 🎯 MVP

**Goal**: End-to-end flow: запрос восстановления → письмо со ссылкой → страница установки нового пароля → вход с новым паролем.

**Independent Test**: Открыть `/forgot-password` (по прямому URL, без зависимости от US2), ввести email существующего пользователя, получить письмо, перейти по ссылке, ввести новый пароль дважды, успешно войти со старым/новым паролем (ожидаем: старый — fail, новый — pass).

### Tests for User Story 1

> **NOTE**: По конвенции проекта тесты пишутся **до** имплементации либо параллельно с ней; красные тесты подтверждают, что изменение действительно вносит новую логику.

#### Backend tests

- [x] T012 [P] [US1] Юнит-тесты сервиса в `backend/src/services/__tests__/passwordReset.test.ts`: `requestPasswordReset` для существующего email создаёт `PasswordResetToken` и вызывает `sendPasswordResetEmail`; для несуществующего email — НЕ создаёт токен и НЕ вызывает email-сервис, но возвращает успех (anti-enumeration); `verifyResetToken` возвращает `{valid: true}` для свежего токена, выбрасывает с правильным statusCode для invalid/expired/used; `applyPasswordReset` обновляет пароль (`bcrypt.compare(new, user.password)` truthy после), помечает токен `usedAt = now`, выставляет `isEmailVerified=true` если был false, отвергает совпадающий с текущим пароль, отвергает невалидный пароль
- [x] T013 [P] [US1] Integration-тесты контроллеров в `backend/src/controllers/__tests__/passwordReset.test.ts` (Supertest, реальная test DB): `POST /api/auth/forgot-password` возвращает 200 + нейтральное сообщение для существующего и несуществующего email; письмо отправляется только для существующего (мок на `sendPasswordResetEmail`); 400 для невалидного формата email; `POST /api/auth/reset-password/verify` 200 для валидного токена, 400 для invalid/expired/used токена с правильными русскими сообщениями; `POST /api/auth/reset-password` 200 для валидной заявки, password в БД обновлён, `usedAt` проставлен, повторный вызов с тем же токеном — 400; 400 при mismatch паролей и при невалидном пароле

#### Frontend tests

- [x] T014 [P] [US1] Юнит-тесты Effector-модели в `frontend/src/features/forgotPassword/models/__tests__/forgotPassword.model.test.ts` (через `fork`): `emailChanged` обновляет `$email`; `formSubmitted` запускает `forgotPasswordFx`; success ставит `$isSent = true` и показывает нейтральное сообщение; failure — `$error` с понятным текстом; `formReset` — все стора в дефолт
- [x] T015 [P] [US1] Юнит-тесты Effector-модели в `frontend/src/features/resetPassword/models/__tests__/resetPassword.model.test.ts`: `tokenSet` запускает `verifyResetTokenFx`; success — `$tokenStatus = "valid"`, failure — `$tokenStatus = "invalid"` с конкретным сообщением; `newPasswordChanged`/`confirmPasswordChanged` обновляют стора; `formSubmitted` запускает `resetPasswordFx`; success — `$isSuccess = true`; ошибки маппятся в `$error`
- [x] T016 [P] [US1] Тесты компонента в `frontend/src/features/forgotPassword/ui/ForgotPasswordForm/__tests__/ForgotPasswordForm.test.tsx` (RTL + MSW): отображает поле email и кнопку; submit вызывает API; на success показывает нейтральное сообщение и (опц.) скрывает форму; ошибка сети — показывает alert; pending-state блокирует кнопку
- [x] T017 [P] [US1] Тесты компонента в `frontend/src/features/resetPassword/ui/ResetPasswordForm/__tests__/ResetPasswordForm.test.tsx`: на mount валидирует токен через MSW; пока валидация — спиннер; невалидный токен — показывает сообщение и ссылку "Запросить новую"; валидный — показывает форму; submit с разными паролями — показывает "Пароли не совпадают"; submit success — показывает success state и кнопку перехода на /login
- [x] T018 [P] [US1] Перезаписать тест `frontend/src/pages/forgotPassword/__tests__/ForgotPasswordPage.test.tsx`: рендерит `ForgotPasswordForm` внутри `AuthLayout` (предыдущий тест-заглушки удалить/заменить)
- [x] T019 [P] [US1] Создать `frontend/src/pages/resetPassword/__tests__/ResetPasswordPage.test.tsx`: читает токен из `?token=...` через `useSearchParams`, передаёт в `<ResetPasswordForm token={...}/>` (или модель); при отсутствии токена — показывает ошибку

### Implementation for User Story 1

#### Backend

- [x] T020 [US1] Реализовать `backend/src/services/passwordReset.ts` (зависит от T006, T008, T010): экспортировать `requestPasswordReset(email: string): Promise<void>` (нормализует email, lookup user; **если есть** — создать `PasswordResetToken` через `prisma.passwordResetToken.create` и вызвать `sendPasswordResetEmail(email, ${FRONTEND_URL}/reset-password?token=${plainToken})`; **если нет** — ничего не делать; **функция всегда успешна** независимо от существования email — anti-enumeration), `verifyResetToken(token: string): Promise<void>` (хешировать, lookup `prisma.passwordResetToken.findUnique({ where: { tokenHash } })`, выкинуть error со statusCode 400 для not-found / `usedAt !== null` / `expiresAt < now` с конкретными русскими сообщениями), `applyPasswordReset(token, newPassword, confirmPassword): Promise<void>` (валидация полей и пароля, поиск токена, валидация (как в `verifyResetToken`), загрузка user, проверка нового ≠ текущему через `comparePassword`, транзакция `prisma.$transaction([passwordResetToken.update({ usedAt: NOW }), user.update({ password: hashed, isEmailVerified: true })])`). Использовать `process.env.FRONTEND_URL` с проверкой на старте (fail-fast если undefined)
- [x] T021 [US1] Экспортировать сервис из `backend/src/services/index.ts`
- [x] T022 [US1] Реализовать `backend/src/controllers/passwordReset.ts` (зависит от T020, T009): три хендлера `forgotPassword`, `verifyResetToken`, `resetPassword`. Шаблон обработки ошибок — как в `controllers/changePassword.ts` (try/catch, статус из error.statusCode, сообщение из error.message, 500 fallback). Все ответы — JSON, русские сообщения. **Никогда не раскрывать существование email** в ответах `forgotPassword`
- [x] T023 [US1] Экспортировать контроллеры из `backend/src/controllers/index.ts`
- [x] T024 [US1] Зарегистрировать три роута в `backend/src/routes/auth.ts`: `POST /forgot-password`, `POST /reset-password/verify`, `POST /reset-password`. **Все publi**c (без `authenticateToken`). На этом этапе — БЕЗ rate-limit middleware (добавим в US3, чтобы тесты US1 проходили в test-env где limiter всё равно skip-ается)

#### Frontend — feature `forgotPassword`

- [x] T025 [P] [US1] Создать `frontend/src/features/forgotPassword/models/forgotPassword.model.ts`: стора `$email`, `$isSent`, `$error`; события `emailChanged`, `formSubmitted`, `formReset`; эффект `forgotPasswordFx({ email }) → authApi.forgotPassword`; реактивные связи через `sample` (по существующим конвенциям из `changePassword.model`); `$isLoading = forgotPasswordFx.pending`. Без `useState`, без `.on()` — только Effector
- [x] T026 [P] [US1] Создать `frontend/src/features/forgotPassword/models/forgotPassword.helpers.ts`: `extractAxiosError(error: unknown): string` (по образцу из `changePassword.helpers.ts`)
- [x] T027 [P] [US1] Создать `frontend/src/features/forgotPassword/models/forgotPassword.types.ts` (если нужны локальные типы — например, `ForgotPasswordFormState`); и `frontend/src/features/forgotPassword/models/index.ts` с `export * as forgotPasswordModel from "./forgotPassword.model";`
- [x] T028 [US1] Создать `frontend/src/features/forgotPassword/ui/ForgotPasswordForm/ForgotPasswordForm.tsx`: использует `useUnit` для биндинга стора и событий; поле TextField для email, кнопка "Отправить"; при `$isSent === true` рендерит нейтральное сообщение об отправке вместо формы; `disabled` кнопки если `$isLoading` или email пустой; русские лейблы; стилизация через MUI без inline `sx={{}}`
- [x] T029 [P] [US1] Создать `frontend/src/features/forgotPassword/ui/ForgotPasswordForm/ForgotPasswordForm.styled.ts`: `styled-components` для контейнера/кнопки в стиле существующего `LoginForm.styled.ts`
- [x] T030 [US1] Создать `frontend/src/features/forgotPassword/ui/ForgotPasswordForm/index.ts` (барель), и `frontend/src/features/forgotPassword/index.ts` (`export { ForgotPasswordForm } from "./ui/ForgotPasswordForm"; export { forgotPasswordModel } from "./models";`)

#### Frontend — feature `resetPassword`

- [x] T031 [P] [US1] Создать `frontend/src/features/resetPassword/models/resetPassword.model.ts`: стора `$token`, `$tokenStatus` (`"checking" | "valid" | "invalid_unknown" | "invalid_expired" | "invalid_used"`), `$tokenError`, `$newPassword`, `$confirmPassword`, `$error`, `$isSuccess`; события `tokenSet`, `newPasswordChanged`, `confirmPasswordChanged`, `formSubmitted`, `formReset`; эффекты `verifyResetTokenFx`, `resetPasswordFx`; `Gate` (например, `ResetPasswordGate`) для запуска проверки токена при mount; `sample({ clock: ResetPasswordGate.open, source: $token, filter: Boolean, target: verifyResetTokenFx })`; `sample({ clock: verifyResetTokenFx.failData, fn: mapToTokenStatus, target: $tokenStatus })`
- [x] T032 [P] [US1] Создать `frontend/src/features/resetPassword/models/resetPassword.helpers.ts`: `extractAxiosError`, `mapResetTokenError(error): { status: TokenStatus; message: string }` (распарсить response.status/data.error и вернуть human-readable русское сообщение)
- [x] T033 [P] [US1] Создать `frontend/src/features/resetPassword/models/resetPassword.types.ts` (`TokenStatus` тип) и `frontend/src/features/resetPassword/models/index.ts` (`export * as resetPasswordModel from "./resetPassword.model";`)
- [x] T034 [US1] Создать `frontend/src/features/resetPassword/ui/ResetPasswordForm/ResetPasswordForm.tsx`: проп `token: string` или чтение из стора; useGate для запуска проверки; рендеринг по `$tokenStatus`: `"checking"` — спиннер, `"invalid_*"` — alert + ссылка на `/forgot-password`, `"valid"` — форма с двумя password-полями + submit; на `$isSuccess` — success-сообщение + кнопка `/login`; русские тексты
- [x] T035 [P] [US1] Создать `frontend/src/features/resetPassword/ui/ResetPasswordForm/ResetPasswordForm.styled.ts`
- [x] T036 [US1] Создать `frontend/src/features/resetPassword/ui/ResetPasswordForm/index.ts` и `frontend/src/features/resetPassword/index.ts` (барели)

#### Frontend — pages and routing

- [x] T037 [US1] Перезаписать `frontend/src/pages/forgotPassword/ForgotPasswordPage.tsx`: удалить заглушку, рендерить `<ForgotPasswordForm />` внутри `Styled.Container`. Удалить кнопку "Назад" и ненужные импорты
- [x] T038 [P] [US1] Создать `frontend/src/pages/resetPassword/ResetPasswordPage.tsx`: считывает `?token=` через `useSearchParams` от react-router; пробрасывает токен в `<ResetPasswordForm token={token}/>` (или диспатчит `tokenSet` и рендерит без пропа); при отсутствии токена — показывает alert "Ссылка некорректна" и ссылку на `/forgot-password`
- [x] T039 [P] [US1] Создать `frontend/src/pages/resetPassword/ResetPasswordPage.styled.ts` (по аналогии с `ForgotPasswordPage.styled.ts`)
- [x] T040 [US1] Создать `frontend/src/pages/resetPassword/index.ts` (`export { ResetPasswordPage } from "./ResetPasswordPage";`); добавить экспорт `ResetPasswordPage` в `frontend/src/pages/index.ts`
- [x] T041 [US1] Добавить Route `/reset-password` в `frontend/src/app/components/AppRoutes/AppRoutes.tsx` (доступен без авторизации, обёрнут в `AuthLayout`); импорт `ResetPasswordPage` из `@pages`

**Checkpoint**: User Story 1 полностью функциональна. Тестируется ручным сценарием 1–5 из `quickstart.md`. Возможен рефактор/коммит/демо. MVP готов.

---

## Phase 4: User Story 2 - Точка входа "Забыли пароль?" с экрана логина (Priority: P2)

**Goal**: На форме логина появляется ссылка, ведущая на `/forgot-password`.

**Independent Test**: Открыть `/login` → найти кнопку/ссылку "Забыли пароль?" под полями (или возле кнопки "Войти") → клик → переход на `/forgot-password`. Тест проходит независимо: даже если US1 не реализована, ссылка ведёт на существующую страницу (заглушка или реальная форма после US1).

### Tests for User Story 2

- [x] T042 [P] [US2] Расширить `frontend/src/features/auth/ui/LoginForm/__tests__/LoginForm.test.tsx` (создать файл, если отсутствует): тест "renders forgot password link"; "клик по ссылке вызывает navigate('/forgot-password')" (mock react-router-dom `useNavigate` или проверка через `MemoryRouter` + `screen.getByText`)

### Implementation for User Story 2

- [x] T043 [US2] Модифицировать `frontend/src/features/auth/ui/LoginForm/LoginForm.tsx`: добавить `Button variant="text" size="small"` или `Link` с текстом "Забыли пароль?" под полем пароля (или непосредственно перед кнопкой "Войти"); навигация — через `<Link to="/forgot-password">` (стилем — как существующий `<Link to="/register">` внизу формы) или через `useNavigate`. Соблюсти конвенции: function expression, named export, без inline `sx={{}}`

**Checkpoint**: US1 + US2 работают независимо. Пользователь, не залогиненный, может найти и пройти flow.

---

## Phase 5: User Story 3 - Защита от перебора и злоупотреблений (Priority: P3)

**Goal**: Per-IP rate-limit на `/forgot-password`; per-email cooldown 60 сек; инвалидация старых токенов при новом запросе; логирование сбоев email; защита от энумерации (уже частично сделана в US1, тут — закрепляем тестами).

**Independent Test**: Симулировать злоупотребление: 6 запросов с одного IP за минуту — 6-й получает 429; запрос дважды для одного email с интервалом <60 сек — второй не отправляет письмо (mock на email service показывает один вызов); запрос дважды с интервалом ≥60 сек — старый токен помечен `usedAt`, переход по старой ссылке отклонён, новая ссылка работает.

### Tests for User Story 3

- [x] T044 [P] [US3] Тесты cooldown в `backend/src/services/__tests__/passwordReset.test.ts` (расширить файл из T012): два последовательных вызова `requestPasswordReset(email)` с интервалом <60 сек — `sendPasswordResetEmail` вызван только один раз; запись `PasswordResetToken` создана только одна; интервал ≥60 сек — обе записи и оба письма
- [x] T045 [P] [US3] Тесты multi-token invalidation в `backend/src/services/__tests__/passwordReset.test.ts`: после двух вызовов `requestPasswordReset` (с интервалом ≥60 сек чтобы пройти cooldown) — старый токен имеет `usedAt !== null`, новый — `usedAt === null`; `verifyResetToken(старый_токен)` отклоняется с `"Эта ссылка уже была использована..."`; `verifyResetToken(новый_токен)` проходит
- [x] T046 [P] [US3] Тест rate-limiter в `backend/src/middleware/__tests__/rateLimit.test.ts` (расширить файл): применить `passwordResetRateLimiter` к тестовому endpoint, симулировать 6 запросов с одного IP, последний — 429 с русским сообщением. Использовать переопределение `NODE_ENV !== "test"` локально либо собственный `skip: () => false` тестовый инстанс
- [x] T047 [P] [US3] Тест логирования сбоев email в `backend/src/services/__tests__/passwordReset.test.ts`: мок `sendPasswordResetEmail` бросает error → `requestPasswordReset` не выкидывает наверх, но вызывает `console.error` (или logger) — пользователь получит нейтральный ответ от контроллера

### Implementation for User Story 3

- [x] T048 [US3] Добавить `passwordResetRateLimiter` в `backend/src/middleware/rateLimit.ts`: `windowMs: FIFTEEN_MINUTES`, `max: 5`, `message: { error: "Слишком много попыток. Попробуйте позже" }`, `skip: () => isTestEnv` (как у существующих лимитеров)
- [x] T049 [US3] Применить `passwordResetRateLimiter` к роуту `POST /forgot-password` в `backend/src/routes/auth.ts` (изменение T024)
- [x] T050 [US3] Добавить per-email cooldown в `requestPasswordReset` в `backend/src/services/passwordReset.ts`: перед созданием токена — `prisma.passwordResetToken.findFirst({ where: { userId, createdAt: { gte: NOW - 60 sec } } })`; если есть — early-return (без создания и без отправки), но **функция всё равно успешна** (нейтральный ответ контроллера сохраняется)
- [x] T051 [US3] Добавить multi-token invalidation в `requestPasswordReset` в `backend/src/services/passwordReset.ts`: до `passwordResetToken.create` выполнить `prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: NOW } })` чтобы пометить все старые активные токены пользователя как использованные (FR-011)
- [x] T052 [US3] Добавить `try/catch` вокруг `sendPasswordResetEmail` в `requestPasswordReset` с `console.error("Password reset email failed", { userId, error })` и продолжением успешного flow — пользователь получит нейтральный ответ независимо от сбоя email

**Checkpoint**: Все 3 user story работают. Защита от перебора и злоупотреблений активна. Готово к prod-deploy.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Финальная проверка качества, документация, soak-test через quickstart.

- [ ] T053 [P] Обновить `CHANGELOG.md` через `/changelog` (project convention из `CLAUDE.md`)
- [ ] T054 [P] Сгенерировать новостную запись через `/news` (project convention)
- [x] T055 Прогнать quality gates по конвенции: `cd backend && npm run build && npm test`; `cd frontend && npm run lint && npm test && npm run find-cycle`. Все — без ошибок
- [ ] T056 Прогнать вручную сценарии 1–9 из `specs/028-forgot-password/quickstart.md` (включая rate-limit и cooldown)
- [x] T057 Перечитать `docs/conventions/frontend.md` и `docs/conventions/backend.md`, ручной чек: все новые файлы — named exports, function expressions, без `any`, без inline `sx={{}}`, русские сообщения, `index.ts` барели в каждой новой папке, файлы в пределах лимитов (≤150 строк компоненты, ≤200 модели, ≤150 контроллеры)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: без зависимостей
- **Phase 2 (Foundational)**: после Phase 1; **блокирует** US1, US2, US3
- **Phase 3 (US1)**: после Phase 2
- **Phase 4 (US2)**: после Phase 2; **независим** от US1 (ссылка ведёт на /forgot-password — страница существует и до US1 как заглушка, и после US1 как реальная форма)
- **Phase 5 (US3)**: после Phase 2; на практике хочется иметь сервис из US1 (T020) для модификаций T050–T052; **тестово** независим (можно тестировать middleware в изоляции)
- **Phase 6 (Polish)**: после всех желаемых US

### User Story Dependencies

- **US1**: после Phase 2; никаких других US-зависимостей
- **US2**: после Phase 2; функционально может быть мерджнут до US1 (ведёт на стабовую страницу — пользователь увидит "в разработке"; после US1 — реальную форму). Технически не зависит от US1
- **US3**: после Phase 2 + желательно T020 (сервис существует, чтобы было что модифицировать). Для тестов middleware (T046) и логирования (T047) — параллельно с US1 OK

### Внутри User Story 1

Backend и frontend параллельны после Phase 2. Внутри backend: T020 → T021 → T022 → T023 → T024. Внутри frontend feature `forgotPassword`: модели (T025–T027) → UI (T028–T030); внутри `resetPassword`: модели (T031–T033) → UI (T034–T036). Pages (T037–T041) — после соответствующих feature.

### Parallel Opportunities

- T002, T003 — параллельно (Phase 1)
- T006, T009, T010, T011 — параллельно после T005 (миграция применена)
- T007 — параллельно с T008 (после T006)
- T012, T013, T014, T015, T016, T017, T018, T019 — все тесты US1 параллельно (разные файлы, не зависят друг от друга)
- T025/T026/T027 параллельно с T031/T032/T033 (две независимые features)
- T029, T035, T039 — параллельно (стилевые файлы независимы)
- T042 (тест US2) параллелен любым US1/US3 задачам
- T044, T045, T046, T047 — все тесты US3 параллельно

---

## Parallel Example: User Story 1 (после Phase 2)

```bash
# Все тесты US1 — параллельно (разные файлы):
Task T012: "passwordReset service unit tests"
Task T013: "passwordReset controller integration tests"
Task T014: "forgotPassword model tests"
Task T015: "resetPassword model tests"
Task T016: "ForgotPasswordForm tests"
Task T017: "ResetPasswordForm tests"
Task T018: "ForgotPasswordPage tests"
Task T019: "ResetPasswordPage tests"

# После того как тесты написаны и красные — реализация feature моделей параллельно:
Task T025: "forgotPassword.model.ts"
Task T026: "forgotPassword.helpers.ts"
Task T031: "resetPassword.model.ts"
Task T032: "resetPassword.helpers.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 (Setup) → Phase 2 (Foundational)
2. Phase 3 (US1) — полный backend + frontend + страницы + роутинг
3. **STOP**: ручной прогон сценариев 1–5 из quickstart.md
4. Если устраивает — мерджить и деплоить как MVP. Пользователи могут восстанавливать пароль через прямой URL `/forgot-password`

### Incremental Delivery

1. MVP (Phase 1 + 2 + 3) → деплой
2. US2 (Phase 4) → деплой → ссылка с экрана логина обнаруживает фичу для всех
3. US3 (Phase 5) → деплой → security hardening для prod
4. Polish (Phase 6) → финальный чек

### Parallel Team Strategy

После Phase 2:

- Developer A: backend US1 (T012, T013, T020–T024)
- Developer B: frontend US1 features + pages (T014–T019, T025–T041)
- Developer C: US2 (T042, T043) — параллельно
- Developer D: US3 middleware и тесты (T046, T048) — параллельно с US1

---

## Notes

- [P] = разные файлы, без зависимостей. Перед запуском [P] убедиться, что все предыдущие необходимые задачи завершены
- [Story] метка маркирует трассировку до user story из spec.md
- Все тесты пишутся ДО (или параллельно) с реализацией; красные тесты — норма до момента имплементации
- После каждой задачи коммит (атомарность). Сообщение коммита по конвенции проекта (см. недавние коммиты в `git log`)
- Чекпоинты после каждой phase — момент для остановки и валидации
- Не нарушать FSD: pages → features → entities → shared (только сверху вниз)
- Никаких `any`, `useState` для form state, `style={{}}`, `sx={{}}`, default exports
