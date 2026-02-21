# Feature Specification: Authentication & Email Verification

**Feature Branch**: `001-auth`
**Created**: 2026-02-20
**Status**: Implemented
**Input**: Retroactive spec for existing auth system

## User Scenarios & Testing

### User Story 1 - Registration (Priority: P1)

Репетитор создаёт аккаунт, указывая email, имя и пароль. После регистрации
на email приходит 6-значный код подтверждения.

**Why this priority**: Без регистрации невозможно использовать систему.

**Independent Test**: Отправить POST /api/auth/register с валидными данными,
убедиться что аккаунт создан и код отправлен.

**Acceptance Scenarios**:

1. **Given** незарегистрированный пользователь, **When** заполняет форму
   (email, имя, пароль 8+ символов с заглавной, строчной, цифрой),
   **Then** аккаунт создаётся, на email приходит 6-значный код, редирект
   на /verify-email
2. **Given** email уже зарегистрирован, **When** пытается зарегистрироваться,
   **Then** ошибка "Email уже зарегистрирован"
3. **Given** слабый пароль (без заглавной/цифры/короткий), **When** отправляет
   форму, **Then** валидационная ошибка

---

### User Story 2 - Email Verification (Priority: P1)

После регистрации пользователь вводит 6-значный код с email для подтверждения
аккаунта. Код действует 15 минут.

**Why this priority**: Без верификации нельзя войти в систему.

**Independent Test**: Вызвать POST /api/auth/verify-email с валидным кодом,
убедиться что isEmailVerified=true и возвращается JWT.

**Acceptance Scenarios**:

1. **Given** пользователь на странице /verify-email, **When** вводит корректный
   6-значный код, **Then** email подтверждён, выдаётся JWT токен, редирект
   на /dashboard
2. **Given** код просрочен (>15 мин), **When** вводит код, **Then** ошибка
3. **Given** неверный код, **When** вводит, **Then** ошибка "Неверный код"
4. **Given** пользователь хочет новый код, **When** нажимает "Отправить
   повторно", **Then** новый код отправлен, кнопка заблокирована на 60 сек

---

### User Story 3 - Login (Priority: P1)

Репетитор входит в систему по email и паролю, получает JWT токен.

**Why this priority**: Основной способ входа в систему.

**Independent Test**: POST /api/auth/login с валидными credentials,
убедиться что возвращается JWT.

**Acceptance Scenarios**:

1. **Given** подтверждённый email, **When** вводит верный email/пароль,
   **Then** получает JWT, редирект на /dashboard
2. **Given** неподтверждённый email, **When** пытается войти,
   **Then** ошибка 403, редирект на /verify-email
3. **Given** неверный пароль, **When** отправляет форму,
   **Then** ошибка "Неверный email или пароль"

---

### User Story 4 - Profile Management (Priority: P3)

Репетитор просматривает и редактирует своё имя на странице профиля.

**Why this priority**: Вспомогательная функция, не блокирует основной workflow.

**Independent Test**: PUT /api/auth/profile с новым именем, проверить
обновление.

**Acceptance Scenarios**:

1. **Given** страница /profile, **When** нажимает "Редактировать",
   **Then** поле имени становится редактируемым
2. **Given** режим редактирования, **When** вводит новое имя и сохраняет,
   **Then** имя обновляется на сервере и в UI
3. **Given** пустое имя, **When** пытается сохранить, **Then** ошибка валидации

---

### Edge Cases

- Попытка верификации уже подтверждённого email
- Повторная отправка кода до истечения cooldown (60 сек)
- Одновременная регистрация с одним email
- JWT токен истёк — редирект на /login
- Вставка кода из буфера обмена (paste) в форму верификации

## Requirements

### Functional Requirements

- **FR-001**: Система MUST позволять регистрацию по email + пароль + имя
- **FR-002**: Пароль MUST содержать минимум 8 символов, заглавную букву,
  строчную букву и цифру
- **FR-003**: Система MUST отправлять 6-значный код подтверждения на email
  через Resend API
- **FR-004**: Код верификации MUST быть действителен 15 минут
- **FR-005**: Повторная отправка кода MUST блокироваться на 60 секунд
- **FR-006**: Login MUST возвращать JWT Bearer токен
- **FR-007**: Login MUST отклоняться с 403 если email не подтверждён
- **FR-008**: Профиль MUST позволять менять только имя пользователя
- **FR-009**: Все защищённые endpoints MUST требовать JWT в Authorization header

### Key Entities

- **User**: email (unique), password (hashed), name, isEmailVerified,
  verificationCode, verificationCodeExpiry

## Success Criteria

### Measurable Outcomes

- **SC-001**: Регистрация + верификация завершается менее чем за 3 минуты
- **SC-002**: Невалидные credentials отклоняются с корректным сообщением об ошибке
- **SC-003**: JWT токен корректно авторизует все защищённые endpoints

## Implementation Reference

### Frontend
- `features/auth/` — LoginForm, RegisterForm, login-form.model, register-form.model
- `features/emailVerification/` — EmailVerificationForm
- `entities/user/` — user.model ($user, $isAuthenticated, $authToken)
- `entities/verification/` — verification.model ($verificationCode, $canResend)
- Pages: `/login`, `/register`, `/verify-email`, `/profile`

### Backend
- `routes/auth.ts` — все auth endpoints
- `controllers/auth.ts` — register, login, getProfile, updateProfile
- `controllers/emailVerification.ts` — verifyEmail, resendVerification
- `services/email.ts` — sendVerificationEmail (Resend API)
- `utils/verification.ts` — generateVerificationCode
- `middleware/auth.ts` — JWT Bearer validation
