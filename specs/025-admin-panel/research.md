# Research: Admin Panel

## 1. Аутентификация админа через ENV

**Decision**: Отдельный JWT-поток с кредами из `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Пароль хранится захешированным в ENV (bcrypt hash). Отдельный middleware `authenticateAdmin`.

**Rationale**: Админ не является пользователем приложения — не нужна запись в таблице User. ENV-подход прост, не требует миграций для самого админа, и стандартен для single-admin сценариев.

**Alternatives considered**:
- Поле `isAdmin` в User — загрязняет пользовательскую модель, требует миграцию, сложнее управлять
- Отдельная таблица Admin — overkill для одного админа
- Basic Auth — менее гибко, нет стандартного token refresh

## 2. Хранение пароля в ENV

**Decision**: В `ADMIN_PASSWORD` хранить bcrypt hash (как `$2b$12$...`). При логине сравнивать через `bcrypt.compare()`.

**Rationale**: Хранить plain-text пароль в ENV — плохая практика. Bcrypt hash безопасен даже при утечке ENV.

**Alternatives considered**:
- Plain-text в ENV — небезопасно
- Генерация при запуске — неудобно, пароль меняется при каждом рестарте

## 3. Frontend: изоляция админки

**Decision**: Отдельная страница `/admin/login` и `/admin/dashboard`. Отдельный Effector-стор `$adminToken`. Отдельный axios instance `adminApi` с интерцептором для `adminToken`.

**Rationale**: Полная изоляция от пользовательского потока. Пользователь и админ могут быть залогинены одновременно. FSD: admin — отдельная feature.

**Alternatives considered**:
- Общий axios — конфликт токенов, сложная логика переключения
- Отдельное SPA для админки — overkill, дополнительный билд

## 4. Перенос бэкап-эндпоинтов под админ-контекст

**Decision**: Перенести существующие `/api/backup/*` под `/api/admin/backup/*`. Заменить `authenticateToken` на `authenticateAdmin`.

**Rationale**: Бэкапы — административная функция, не пользовательская. Обычные пользователи не должны иметь доступ к бэкапам.

## 5. Обзор системы (System Overview)

**Decision**: Endpoint `GET /api/admin/overview` возвращает агрегированные данные: count users, lessons, students, server uptime.

**Rationale**: Простые `COUNT(*)` запросы через Prisma, плюс `process.uptime()` для аптайма. Минимальная нагрузка.
