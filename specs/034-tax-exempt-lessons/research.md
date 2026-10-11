# Research: Уроки без налога (034-tax-exempt-lessons)

**Feature**: `034-tax-exempt-lessons` | **Phase**: 0 | **Spec**: [spec.md](./spec.md)

Спека утверждена, маркеров `[NEEDS CLARIFICATION]` нет; две развилки
закрыты в разделе Clarifications спеки (перенос оплаты при отмене,
распространение изменений по вкладкам). Ниже технические решения,
которые спека оставляет реализации. Всё проверено по коду этого worktree.

---

## R1. Хранение: `Lesson.isTaxExempt`

**Decision**: `isTaxExempt Boolean @default(false)` в модели `Lesson`
(`backend/prisma/schema.prisma`), рядом с `isPaid` / `isRecurring`.
Миграция `add_lesson_tax_exempt`:
`ALTER TABLE "lessons" ADD COLUMN "isTaxExempt" BOOLEAN NOT NULL DEFAULT false;`
Индекс не нужен.

**Rationale**: `NOT NULL DEFAULT false` проставляет `false` всем
существующим урокам тем же DDL, отдельный `UPDATE` не нужен (FR-001,
SC-001). Nullable-поле ввело бы третье состояние «не задано», которого
в спеке нет. Индекс бесполезен: признак никогда не участвует в `where`
(расчёт налога берёт уже отобранные `paidInRangeWhere` строки и читает
признак из `select`), фильтра списка по признаку нет (вне рамок).

**Alternatives considered**:

- Отдельная таблица исключений `tax_exempt_lessons`. Признак бинарный,
  один на урок, без истории (Assumptions). Отклонено (принцип VII).
- Признак на уровне ученика. Прямо вынесено из рамок спеки. Отклонено.

---

## R2. Имя поля и контракт

**Decision**: `isTaxExempt` во всех слоях (Prisma, DTO, фронтовый `Lesson`,
`LessonFormData`); итог статистики `taxExemptIncome`. Именно эти имена
зафиксированы в маркерах `TODO(auto-feature)` утверждённых макетов
(`lesson.isTaxExempt`, `formData.isTaxExempt`,
`statistics.taxExemptIncome`,
`lessonActionsModel.lessonTaxExemptChanged({ lessonId, isTaxExempt })`).

**Rationale**: префикс `is` совпадает с соседними булевыми полями урока
(`isPaid`, `isRecurring`, `isHomeworkSentByTeacher`); контракт уже
определён макетами, бэкенд реализуется под него.

---

## R3. API: без новых эндпоинтов

**Decision**: признак пишется существующими `POST /api/lessons`
и `PUT /api/lessons/:id`. Попап шлёт `PUT` с телом `{ isTaxExempt }`,
форма — полный набор полей вместе с `isTaxExempt`. Чтение — существующие
`GET /api/lessons*` (сырые строки Prisma, поле появляется само).

**Rationale**: попап уже переключает оплату и ДЗ тем же `PUT`
с частичным телом (`lessonPaymentChanged`, `lessonHomeworkSentChanged`
в `frontend/src/features/lessons/models/lessonActions.model.ts`).
`buildLessonUpdateData` раскладывает `...updateData` в `dataToUpdate`,
так что после появления колонки поле доходит до Prisma без правок
сервиса обновления — нужна только валидация (R4).

**Alternatives considered**: отдельный `PATCH /api/lessons/:id/tax-exempt`.
Дублирует проверку владельца, логирование, патч сторов и уведомления,
которые у `PUT` уже есть. Отклонено.

---

## R4. Валидация значения признака

**Decision**: в `validateLessonData` (`controllers/lessons/validators.ts`)
и `validateUpdateData` (`controllers/lessons/updateLesson.validators.ts`):
если `isTaxExempt !== undefined && typeof isTaxExempt !== "boolean"` —
`400 { error: "Некорректное значение признака «Не облагается налогом»" }`.
`null`, строки `"true"`, числа отклоняются. Текст — константа рядом
с валидатором, общая для обоих.

**Rationale**: FR-009. Без проверки `"true"` или `null` дошли бы
до Prisma и вернули бы `500` (колонка `NOT NULL`, `...updateData`
пробрасывается целиком). Проверка явная по `typeof`, а не по truthiness:
`false` — легальное значение (тот же урок, что `commissionAmount: 0`
в 033, research R13). Владелец: `updateLesson` уже ищет урок по
`{ id, tutorId }` и отдаёт `404 «Урок не найден»` чужому репетитору.

---

## R5. Признак не должен менять статус отменённого урока (найденный баг)

**Decision**: в `computeUpdatedStatus`
(`backend/src/services/lessonUpdate/lessonUpdate.helpers.ts`) проверку
«нет явного статуса и урок отменён → `CANCELLED`» перенести **до**
проверок по времени. Регрессионные тесты: юнит на хелпер
(прошедший отменённый урок + `{}` → `CANCELLED`) и интеграционный
`PUT { isTaxExempt: true }` на прошедший отменённый урок.

**Rationale**: сейчас порядок такой: явный `CANCELLED` → `end <= now`
→ `COMPLETED` → … → «отменённый остаётся отменённым». Значит любой
`PUT` без `status` по **прошедшему** отменённому уроку переводит его
в `COMPLETED`. Существующий тест
`keeps status CANCELLED when updating non-time fields without status`
проверяет только будущий урок, поэтому баг не пойман. Для фичи это
прямое нарушение: переключатель в попапе доступен у отменённых уроков
(FR-004), спека требует, чтобы признак «не менял статус» (Key Entities)
и не влиял ни на один показатель, кроме налога (FR-013), а переход
`CANCELLED → COMPLETED` меняет «Отменено уроков», «Проведено уроков»
и «Потери от отмен». Тот же баг сейчас бьёт по переключателю ДЗ в попапе
и по сохранению формы отменённого прошлого урока — фикс исправляет и их.
Других потоков, где прошедший отменённый урок без явного статуса должен
стать `COMPLETED`, нет: восстановление шлёт `status: "SCHEDULED"` явно,
перенос отменённого урока запрещён валидатором.

---

## R6. Регулярные серии

**Decision**:

- `createRecurringLessons` (`services/lessonCreation/lessonCreation.ts`):
  каждому слоту `isTaxExempt: data.isTaxExempt ?? false` (FR-006).
- `createSingleLesson`: `isTaxExempt: data.isTaxExempt ?? false`.
- Ночной cron `processRecurringLessons` (`services/recurringLessons.ts`):
  в `lessonsToCreate` добавить `isTaxExempt: lastLesson.isTaxExempt`
  рядом с `price: lastLesson.price` (FR-007). `lastLesson` — последний
  урок паттерна из `groupRecurringLessonsByPattern`, ровно тот, от
  которого наследуется стоимость.
- Распространения признака по серии нет (FR-008):
  `updatePriceForFutureRecurringLessons` и сдвиг серии признак
  не трогают, новой логики распространения не добавляется. Покрывается
  тестом «правка признака и цены одним сохранением у урока серии: цена
  разъехалась по будущим урокам, признак — только у этого урока».

**Rationale**: повторяет существующее правило наследования цены — спека
формулирует FR-007 именно так.

---

## R7. Перенос оплаты при отмене

**Decision**: кода не требует. `applyLessonUpdate` переносит на
следующий неоплаченный урок только `isPaid` и `paymentDate`;
признак остаётся у своих уроков. Налог по перенесённой оплате
считается по признаку урока-получателя (Clarifications спеки).
Закрепляется интеграционным тестом: отмена оплаченного необлагаемого
урока → оплата переехала, у получателя `isTaxExempt` не изменился,
`taxAmount` считает перенесённую сумму по признаку получателя.

---

## R8. Расчёт налога и новая величина `taxExemptIncome`

**Decision**:

- `collectLessonStatistics` (`services/statistics/statistics.ts`):
  в `select` выборки `paidLessonsForTax` добавить `isTaxExempt: true`.
  Запрос тот же (`paidInRangeWhere`), второго запроса нет.
- `PaidLessonForTax` (`statistics.types.ts`) += `isTaxExempt: boolean`;
  `TaxSummary` += `taxExemptIncome: number | null`.
- `computeTaxSummary` (`statistics.helpers.ts`): разделить оплаты на
  облагаемые и необлагаемые **до** `buildTaxBreakdown`. Облагаемые
  уходят в `buildTaxBreakdown` без изменений, необлагаемые
  суммируются в `taxExemptIncome`. При выключенном учёте налога
  возвращать `{ taxAmount: null, taxBreakdown: null, taxExemptIncome: null }`.
- `buildTaxBreakdown` / `resolveRate` / `calcLessonTax`
  (`services/taxRate.ts`) **не меняются**.
- Сумма необлагаемых оплат считается в целых копейках
  (`Math.round(price * 100)`, деление на 100 в конце) — цены хранятся
  как `Decimal(10,2)`, а сложение float даёт `1999.9999…`.

**Rationale**:

- Исключение до `buildTaxBreakdown` гарантирует FR-011 и FR-014 сразу:
  необлагаемая оплата не попадает ни в одну строку ставок, включая
  «вне настроенных периодов», а налог остальных оплат не меняется
  ни на копейку (то же округление по каждой оплате). Пустые строки
  ставок, которые `computeRatesInRange` показывает по фильтру, остаются
  как были, поэтому подпись «Налоги (6%)» при одной ставке сохраняется,
  даже если все оплаты необлагаемые (US2, сценарий 8).
- Необлагаемые оплаты относятся к периоду по той же дате, что и налог
  (`paymentDate ?? startTime`, тот же `paidInRangeWhere`), — FR-014.
- Чистая `taxRate.ts` остаётся про ставки и периоды; знание о признаке
  урока живёт в сервисе статистики. Тесты 027 на `buildTaxBreakdown`
  не трогаются.
- Признак читается по текущему значению при каждом запросе статистики,
  пересчёт прошлых периодов получается сам (FR-012).

**Alternatives considered**:

- Два запроса (`isTaxExempt: false` для налога, `true` для суммы).
  Лишний запрос ради того, что делается одним `select`. Отклонено.
- Добавить `isTaxExempt` в `LessonForTax` и пропускать такие уроки
  внутри `buildTaxBreakdown`. Смешивает правила ставок и признак урока,
  меняет сигнатуру, покрытую тестами 027. Отклонено.
- Отдавать `taxExemptIncome` отдельной строкой внутри `taxBreakdown`
  (`rate: 0, isTaxExempt: true`). Ломает правило подписи карточки:
  `getTaxLabel` считает строки, и при одной ставке подпись стала бы
  «Налоги». Отклонено (FR-015).

---

## R9. Контракт статистики: `taxExemptIncome: number | null`

**Decision**: в ответ `GET /api/statistics` добавляется
`taxExemptIncome: number | null`: `null` ровно тогда, когда `null`
у `taxAmount` (учёт налога выключен); иначе число `>= 0`, `0` если
необлагаемых оплат в периоде нет. Фронтовый тип `Statistics`
(`frontend/src/shared/types/statistics.ts`) — то же поле.

**Rationale**: зеркалит `taxAmount` / `taxBreakdown`, не допускает
утечки налоговой информации при выключенном учёте (FR-017). `0`
без необлагаемых оплат даёт ровно прежнее поведение карточки:
`shouldShowTaxInfoIcon(breakdown, 0)` и тултип не меняются (FR-016).

---

## R10. Остальные показатели не меняются

**Decision**: ни один агрегат `collectLessonStatistics`, кроме налоговой
сводки, не трогается; сервис комиссий (`services/commission`) признак
не читает.

**Rationale**: FR-013, SC-003. Необлагаемый урок — реальный доход.
Закрепляется интеграционным тестом неизменности: при одинаковых данных
`earnings`, `lastMonthEarnings`, `paymentsInRangeSum`, `prepaidIncome`,
`upcomingIncome`, `unpaidDebtSum`, `lostEarnings`,
`commissionWrittenOffSum`, `commissionRemainingTotal` совпадают до
и после пометки уроков (отклонение 0 ₽).

---

## R11. Кабинет ученика

**Decision**: кабинет не меняется. `services/studentCabinet` собирает
уроки явным `select`, а WS-рассылки ученику
(`services/studentLessonBroadcast`) строят payload из явного списка
полей, поэтому новое поле туда не попадает само. Закрепить тестами:
в ответе `GET /api/student-cabinet/lessons` нет ключа `isTaxExempt`
даже у помеченного урока; payload `broadcastStudentLessonUpdated`
после `PUT { isTaxExempt }` не содержит признака.

**Rationale**: FR-022, SC-007 — требование изоляции, его закрепляем
тестом, а не только отсутствием кода (как R11 в 033).

---

## R12. Распространение изменений (вкладки, устройства, WebSocket)

**Decision**: новых WebSocket-событий нет (Clarifications спеки).
В текущей вкладке:

- `lessonModel.updateLessonFx.doneData` уже патчит сторы уроков
  (`entities/lesson/models/stores.model.ts`) и открытый попап
  (`$viewingLesson` в `lessonsViewDialog.model.ts`), а
  `lessonsReload.model.ts` перезагружает активный список (недельный
  вид, расписание, вкладки). Значок в карточке и в календаре
  появляется без перезагрузки.
- Страница статистики перезапрашивает данные при открытии
  (`ReportsPageGate`) и смене периода, так что переход на неё после
  правки признака показывает новый налог.

В других вкладках и на других устройствах изменение видно при следующей
загрузке данных экрана — так же, как сейчас оплата и стоимость.

Задача WebSocket в этой фиче — проверочная: обработчик
`lesson_status_updated` (`app/model/webSocket.model.ts`) патчит урок
только полем `status` и не должен затирать `isTaxExempt`; рассылка
ученику не должна нести признак (R11).

**Rationale**: тьюторский WS-канал сейчас несёт только статусы,
а `WebSocketManager` держит одно соединение на пользователя (новое
вытесняет старое), так что новое событие всё равно не дошло бы до второй
вкладки. Расширять инфраструктуру ради одного поля — против принципа VII;
то же решение принято в 033 (research R10).

---

## R13. Переключатель в попапе (немедленное сохранение)

**Decision**: в `lessonActions.model.ts` новое событие
`lessonTaxExemptChanged({ lessonId, isTaxExempt })` →
`lessonModel.updateLesson({ id, data: { isTaxExempt } })`. Без окна
подтверждения (в отличие от оплаты, где нужна дата). Уведомления —
существующие из `lessonsNotifications.model.ts`: «Урок обновлен»
при успехе, `extractAxiosError(…, "Ошибка при обновлении урока")`
(сообщение сервера на русском) при ошибке. Переключатель
контролируемый, его `checked` = `lesson.isTaxExempt` из `$viewingLesson`,
который меняется только на `doneData`. При ошибке значение в сторе
не менялось, переключатель остаётся в прежнем положении
(FR-002, US1 сценарий 4). Пока `updateLessonFx` в процессе,
переключатель `disabled`, чтобы двойной клик не слал повторный запрос.

**Alternatives considered**: оптимистичное обновление с откатом.
Добавляет состояние и откат в модель ради выигрыша в ~100 мс;
оплата и ДЗ работают так же неоптимистично. Отклонено.

---

## R14. Поле в форме и правка пользователя «переключатель вместо чекбокса»

**Decision**:

- `LessonFormData.isTaxExempt: boolean`; `prepareFormData` берёт
  `lesson.isTaxExempt ?? false`, пустая форма — `false`; начальное
  значение `$formData` в `lessonForm.model.ts` — `false`.
- `prepareSubmitData` **всегда** шлёт `isTaxExempt: formData.isTaxExempt`
  (булево, без `|| undefined`), иначе снятый признак не сохранился бы:
  `undefined` выпадает из JSON, а Prisma читает отсутствие как «без
  изменений» (memory gotcha про `field || undefined`).
- При выключенном учёте налога поле в форме скрыто, но значение
  из `prepareFormData` всё равно уходит на сервер без изменений, так что
  ранее поставленные признаки не теряются (FR-005). Новый урок при
  выключенном учёте создаётся с `false`.
- **Правка пользователя после макетов**: в форме вместо чекбокса
  переключатель (Switch), оформленный как соседние «Оплачено» / «ДЗ»
  (MUI `Switch` в `FormControlLabel`, подпись `fontWeight: 500`).
  Вводится презентационный компонент
  `features/lessons/ui/TaxExemptSwitch/` (`checked`, `onChange`,
  `disabled?`, `hint?`). Его используют и попап (`TaxExemptStatus`
  подключает его к `lessonTaxExemptChanged`), и форма (`LessonFormContent`
  подключает к `setFormData`). Стили переключателя переезжают из
  `TaxExemptStatus.styled.ts` в `TaxExemptSwitch.styled.ts`. Папка
  `LessonForm/components/TaxExemptCheckbox/` удаляется целиком.
- Подсказка «Доход по уроку не войдёт в сумму налога в статистике»
  остаётся в форме (`hint`, связанная через `aria-describedby`),
  отступ выравнивается под ширину переключателя. В попапе подсказки
  нет, как в утверждённом макете.

**Rationale**: в режиме создания урока `LessonStatusSection` пуст
(оплата и ДЗ показываются только у существующего урока), поэтому
переиспользовать `TaxExemptStatus` с колбэком, как это сделано для
`PaymentStatus` / `HomeworkSentStatus`, нельзя: ему нужен `lesson`.
Один презентационный компонент на два места исключает расхождение
внешнего вида попапа и формы.

---

## R15. Видимость при выключенном учёте налога

**Decision**: хук `useIsTaxEnabled` (`entities/user/user.hooks.ts`,
добавлен на этапе макетов) — единственный источник флага для UI урока.
`TaxExemptStatus` возвращает `null`, форма не рендерит
`TaxExemptSwitch`, а `LessonCard` и `LessonCell` передают в
`TaxExemptBadge` `isTaxEnabled && Boolean(lesson.isTaxExempt)`.
`TaxExemptBadge` остаётся «глупым» компонентом в `shared/ui` (флаг
профиля ему не нужен, `shared` не может импортировать `entities`).

**Rationale**: FR-005, US1 сценарий 8, US3 сценарий 6. FSD: `shared`
не знает о пользователе, гейтинг делают вызывающие слои.

---

## R16. Снос макетных заглушек

**Decision**: удалить `isLessonTaxExempt` (`shared/ui/TaxExemptBadge/
TaxExemptBadge.helpers.ts`, файл удаляется целиком), константу
`MOCK_TAX_EXEMPT_NOTES_MARKER`, ре-экспорт `isLessonTaxExempt` из
`shared/ui/TaxExemptBadge/index.ts` и `shared/ui/index.ts`; удалить
`pages/ReportsPage/components/FinancialStatistics/FinancialStatistics.constants.ts`
(единственная константа — `MOCK_TAX_EXEMPT_INCOME`; пустые файлы
запрещены). Снять все 10 маркеров `TODO(auto-feature)` в 8 файлах.
Финальная проверка: `grep -rn "TODO(auto-feature)\|isLessonTaxExempt\|MOCK_TAX_EXEMPT\|благотвор" frontend/src backend/src` пуст.

---

## R17. Контраст первой строки тултипа налога (проверка по просьбе пользователя)

**Decision**: оставить как на `main`, правку не делать; проверку
выполнить задачей и записать результат.

**Анализ**: строки тултипа — `Typography variant="body2"`, в теме
у `body2` цвет `#2D5A3D` (`shared/ui/themeConfig/typography.constants.ts`);
фон MUI Tooltip — `alpha(palette.grey[700], 0.92)`, а `grey[700]`
в теме — зелёный `#43A047`. Контраст ≈ 2.6:1, ниже WCAG AA 4.5:1.
Но на `main` первая строка свёрстана так же (`git show main:…/TaxRateInfoTooltip.tsx`):
макет заменил только обработку открытия на `useTooltipTrigger` и
добавил `ExemptLine` той же `Typography body2`. Значит, хуже не стало.
По договорённости с пользователем («если так было на main — оставить»)
не правим. Условие для задачи: новая строка «Не облагается налогом»
должна иметь тот же цвет, что строки ставок (не вводить третий цвет).
Если при проверке окажется, что вычисленный цвет первой строки на ветке
отличается от `main`, вернуть его к значению `main`.

---

## R18. Код, добавленный на этапе макетов, требует тестов

**Decision**: покрыть тестами всё новое из макетов, а не только
подключение данных:

- `shared/lib/tooltipTrigger.hooks.ts` (`useTooltipTrigger`): открытие
  по наведению мыши, игнор touch-`pointerenter/leave`, клик открывает
  и не всплывает, `close`.
- `shared/ui/TaxExemptBadge`: `isTaxExempt=false` → ничего; `full`
  и `icon` варианты; `aria-label`; тултип по наведению, фокусу, тапу;
  клик не всплывает к карточке (FR-019).
- `entities/user/user.hooks.ts` (`useIsTaxEnabled`).
- `TaxRateInfoTooltip`: строка «Не облагается налогом: X ₽» при
  `taxExemptIncome > 0`, отсутствие при `0`.
- `FinancialStatistics.helpers` (`shouldShowTaxInfoIcon` с третьим
  аргументом) и `FinancialStatistics` (иконка при одной ставке
  и необлагаемых оплатах; без них — как раньше).

Правки вёрстки из макетов (`minWidth: 0` в `CommissionBadge.styled.ts`
и в `LessonCell`) тестами не покрываются (styled-файлы не тестируем),
проверяются визуально на 375px.

---

## R19. E2E

**Decision**: два новых функциональных сценария `@regression`:

- `frontend/e2e/lessons/tax-exempt-lesson.spec.ts` (`@lessons`):
  включённый учёт налога → попап урока → включить «Не облагается
  налогом» → тост → значок в карточке списка → подсказка; выключить →
  значок пропал; создание урока с включённым переключателем в форме.
- `frontend/e2e/reports/tax-exempt-statistics.spec.ts` (`@reports`):
  ставка 6%, оплаты 1000 ₽ и 2000 ₽ (вторая необлагаемая) → «Налоги
  (6%)» = 60 ₽, «Поступления за период» = 3000 ₽, тултип со строкой
  «Не облагается налогом: 2 000 ₽».

Для сидирования: `POST /api/__test__/lessons` (`backend/src/routes/testSupport.ts`)
принимает `isTaxExempt`, `LessonSeed` в `frontend/e2e/helpers/db.ts` —
необязательное `isTaxExempt?: boolean`. Существующие
`reports/tax-breakdown.spec.ts` и `profile/tax-toggle.spec.ts`
не меняются (FR-016: без необлагаемых уроков поведение прежнее)
и должны остаться зелёными.

**Rationale**: фича добавляет новый пользовательский путь
(`docs/conventions/e2e-testing.md`, «Что считать готовым»).
