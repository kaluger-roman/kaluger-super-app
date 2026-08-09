# Research: Мессенджер MAX и пробные уроки без ученика

**Date**: 2026-08-08 | **Plan**: [plan.md](./plan.md)

Неизвестных `NEEDS CLARIFICATION` в Technical Context нет. Ниже — принятые
проектные решения по результатам анализа кодовой базы (полный анализ влияния
выполнен по `backend/src` и `frontend/src`).

## D1. Расширение enum ContactMethod

- **Decision**: Добавить значение `MAX` в Prisma enum `ContactMethod`
  (`backend/prisma/schema.prisma:189-192`). Миграция —
  `ALTER TYPE "ContactMethod" ADD VALUE 'MAX'` (генерирует Prisma Migrate).
- **Rationale**: Enum уже используется для `contactMethod`
  и `parentContactMethod` студента; добавление значения — единственное
  изменение схемы, существующие данные не затрагиваются.
- **Alternatives considered**: строковое поле вместо enum — отвергнуто:
  ломает существующую типизацию и валидацию без выгоды.

## D2. Лейблы мессенджеров — общий маппер

- **Decision**: Завести в `frontend/src/shared/constants` маппер
  `CONTACT_METHOD_LABELS: Record<ContactMethod, string>` =
  `{ WHATSAPP: "WhatsApp", TELEGRAM: "Telegram", MAX: "MAX" }` и заменить
  захардкоженные тернарники.
- **Rationale**: Сейчас лейблы захардкожены в 3+ местах, включая тернарник
  `contactMethod === "WHATSAPP" ? "WhatsApp" : "Telegram"`
  (`StudentContacts.tsx:26,34`), который молча покажет «Telegram» для MAX.
  С тремя значениями тернарники становятся ошибкоопасными.
- **Alternatives considered**: точечные правки тернарников — отвергнуто:
  третье значение в двух ветках не выразить, дублирование в 3 местах
  нарушает согласованность (Constitution V).

## D3. Модель пробного урока без ученика

- **Decision**: `Lesson.studentId` → nullable (`String?`, relation
  optional), новые поля: `prospectName String?`, `prospectPhone String?`,
  `prospectContactMethod ContactMethod?`. Инвариант «указан ровно один из
  studentId / prospectName» — на уровне валидатора бекенда
  (`controllers/lessons/validators.ts`), без DB check-констрейнта.
- **Rationale**: Потенциальный ученик — это 1-3 поля контактной информации;
  отдельная таблица дала бы join и CRUD ради трёх полей (Constitution VII —
  YAGNI). Валидация в контроллерах — существующий паттерн проекта.
- **Alternatives considered**:
  - Отдельная сущность `Prospect` — отвергнуто: преждевременная абстракция.
  - Автосоздание «скрытого» студента с флагом trial — отвергнуто: засоряет
    таблицу студентов, требует фильтрации во всех выборках студентов.
  - DB check-constraint — отвергнуто: Prisma Migrate не управляет ими
    декларативно; в проекте инварианты держатся в валидаторах.

## D4. Цена пробного урока

- **Decision**: Для урока без ученика `price ?? 0` (вместо текущего
  `price ?? student.hourlyRate`, `createLesson.ts:48`). Поле цены в форме
  предзаполняется нулём при включении режима.
- **Rationale**: «Пробный» в статистике уже определяется как цена 0/null
  (`getStatistics.ts:82-84`) — урок без ученика с ценой 0 автоматически
  попадает в `trialLessonsCount` без изменений статистики.
- **Alternatives considered**: отдельный флаг `isTrial` — отвергнуто:
  дублирует существующее правило «trial = price 0», требует пересмотра
  статистики.

## D5. Запрет повторения для урока без ученика

- **Decision**: Валидатор отклоняет `isRecurring: true` без `studentId`
  (ошибка на русском). На фронте переключатель повторения скрывается
  в режиме «без ученика».
- **Rationale**: Вся recurring-механика завязана на `studentId`: ключ серии
  `${tutorId}-${studentId}-...` (`recurringHelpers.ts:31`), создание копий
  (`recurringLessons.ts:88`). Пробное занятие по смыслу разовое.
- **Alternatives considered**: поддержать серии без ученика — отвергнуто:
  переделка ключей серий ради сценария, которого нет в спеке.

## D6. Отмена и перенос оплаты

- **Decision**: `findNextUnpaidLesson` (`getCancellationInfo.ts:6-22`)
  и логика переноса оплаты (`updateLesson.ts:118-130`) выполняются только
  при `studentId != null`; для урока без ученика отмена — простая смена
  статуса, `nextLessonStudentName` возвращается как отсутствующий.
- **Rationale**: Перенос оплаты ищет следующий урок «того же студента» —
  для урока без ученика очереди не существует.

## D7. Напоминания (push)

- **Decision**: В `reminderProcessor.ts:162` заменить `lesson.student.name`
  на `lesson.student?.name ?? lesson.prospectName ?? ""`; напоминания для
  уроков без ученика работают как обычно (репетитору).
- **Rationale**: Это подтверждённый crash-point: при nullable relation
  текущий код падает с `TypeError`. Напоминание о пробном уроке ценно —
  это первая встреча с новым человеком.

## D8. Привязка урока к ученику

- **Decision**: Через существующий `PUT /api/lessons/:id`: если у урока
  `studentId = null` и в запросе передан `studentId` — бекенд проверяет
  принадлежность студента репетитору, устанавливает связь и **очищает**
  prospect-поля. Обратная операция (отвязка) не поддерживается. На фронте —
  выключение toggle «без ученика» в форме редактирования открывает
  StudentSelector.
- **Rationale**: Не требует нового эндпоинта; очистка prospect-полей
  реализует требование спеки «имя и контакты потенциального ученика больше
  не используются» и исключает рассинхронизацию данных.
- **Alternatives considered**: хранить prospect-поля после привязки «для
  истории» — отвергнуто: два источника правды об имени; отвязка не в скоупе
  (YAGNI).

## D9. Кабинет ученика и broadcast

- **Decision**: Изменений в выборках кабинета не требуется —
  `studentCabinet.ts:22-35` использует явный `select` без prospect-полей,
  утечки нет. В `studentLessonBroadcast` добавить ранний выход при
  `studentId = null`.
- **Rationale**: Уроки без ученика не принадлежат ни одному кабинету;
  broadcast маршрутизируется через связь студента, без неё событие
  отправлять некому.

## D10. Отображение на фронтенде

- **Decision**: Тип `Lesson` (`shared/types/lesson.ts`) получает
  `studentId: string | null` и prospect-поля. Имя для отображения — общий
  хелпер `getLessonDisplayName(lesson)` = имя студента или `prospectName`;
  визуальная пометка «пробный» — chip в карточке урока при
  `studentId = null`. Компонент `StudentName` уже безопасен для null.
- **Rationale**: `LessonCard.tsx:53` уже использует optional chaining, но
  без fallback имя пропадёт; единый хелпер закрывает список уроков,
  календарь и детали одним местом.

## D11. Статистика по студентам

- **Decision**: В `getStudentStats.ts` (groupBy `studentId`) добавить фильтр
  `studentId: { not: null }`, чтобы уроки без ученика не образовывали
  «пустую» группу. Общая статистика (`getStatistics.ts`) изменений
  не требует — она не обращается к студенту.
- **Rationale**: Группа с `null`-ключом либо упадёт при маппинге на имена
  студентов, либо покажет безымянную строку в отчёте.

## D12. Тексты ошибок валидации студента

- **Decision**: Обновить «Не выбран способ связи (WhatsApp или Telegram)»
  (`students/validators.ts:12,33`) на вариант с перечислением трёх
  мессенджеров; валидатор принимает `MAX`.
- **Rationale**: FR-004 — тексты ошибок должны отражать новый список.
