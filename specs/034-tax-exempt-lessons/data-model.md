# Data Model: Уроки без налога (034-tax-exempt-lessons)

**Phase**: 1 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## 1. Хранимые данные

### Lesson (`lessons`): новая колонка

| Поле | Тип Prisma | SQL | По умолчанию | Null |
| --- | --- | --- | --- | --- |
| `isTaxExempt` | `Boolean @default(false)` | `BOOLEAN` | `false` | нет |

```prisma
model Lesson {
  // …
  isPaid                  Boolean      @default(false)
  paymentDate             DateTime?
  isTaxExempt             Boolean      @default(false) // Не облагается налогом
  // …
}
```

Миграция `backend/prisma/migrations/<ts>_add_lesson_tax_exempt/migration.sql`:

```sql
ALTER TABLE "lessons" ADD COLUMN "isTaxExempt" BOOLEAN NOT NULL DEFAULT false;
```

Существующие строки получают `false` этим же DDL (FR-001, SC-001).
Индексов не добавляется (research R1). Других таблиц фича не меняет.

### Правила

- **V-1**: значение только `true` / `false`. В API поле необязательное;
  если передано, `typeof === "boolean"`, иначе `400`
  «Некорректное значение признака «Не облагается налогом»» (FR-009).
- **V-2**: менять признак может только владелец урока: поиск урока по
  `{ id, tutorId }`, чужой урок → `404 «Урок не найден»`.
- **V-3**: признак допустим при любом статусе, цене, оплате, при
  ученике и при контакте-кандидате (FR-004).
- **V-4**: изменение признака не меняет `status`, `price`, `isPaid`,
  `paymentDate` урока (Key Entities; research R5: отменённый урок
  остаётся `CANCELLED`).

## 2. Жизненный цикл признака

| Событие | Признак |
| --- | --- |
| Создание одиночного урока | из формы, по умолчанию `false` |
| Создание регулярного занятия | значение из формы у **каждого** созданного урока (FR-006) |
| Автопродление серии (cron 2:00) | копия `isTaxExempt` последнего урока паттерна, как `price` (FR-007) |
| Переключатель в попапе | только этот урок, сохраняется сразу (FR-002, FR-008) |
| Сохранение формы редактирования | только этот урок, вместе с остальными полями (FR-003, FR-008) |
| Правка цены урока серии с распространением | цена уходит в будущие уроки, признак нет (FR-008) |
| Сдвиг времени серии | признак не трогается |
| Перенос, отмена, восстановление урока | признак сохраняется |
| Отмена оплаченного урока с переносом оплаты | признак у обоих уроков не меняется; перенесённая оплата облагается по признаку получателя (Clarifications) |
| Привязка ученика к пробному уроку | признак сохраняется |
| Архивация ученика | признак у уроков сохраняется |
| Выключение / включение учёта налога | признак хранится без изменений, UI его скрывает или показывает (FR-005) |
| Удаление урока | исчезает вместе с уроком |

История изменений признака не ведётся (Assumptions).

## 3. Производные величины статистики

### Выборка

Та же, что сейчас для налога (`paidInRangeWhere`):
`tutorId = me AND isPaid AND price > 0 AND (paymentDate ∈ range OR (paymentDate IS NULL AND startTime ∈ range))`,
только при `user.taxEnabled`. В `select` добавляется `isTaxExempt`.

### Алгоритм `computeTaxSummary(user, paidLessons, range)`

1. Учёт налога выключен или выборки нет → `{ taxAmount: null, taxBreakdown: null, taxExemptIncome: null }`.
2. `exempt = paidLessons.filter(l => l.isTaxExempt)`,
   `taxable = paidLessons.filter(l => !l.isTaxExempt)`.
3. `taxExemptIncome = Σ round(price × 100) / 100` по `exempt` (целые копейки).
4. `{ taxAmount, taxBreakdown } = buildTaxBreakdown(taxable → { price, paymentDate: paymentDate ?? startTime }, periods, range)`.
   Функция не меняется: ставка по дате, зона 0% до первого периода,
   округление налога по каждой оплате, пустые строки ставок по фильтру.
5. Результат: `{ taxAmount, taxBreakdown, taxExemptIncome }`.

### Инварианты

- **INV-1**: `taxAmount = Σ round(price × rate(date) / 100)` по облагаемым
  оплатам периода (SC-002).
- **INV-2**: необлагаемая оплата не входит ни в одну строку
  `taxBreakdown`, включая `isOutsidePeriods` (FR-014).
- **INV-3**: `Σ taxBreakdown[].earnings + taxExemptIncome = paymentsInRangeSum`
  при включённом учёте налога, с точностью до копейки (обе суммы
  по одной выборке).
- **INV-4**: снятие признака у всех уроков даёт ровно те `taxAmount`
  и `taxBreakdown`, что были до фичи (SC-001).
- **INV-5**: `earnings`, `lastMonthEarnings`, `paymentsInRangeSum`,
  `paymentsInRangeCount`, `prepaidIncome`, `upcomingIncome`,
  `unpaidDebt*`, `lostEarnings`, `trialLessonsCount`, `commission*`
  не зависят от признака (FR-013, SC-003).
- **INV-6**: `taxExemptIncome === null ⇔ taxAmount === null`.

### Примеры (ставка 6%)

| Оплаты периода | `taxAmount` | `taxBreakdown` | `taxExemptIncome` |
| --- | --- | --- | --- |
| 1000 ₽, 2000 ₽ | 180 | `[{6, 3000, 180}]` | 0 |
| 1000 ₽, 2000 ₽ (необлагаемая) | 60 | `[{6, 1000, 60}]` | 2000 |
| 2000 ₽ (необлагаемая) | 0 | `[{6, 0, 0}]` | 2000 |
| 1000 ₽ до первого периода, 2000 ₽ (необлагаемая) до первого периода; фильтр захватывает зону 0% и период 6% | 0 | `[{0, 1000, 0, out}, {6, 0, 0}]` | 2000 |
| учёт налога выключен | `null` | `null` | `null` |

## 4. Типы

### Backend

- `backend/src/types/lesson.ts`: `CreateLessonDto` += `isTaxExempt?: boolean`
  (`UpdateLessonDto` наследует через `Partial<CreateLessonDto>`).
- `backend/src/services/statistics/statistics.types.ts`:
  `PaidLessonForTax` += `isTaxExempt: boolean`;
  `TaxSummary` += `taxExemptIncome: number | null`
  (`LessonStatistics` получает его через `TaxSummary`).

### Frontend

- `frontend/src/shared/types/lesson.ts`: `Lesson` += `isTaxExempt?: boolean`;
  `CreateLessonDto` += `isTaxExempt?: boolean` (`UpdateLessonDto` наследует).
- `frontend/src/shared/types/statistics.ts`: `Statistics` +=
  `taxExemptIncome: number | null`.
- `frontend/src/features/lessons/ui/LessonForm/LessonForm.types.ts`:
  `LessonFormData` += `isTaxExempt: boolean`.

### Не меняются

- `TaxBreakdownEntry` (бэк и фронт), `services/taxRate.ts`.
- Типы и DTO кабинета ученика, `LessonForBroadcast` (FR-022).
