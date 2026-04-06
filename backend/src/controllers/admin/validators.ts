import { validateEmail } from "../../utils/auth";
import type { AdminLoginDto } from "../../types";

export const validateAdminLoginDto = (data: AdminLoginDto) => {
  const errors: string[] = [];

  if (!data.email || !data.password) {
    errors.push("Email и пароль обязательны");
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push("Некорректный формат email");
  }

  return errors;
};
