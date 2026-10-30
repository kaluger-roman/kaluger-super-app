import type { EmailKind, EmailSubject } from "./AlertEmailStatus.types";

export const MAX_EMAIL_ATTEMPTS = 5;

export const EMAIL_SUBJECTS: Record<EmailKind, EmailSubject> = {
  open: { nominative: "Письмо о проблеме", genitive: "письма о проблеме" },
  resolve: { nominative: "Письмо о решении", genitive: "письма о решении" },
};
