import type { AdminSettingsDto, UpdateAdminSettingsDto } from "../../types";
import { validateEmail } from "../../utils";

const MAX_EMAIL_LENGTH = 254;

type ValidationResult = { data: AdminSettingsDto } | { error: string };

export const validateUpdateAdminSettingsDto = ({
  alertEmail,
  alertEmailEnabled,
}: UpdateAdminSettingsDto): ValidationResult => {
  if (alertEmail !== null && typeof alertEmail !== "string") {
    return { error: "Некорректный email" };
  }
  const email = alertEmail?.trim() || null;
  if (email !== null && (email.length > MAX_EMAIL_LENGTH || !validateEmail(email))) {
    return { error: "Некорректный email" };
  }
  if (typeof alertEmailEnabled !== "boolean") {
    return { error: "Некорректное значение переключателя рассылки" };
  }
  return { data: { alertEmail: email, alertEmailEnabled } };
};
