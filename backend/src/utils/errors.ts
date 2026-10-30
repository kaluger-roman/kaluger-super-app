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

export class CallRateLimitError extends Error {
  constructor(message = "Слишком много звонков. Попробуйте через минуту") {
    super(message);
    this.name = "CallRateLimitError";
  }
}

export class AdminAlertNotFoundError extends Error {
  constructor(message = "Алерт не найден") {
    super(message);
    this.name = "AdminAlertNotFoundError";
  }
}

export class AlertEmailNotConfiguredError extends Error {
  constructor(message = "Сначала сохраните адрес для уведомлений") {
    super(message);
    this.name = "AlertEmailNotConfiguredError";
  }
}

export class TestEmailRateLimitError extends Error {
  constructor(message = "Тестовое письмо можно отправлять не чаще раза в минуту") {
    super(message);
    this.name = "TestEmailRateLimitError";
  }
}

// The message is Resend's own error text; the admin test letter shows it as is.
export class EmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailSendError";
  }
}
