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

export class CallAuthorizationError extends Error {
  constructor(message = "Звонок этому собеседнику недоступен") {
    super(message);
    this.name = "CallAuthorizationError";
  }
}

export class CallPeerOfflineError extends Error {
  constructor(message = "Собеседник сейчас не в сети") {
    super(message);
    this.name = "CallPeerOfflineError";
  }
}

export class CallPeerBusyError extends Error {
  constructor(message = "Абонент занят") {
    super(message);
    this.name = "CallPeerBusyError";
  }
}
