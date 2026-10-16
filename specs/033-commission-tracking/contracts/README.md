# API Contracts: 033-commission-tracking

Новых эндпоинтов фича **не добавляет**. Меняются формы ответов (и один
запрос) у трёх уже существующих. Контракт зафиксирован типами, которые
были объявлены на этапе макетов в `frontend/src/shared/types/` и по
которым уже собран утверждённый UI — бэкенд реализуется под них
(research R8).

Все перечисленные роуты — тьютор-онли, за `authenticateToken`.
Эндпоинты кабинета ученика (`/api/student-cabinet/*`, `authenticateStudent`)
**не меняются ни в одном поле** — см. FR-015 / research R11.

---

## 1. Ученики — `/api/students`

### Запрос: `POST /api/students`, `PUT /api/students/:id`

Тело расширяется одним необязательным полем:

```ts
commissionAmount?: number | null;   // рубли, >= 0; null/undefined/"" → 0
```

Валидация (`backend/src/controllers/students/validators.ts`):

| Вход | Результат |
| --- | --- |
| отсутствует / `null` / `undefined` | сохраняется `0` |
| число `>= 0` | сохраняется как есть |
| число `< 0` | `400 { error: "Комиссия не может быть отрицательной" }` |
| не число / `NaN` | `400 { error: "Комиссия должна быть числом" }` |

Проверка пишется явными условиями (`typeof`, `Number.isNaN`, `< 0`),
а не truthiness — `0` здесь легальное значение (research R13).

### Ответ: `GET /api/students`, `GET /api/students/:id`, `POST`, `PUT`

К объекту ученика добавляются три поля:

```ts
commissionAmount: number;       // хранимое; 0 по умолчанию
commissionRepaid?: number;      // производное, только FACT-зачёты
commissionRemaining?: number;   // производное, commissionAmount - commissionRepaid, >= 0
```

- `commissionAmount` сериализуется автоматически (глобальный патч
  `Decimal.prototype.toJSON` в `backend/src/lib/prisma.ts`).
- `commissionRepaid` / `commissionRemaining` навешиваются явно из
  `services/commission`; они отдаются во всех ответах об ученике —
  включая `POST`/`PUT` и архивацию/разархивацию, — потому что фронт
  патчит ими стор ученика и иначе потерял бы прогресс сразу после
  сохранения. Поля опциональны: если в выдаче нет ни одного ученика
  с ненулевой комиссией, они не добавляются вовсе (FR-003) — тьютор
  без комиссий не платит за фичу ни одним лишним полем.
- Если `commissionAmount === 0`, производные равны `0` и UI ничего
  не показывает (FR-018, FR-022).

`GET /api/students` по умолчанию отдаёт только неархивированных
(`archived === "true"` — точное совпадение), это поведение не меняется.

---

## 2. Уроки — `GET /api/lessons`

Параметры запроса, пагинация и форма конверта
(`{ lessons, pagination?, paymentsSummary? }`) **не меняются**.

Каждый элемент `lessons[]` получает одно новое поле:

```ts
commissionCredit?: {
  amount: number;                 // рубли, всегда > 0
  state: "FACT" | "FORECAST";
} | null;
```

Правила:

- поле **отсутствует или `null`**, если уроку ничего не зачтено — ни
  фактически, ни в прогнозе (FR-008). Пустого объекта с `amount: 0`
  быть не должно: UI по нему рисует пустой блок;
- у одного урока **не более одной** пометки — множества FACT и FORECAST
  не пересекаются по построению (FR-007);
- `FACT` — урок `price > 0`, `status === "COMPLETED"`, `isPaid === true`;
- `FORECAST` — урок `price > 0` и либо активен
  (`SCHEDULED` / `RESCHEDULED` / `IN_PROGRESS`), либо
  `COMPLETED && !isPaid` (FR-019);
- у урока без `studentId` (пробный с контактом-кандидатом) поля нет
  никогда (FR-016);
- расчёт ведётся по **всем** урокам ученика, а не по странице выдачи,
  поэтому пометки на странице стабильны независимо от пагинации
  и фильтров.

Поле навешивается маппером в
`backend/src/services/lessonsQuery/lessonsQuery.ts` — сегодня
`fetchLessonsPage` отдаёт сырые строки Prisma, и этот маппер появляется
впервые. Если у репетитора нет учеников с ненулевой комиссией, маппер
не выполняется и поле не добавляется ни одному уроку.

**Побочный эффект, принятый сознательно**: запрос уроков использует
`include: { student: true }`, поэтому вложенный объект `student` начнёт
содержать и `commissionAmount`. Роут тьютор-онли, фронтовый тип
`Lesson.student` — `Pick<…>` без полей комиссии, лишнее поле
игнорируется (research R6).

---

## 3. Статистика — `GET /api/statistics`

Параметры (`startDate`, `endDate`, заголовок `x-timezone`) не меняются.
Все существующие поля ответа сохраняют **и смысл, и числовое значение**
(FR-011, SC-004) — в частности `earnings`, `taxAmount`, `taxBreakdown`,
`prepaidIncome`, `paymentsInRangeSum`.

Добавляются три поля:

```ts
hasCommissionStudents: boolean;      // есть ли хоть один ученик (вкл. архивных) с commissionAmount > 0
commissionWrittenOffSum: number;     // за период, по дате оплаты
commissionRemainingTotal: number;    // снимок на сейчас, от фильтра дат НЕ зависит
```

- `hasCommissionStudents === false` → фронт не рендерит ни один
  показатель про комиссии (FR-017); значения двух других полей в этом
  случае `0`.
- `commissionWrittenOffSum` относит зачёт к периоду по
  `paymentDate ?? startTime` — той же базе дат, что у
  `paymentsInRangeSum` и у налога (`paidInRangeWhere` /
  `computeTaxSummary` в `backend/src/services/statistics/statistics.helpers.ts`).
  Это сознательно отличается от `earnings`, который считается по дате
  урока (FR-010, Assumptions спеки).
- `commissionRemainingTotal` суммирует остаток только по
  **неархивированным** ученикам (FR-025) и не реагирует на смену
  периода (FR-024, US4 сценарий 6).
- Тип ответа расширяется в
  `backend/src/services/statistics/statistics.types.ts` (`LessonStatistics`)
  и зеркалится фронтовым `Statistics`
  (`frontend/src/shared/types/statistics.ts`, уже объявлен).

Группировка на странице статистики (FR-027: «Предоплата» переезжает
в период-независимую группу) — **чисто фронтовая перестановка**.
Агрегат `prepaidIncome` на бэкенде не меняется ни формулой, ни именем,
ни значением.

---

## 4. Что контракт НЕ содержит

- Нет эндпоинта «отметить комиссию выплаченной» — журнал выплат
  не ведётся (Assumptions спеки).
- Нет полей комиссии в `CreateLessonDto` / `UpdateLessonDto`: зачёт
  производный и клиентом не задаётся.
- Нет новых WebSocket-событий. Существующий тьюторский канал шлёт
  только `lesson_status_updated`; актуальность пометок после мутаций
  обеспечивается перезагрузкой списков на фронте (research R10).
