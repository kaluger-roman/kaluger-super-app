import type { AdminAlert, AdminAlertEmail } from "@shared";

import { EMAIL_SUBJECTS, MAX_EMAIL_ATTEMPTS } from "./AlertEmailStatus.constants";
import type { EmailKind, EmailStatusLine } from "./AlertEmailStatus.types";

const formatAttempts = (attempts: number): string =>
  attempts >= MAX_EMAIL_ATTEMPTS
    ? `Попыток: ${MAX_EMAIL_ATTEMPTS} из ${MAX_EMAIL_ATTEMPTS}, отправка остановлена`
    : `Попытка ${attempts} из ${MAX_EMAIL_ATTEMPTS}, повторим при следующей проверке`;

// A `pending` letter with every attempt used means the outcome of the last one is unknown.
const isStalled = ({ status, attempts }: AdminAlertEmail): boolean =>
  status === "pending" && attempts >= MAX_EMAIL_ATTEMPTS;

const formatEmailStatus = (email: AdminAlertEmail, kind: EmailKind): string => {
  const { nominative, genitive } = EMAIL_SUBJECTS[kind];
  if (isStalled(email)) {
    return `Ошибка отправки ${genitive}: результат последней попытки неизвестен. ${formatAttempts(email.attempts)}`;
  }
  switch (email.status) {
    case "sent":
      return `${nominative} отправлено`;
    case "pending":
      return `${nominative} ожидает отправки`;
    case "failed":
      return `Ошибка отправки ${genitive}: ${email.lastError ?? "неизвестная ошибка"}. ${formatAttempts(email.attempts)}`;
    case "skipped_no_email":
      return `${nominative} не отправлено: адрес не указан`;
    case "skipped_disabled":
      return `${nominative} не отправлено: рассылка выключена`;
  }
};

const toLine = (email: AdminAlertEmail, kind: EmailKind): EmailStatusLine => ({
  kind,
  text: formatEmailStatus(email, kind),
  isError: email.status === "failed" || isStalled(email),
});

export const getEmailStatusLines = ({ openEmail, resolveEmail }: AdminAlert): EmailStatusLine[] =>
  resolveEmail
    ? [toLine(openEmail, "open"), toLine(resolveEmail, "resolve")]
    : [toLine(openEmail, "open")];
