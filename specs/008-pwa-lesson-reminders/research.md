# Research: PWA и напоминания об уроках

**Feature**: 008-pwa-lesson-reminders
**Date**: 2026-02-23

## Decision 1: Библиотека для отправки push-уведомлений

**Decision**: Использовать `web-push` npm-пакет на бэкенде

**Rationale**:
- Стандартная библиотека для Web Push Protocol в Node.js
- Поддерживает VAPID (Voluntary Application Server Identification)
- Работает с Chrome, Firefox, Safari (iOS 16.4+), Edge
- Минимальная зависимость, нет привязки к Firebase/Google
- Подходит для small-scale приложения (десятки пользователей)

**Alternatives considered**:
- Firebase Cloud Messaging (FCM) — избыточно, создаёт зависимость от Google, нужна Firebase-консоль
- Собственная реализация Web Push Protocol — неоправданная сложность
- Отправка только через WebSocket — не работает при закрытом приложении

## Decision 2: Подход к планированию уведомлений

**Decision**: Cron-опрос (polling) каждую минуту

**Rationale**:
- Уже есть `node-cron` в проекте и паттерн ежеминутного cron (`updateLessonStatuses`)
- Для десятков пользователей — нулевая нагрузка на БД
- Устойчив к перезагрузкам сервера (нет потери in-memory таймеров)
- 1-минутная точность более чем достаточна для напоминаний
- Максимально простая реализация

**Alternatives considered**:
- Индивидуальные setTimeout — теряются при перезапуске сервера
- Bull/BullMQ очередь (Redis) — избыточная инфраструктура для 10-20 пользователей
- Scheduled Jobs (pg-boss) — лишняя зависимость

## Decision 3: Предотвращение дублирования уведомлений

**Decision**: Отдельная таблица `ScheduledReminder` со статусами

**Rationale**:
- В спеке определена сущность ScheduledReminder с привязкой к уроку, пользователю и интервалу
- Статусы (pending/sent/cancelled) позволяют отслеживать, какие уведомления отправлены
- При пересчёте напоминаний (изменение урока) — отмена старых, создание новых
- Чище, чем добавлять поля `reminderSentAt` в Lesson — разделение ответственности

**Alternatives considered**:
- Поле `reminderSentAt` в Lesson — не поддерживает несколько интервалов на один урок
- In-memory Set отправленных ID — теряется при перезапуске

## Decision 4: Service Worker для PWA

**Decision**: Создать отдельный `push-sw.js` в `public/`, регистрировать вручную

**Rationale**:
- CRA/Craco не включает service worker по умолчанию (serviceWorker.unregister() в шаблоне)
- Для push-уведомлений нужен минимальный SW — обработка событий `push` и `notificationclick`
- Workbox избыточен для текущих нужд (нам нужен только push, не полный offline-first)
- Регистрация через модуль в `app/model/` — вписывается в Effector-архитектуру

**Alternatives considered**:
- Workbox (через craco plugin) — избыточно, сложная настройка, не нужен полный offline cache
- CRA built-in service worker — deprecated в CRA 4+

## Decision 5: Хранение настроек напоминаний

**Decision**: Отдельная таблица `ReminderSettings` с массивом интервалов

**Rationale**:
- В спеке определена сущность ReminderSettings с: enabled, intervals[], muteWhenInLesson
- Один пользователь — одна запись настроек
- Интервалы хранятся как массив целых чисел (минуты): `[5, 30]`
- PostgreSQL поддерживает массивы нативно через Prisma `Int[]`

**Alternatives considered**:
- Поля в User модели — засоряет основную модель, нарушает SRP
- JSON-поле — менее типобезопасно, нельзя фильтровать по отдельным значениям
- Отдельная таблица ReminderInterval (one-to-many) — overengineering для 5 вариантов

## Decision 6: Manifest.json и PWA-установка

**Decision**: Обновить существующий `manifest.json`, добавить iOS мета-теги

**Rationale**:
- `manifest.json` уже существует, но с дефолтными CRA значениями
- Нужно обновить: name → «Репетитор», display → standalone, theme_color, иконки
- Для iOS нужны apple-touch-icon и apple-mobile-web-app мета-теги в index.html
- iOS показывает установку только через «Поделиться» → «На экран Домой» — нужна инструкция в UI

**Alternatives considered**:
- TWA (Trusted Web Activity) для Android — требует Play Store, избыточно
- Capacitor/Cordova обёртка — нативное приложение не нужно

## Decision 7: Структура фронтенда по FSD

**Decision**: Entity `notifications` + Feature `notificationSettings` + секция в Profile page

**Rationale**:
- Entity (`entities/notifications/`) — core state: push support, permission, settings, subscription
- Feature (`features/notificationSettings/`) — UI компоненты настроек
- Секция в Profile page — не отдельная страница, а раздел в существующей странице профиля
- API модуль в shared (`shared/api/notifications.ts`)
- Соответствует FSD и существующим паттернам (news feature как референс)

**Alternatives considered**:
- Отдельная страница Notifications — overengineering для одного раздела настроек
- Всё в app/ слое — нарушает FSD, нельзя переиспользовать

## Decision 8: Определение «идёт ли сейчас урок» для режима «Не беспокоить»

**Decision**: Проверка по запланированному расписанию (startTime/endTime) в таблице Lesson

**Rationale**:
- Уже есть cron `updateLessonStatuses`, который ставит `IN_PROGRESS` по startTime
- Для проверки в cron напоминаний: найти уроки со `status = IN_PROGRESS` для данного пользователя
- Но надёжнее проверять по расписанию (startTime <= now < endTime), а не по статусу — статус может не обновиться мгновенно
- Спек явно требует: «по запланированному расписанию, не по фактическому» (FR-028)

**Alternatives considered**:
- Проверка по status = IN_PROGRESS — зависимость от другого cron, возможна рассинхронизация
- WebSocket heartbeat от клиента — ненадёжно, клиент может быть оффлайн

## Decision 9: VAPID ключи

**Decision**: Генерировать один раз, хранить в .env

**Rationale**:
- VAPID (Voluntary Application Server Identification) — пара ключей (public + private)
- Public key передаётся клиенту через API endpoint `GET /api/push/vapid-key`
- Private key используется на сервере для подписи push-запросов
- Генерируются один раз: `web-push generate-vapid-keys`
- Добавить в .env.example как обязательные переменные

**Alternatives considered**:
- Хранение в БД — нет смысла, ключи статичны
- Генерация при каждом запуске — сломает все существующие подписки
