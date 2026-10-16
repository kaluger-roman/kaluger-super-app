# Data Model: Мессенджер MAX и пробные уроки без ученика

**Date**: 2026-08-08 | **Plan**: [plan.md](./plan.md)

## Изменения Prisma-схемы

### Enum `ContactMethod` (расширение)

```prisma
enum ContactMethod {
  WHATSAPP
  TELEGRAM
  MAX        // новое значение
}
```

- Используется: `Student.contactMethod` (default WHATSAPP),
  `Student.parentContactMethod?`, новое поле `Lesson.prospectContactMethod?`.
- Существующие данные не меняются; default остаётся `WHATSAPP`.

### Модель `Lesson` (изменённые/новые поля)

```prisma
model Lesson {
  // ... существующие поля без изменений ...

  studentId String?                            // было: String (NOT NULL)
  student   Student? @relation(fields: [studentId], references: [id], onDelete: Cascade)

  prospectName          String?                // имя потенциального ученика
  prospectPhone         String?                // телефон (опционально)
  prospectContactMethod ContactMethod?         // мессенджер (опционально)
}
```

### Миграция

Одна миграция `<timestamp>_max_and_prospect_lessons`:

```sql
ALTER TYPE "ContactMethod" ADD VALUE 'MAX';
ALTER TABLE "lessons" ALTER COLUMN "studentId" DROP NOT NULL;
ALTER TABLE "lessons"
  ADD COLUMN "prospectName" TEXT,
  ADD COLUMN "prospectPhone" TEXT,
  ADD COLUMN "prospectContactMethod" "ContactMethod";
```

Обратная совместимость: все существующие уроки имеют `studentId`,
prospect-поля у них `NULL`. Откат тривиален только до появления уроков
с `studentId IS NULL`.

## Инварианты (уровень валидации, backend)

| # | Инвариант | Где проверяется |
|---|-----------|-----------------|
| I1 | Ровно один из `studentId` / `prospectName` задан при создании | `controllers/lessons/validators.ts` |
| I2 | `prospectName` непустой (после trim), если урок без ученика | validators |
| I3 | `prospectPhone`, `prospectContactMethod` допустимы только при уроке без ученика | validators |
| I4 | `isRecurring = true` требует `studentId` | validators |
| I5 | Привязка (`studentId` устанавливается на prospect-урок) очищает все prospect-поля атомарно | `updateLesson.ts` |
| I6 | Студент при привязке принадлежит текущему репетитору | `updateLesson.ts` (существующая проверка владения) |
| I7 | `contactMethod` / `parentContactMethod` / `prospectContactMethod` ∈ {WHATSAPP, TELEGRAM, MAX} | validators (students + lessons) |

## Производные правила (не хранятся)

- **«Пробный» для статистики** = `price = 0 OR price IS NULL` — без
  изменений (`trialLessonsCount`).
- **Имя урока для отображения** = `student?.name ?? prospectName`.
- **Пометка «пробный (без ученика)»** в UI = `studentId IS NULL`.
- **Кабинет ученика**: выборки фильтруются по `studentId` конкретного
  ученика → уроки с `studentId IS NULL` туда не попадают; prospect-поля
  не входят в `select` кабинета.
- **Статистика по студентам**: `groupBy studentId` с фильтром
  `studentId NOT NULL`.

## Переходы состояний

Жизненный цикл статусов урока не меняется
(SCHEDULED → IN_PROGRESS → COMPLETED; CANCELLED; RESCHEDULED).

Новый переход данных (не статусов):

```
Урок без ученика (studentId=NULL, prospect*-поля заполнены)
        │  PUT /lessons/:id { studentId }
        ▼
Обычный урок (studentId задан, prospect*-поля = NULL)   [необратимо]
```

## Изменения TypeScript-типов

### Backend (`backend/src/types`)

- `student.ts`: `ContactMethod = "WHATSAPP" | "TELEGRAM" | "MAX"`
  (все места с литеральными union'ами).
- `lesson.ts`:
  - `CreateLessonDto`: `studentId?: string`, `prospectName?: string`,
    `prospectPhone?: string`, `prospectContactMethod?: ContactMethod`
  - `UpdateLessonDto`: те же поля опционально (привязка/правка prospect)

### Frontend (`frontend/src/shared/types`)

- `student.ts`: расширение union до `"WHATSAPP" | "TELEGRAM" | "MAX"`
  (вынести в именованный `ContactMethod`, если ещё не вынесен).
- `lesson.ts`: `studentId: string | null`; `prospectName?: string | null`;
  `prospectPhone?: string | null`; `prospectContactMethod?: ContactMethod | null`.
- `shared/constants`: `CONTACT_METHOD_LABELS: Record<ContactMethod, string>`.
- `LessonFormData` (`features/lessons/ui/LessonForm/types.ts`):
  `withoutStudent: boolean`, `prospectName: string`, `prospectPhone: string`,
  `prospectContactMethod: ContactMethod | ""`.
