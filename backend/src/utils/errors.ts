// Кастомные классы ошибок для контроля flow через `instanceof` (например,
// маппинг бизнес-исключения в HTTP-статус). Все классы такого рода живут
// здесь и реэкспортируются через `utils/index.ts`. Не объявлять локально
// в контроллерах/сервисах — это размывает поверхность ошибок и приводит
// к дублирующимся типам.

export class SchedulingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchedulingConflictError";
  }
}

export class RecurringShiftConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecurringShiftConflictError";
  }
}

export class StudentInvitationConsumedError extends Error {
  constructor() {
    super("Student invitation already consumed");
    this.name = "StudentInvitationConsumedError";
  }
}

export class UserAlreadyExistsError extends Error {
  constructor() {
    super("Пользователь уже существует");
    this.name = "UserAlreadyExistsError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Неверные учетные данные");
    this.name = "InvalidCredentialsError";
  }
}

export class EmailNotVerifiedError extends Error {
  constructor() {
    super("Email не подтвержден. Проверьте почту или запросите новый код подтверждения");
    this.name = "EmailNotVerifiedError";
  }
}

export class TaxPeriodsRequiredError extends Error {
  constructor() {
    super("Чтобы включить учёт налога, добавьте хотя бы один период");
    this.name = "TaxPeriodsRequiredError";
  }
}
