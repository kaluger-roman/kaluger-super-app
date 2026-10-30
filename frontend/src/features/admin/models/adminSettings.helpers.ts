import { validateEmail } from "@shared";
import type { AdminSettings } from "@shared";

import { ALERT_EMAIL_MAX_LENGTH, INVALID_EMAIL_ERROR } from "./adminSettings.constants";
import type { AdminSettingsInput } from "./adminSettings.types";

export const getAlertEmailError = (input: string): string | null => {
  const email = input.trim();
  if (!email) return null;
  return validateEmail(email) && email.length <= ALERT_EMAIL_MAX_LENGTH
    ? null
    : INVALID_EMAIL_ERROR;
};

export const isAlertEmailValid = ({ alertEmail }: AdminSettingsInput): boolean =>
  getAlertEmailError(alertEmail) === null;

// An empty field must reach the backend as an explicit null, otherwise the saved address stays.
export const toSettingsPayload = ({
  alertEmail,
  alertEmailEnabled,
}: AdminSettingsInput): AdminSettings => ({
  alertEmail: alertEmail.trim() || null,
  alertEmailEnabled,
});

export const formatTestEmailSent = (sentTo: string): string => `Письмо отправлено на ${sentTo}`;
