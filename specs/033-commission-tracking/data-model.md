# Data Model: Учёт комиссий по ученикам (033-commission-tracking)

**Phase**: 1 | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## 1. Хранимое изменение — единственное

### `Student` (`students`)

| Поле | Тип | Ограничения | Назначение |
| --- | --- | --- | --- |
| `commissionAmount` | `Decimal @db.Decimal(10, 2)` | `NOT NULL`, `DEFAULT 0`, значение `>= 0` (валидация на уровне API) | Разовая сумма, которую репетитор отдаёт посреднику за этого ученика (FR-001) |

Prisma:

```prisma
commissionAmount    Decimal        @default(0) @db.Decimal(10, 2)
```

Миграция (бэкфилл встроен в DDL — PostgreSQL проставит `0` всем
существующим строкам, отдельный `UPDATE` не нужен, FR-003 / SC-002):

```sql
-- AlterTable
ALTER TABLE "public"."students" ADD COLUMN     "commissionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
```

Индексы не добавляются: выборка всегда идёт по уже существующим
`@@index([tutorId, archived])` и `@@index([tutorId, startTime])`.

### `Lesson` (`lessons`)

**Изменений нет.** Ни одного нового столбца (Key Entities спеки:
«Урок: новых хранимых атрибутов не получает»).

---

## 2. Производные величины (не хранятся, research R2)

### По уроку

```ts
type CommissionCreditState = "FACT" | "FORECAST";

type CommissionCredit = {
  amount: number;   // рубли, до копеек; всегда > 0
  state: CommissionCreditState;
};
```

Урок получает **не более одной** пометки (FR-007). Отсутствие пометки
выражается `null` / отсутствием поля — не объектом с `amount: 0` (FR-008:
у таких уроков не должно быть ни суммы, ни значка, ни пустого блока).

### По ученику

| Величина | Формула | Инвариант |
| --- | --- | --- |
| `commissionRepaid` | сумма всех `FACT`-зачётов по урокам ученика | `0 <= repaid <= commissionAmount` |
| `commissionRemaining` | `commissionAmount - commissionRepaid` | `>= 0`; `repaid + remaining === commissionAmount` **точно** (SC-010) |

### По статистике

| Показатель | Формула | Зависит от фильтра дат |
| --- | --- | --- |
| `hasCommissionStudents` | существует хотя бы один ученик репетитора (включая архивных) с `commissionAmount > 0` | нет |
| `commissionWrittenOffSum` | сумма `FACT`-зачётов, у которых `paymentDate ?? startTime` попадает в период | **да** (FR-010, FR-012) |
| `commissionRemainingTotal` | сумма `commissionRemaining` по **неархивированным** ученикам с `commissionAmount > 0` | **нет** — снимок (FR-024, FR-025) |

Разная база учеников у `hasCommissionStudents` (все) и
`commissionRemainingTotal` (только активные) — намеренная: архивный
ученик с погашенной в прошлом комиссией должен по-прежнему давать
цифру списаний в прошлых периодах, но его непогашенный остаток никогда
не закроется и не должен завышать «осталось погасить».

---

## 3. Алгоритм распределения

Чистая функция `allocateCommission` (`backend/src/utils/commission.ts`),
без Prisma и побочных эффектов.

### Вход

```ts
type CommissionLessonInput = {
  id: string;
  startTime: Date;
  price: number | null;      // рубли; null === бесплатный
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" | "IN_PROGRESS";
  isPaid: boolean;
};

type AllocateCommissionInput = {
  commissionAmount: number;          // рубли, >= 0
  lessons: CommissionLessonInput[];  // ВСЕ уроки одного ученика, не страница
};
```

### Выход

```ts
type CommissionAllocation = {
  repaid: number;                              // рубли
  remaining: number;                           // рубли
  creditByLessonId: Map<string, CommissionCredit>;  // только уроки с amount > 0
};
```

### Шаги

1. **Ранний выход.** `commissionAmount <= 0` → `{ repaid: 0,
   remaining: 0, creditByLessonId: пустая }`. Для ученика с комиссией 0
   не появляется ни одной пометки (FR-008) и его уроки не отличаются
   от доурочных (FR-003).
2. **Копейки.** Все суммы переводятся в целые копейки
   (`Math.round(rub * 100)`) — research R3. Возврат обратно в рубли
   делением на 100 в самом конце.
3. **Сортировка.** Факт — по `paymentDate ?? startTime` возрастающе,
   прогноз — по `startTime` возрастающе; при равенстве — по `id`
   лексикографически. Детерминированный порядок при совпадающих дате
   и времени (edge case спеки).
4. **Проход 1 — факт.** `remaining = commissionAmountKop`.
   Для каждого урока по порядку, если
   `price > 0 && status === "COMPLETED" && isPaid` (FR-006 — ровно набор
   уроков «Заработка»):
   `credit = min(remaining, priceKop)`; при `credit > 0` записать
   `{ amount: credit, state: "FACT" }`; `remaining -= credit`.
   `repaid = commissionAmountKop - remaining`.
5. **Проход 2 — прогноз.** Стартует от `remaining`, оставшегося после
   шага 4 (Assumptions спеки: прогноз считается вторым проходом, иначе
   ранний неоплаченный урок «съел» бы часть остатка и сдвинул факт —
   SC-009). Для каждого урока по тому же порядку, если
   `price > 0` и (`status ∈ {SCHEDULED, RESCHEDULED, IN_PROGRESS}`
   **или** `status === "COMPLETED" && !isPaid`) — FR-019:
   `forecast = min(forecastRemaining, priceKop)`; при `forecast > 0`
   записать `{ amount: forecast, state: "FORECAST" }`;
   `forecastRemaining -= forecast`.
6. **Возврат.** `remaining` в выходе — это остаток **после шага 4**
   (фактический), не после шага 5: «погашено» и «осталось» считаются
   только по факту (FR-023, US4 сценарий 4).

### Почему это покрывает edge cases спеки

| Edge case | Почему покрыт |
| --- | --- |
| Комиссия изменена задним числом (вверх/вниз, ниже уже зачтённой) | Пересчёт всегда полный, от нуля, по всем урокам — состояния не накапливаются |
| Комиссия сброшена в 0 | Ранний выход (шаг 1) → ни одной пометки, показатель за прошлые периоды становится 0 |
| Стоимость урока изменена задним числом | Цена читается в момент расчёта; суммарный зачёт ограничен `min` на каждом шаге и не превысит комиссию (FR-014) |
| Урок удалён / отменён | Удалённого нет во входе; `CANCELLED` исключён из обоих проходов → его доля достаётся следующим по времени |
| Бесплатный урок (`price` 0 или `null`) | Условие `price > 0` в обоих проходах |
| Два урока с одинаковым `startTime` | Tie-break по `id` (шаг 3) |
| Урок без ученика (пробный) | В аллокатор попадают только уроки со `studentId` ученика (FR-016) |
| Остаток в точности равен цене урока | `min(remaining, price) === price`, `remaining` становится 0 → у следующих уроков пометок нет |
| Комиссия больше суммы всех уроков | Остаток просто не исчерпывается; `remaining > 0`, непокрытая часть нигде не помечена |
| Комиссия с копейками, остаток < рубля | Целые копейки на всём пути + `formatCurrency` с копейками на выводе (research R9) |
| Урок завершён, но не оплачен | Не проходит условие шага 4 → получает `FORECAST`, в «погашено» и в показатель периода не входит |
| Более ранний урок оплачен позже более позднего | Порядок распределения факта и период списания используют одну базу дат (дату оплаты), поэтому цифра за закрытый период не меняется — новый платёж получает следующий по очереди зачёт |
| Оплата снята | Урок выпадает из шага 4 и попадает в шаг 5 → пометка снова становится прогнозной |
| Ученик архивирован | Аллокатор к архивности безразличен; фильтр по архивности применяется только в `commissionRemainingTotal` |

---

## 4. Поток данных

```text
                     allocateCommission (чистая, utils/commission.ts)
                                    ▲
                                    │ (commissionAmount, все уроки ученика)
          services/commission  ─────┘
            │  один findMany по studentId IN (…) + группировка
            │
   ┌────────┼─────────────────────────────┬──────────────────────────────┐
   ▼        ▼                             ▼                              ▼
lessonsQuery.fetchLessonsPage   controllers/students/*        services/statistics
   │ навешивает                    │ навешивает                  │ commissionWrittenOffSum (период, дата оплаты)
   │ lesson.commissionCredit       │ commissionRepaid/Remaining  │ commissionRemainingTotal (снимок)
   ▼                               ▼                             │ hasCommissionStudents
GET /api/lessons            GET/POST/PUT /api/students           ▼
                                                            GET /api/statistics
```

**Guard на входе сервиса**: если у репетитора нет ученика с
`commissionAmount > 0`, сервис возвращает пустой результат **без единого
запроса к урокам**, и потребители не добавляют в ответ ни одного поля
комиссии (FR-003, research R7).

**Кабинет ученика** в эту схему не входит вовсе: его DTO
(`backend/src/types/studentCabinet.ts` → `StudentLessonResponse`)
собирается отдельным явным `select` без денег, и сервис комиссий туда
не подключается (FR-015, research R11).

---

## 5. Инварианты, которые обязаны проверяться тестами

| ID | Инвариант | Где проверяется |
| --- | --- | --- |
| INV-1 | `repaid + remaining === commissionAmount` ровно, в копейках | unit `allocateCommission` |
| INV-2 | сумма всех `FACT`-зачётов `=== min(commissionAmount, сумма цен гасящих уроков)` | unit `allocateCommission` |
| INV-3 | сумма `FACT` + сумма `FORECAST` по ученику `<= commissionAmount` | unit `allocateCommission` |
| INV-4 | ни один `FORECAST` не влияет на `repaid`, `remaining`, `commissionWrittenOffSum` | unit + integration |
| INV-5 | `earnings`, `taxAmount`, `taxBreakdown` совпадают с эталоном без комиссий | integration `getStatistics` |
| INV-6 | у ученика с `commissionAmount = 0` в ответах нет ни одной пометки | unit + integration |
| INV-7 | ответы кабинета ученика не содержат ни одного поля `commission*` | integration `studentCabinet` |
| INV-8 | порядок распределения одинаков при повторном вызове с тем же входом | unit (равные `startTime`) |
