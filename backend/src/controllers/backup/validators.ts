import type { UpdateBackupSettingsDto } from "../../types";

export const validateUpdateBackupSettingsDto = (
  data: UpdateBackupSettingsDto
) => {
  const errors: string[] = [];

  if (
    data.intervalHours !== undefined &&
    (data.intervalHours < 1 || data.intervalHours > 168)
  ) {
    errors.push("Интервал должен быть от 1 до 168 часов");
  }

  if (
    data.maxStorageMb !== undefined &&
    (data.maxStorageMb < 10 || data.maxStorageMb > 10000)
  ) {
    errors.push("Максимальный размер должен быть от 10 до 10000 МБ");
  }

  return errors;
};
