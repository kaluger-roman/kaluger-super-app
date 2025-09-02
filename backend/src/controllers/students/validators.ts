import { CreateStudentDto, UpdateStudentDto } from "../../types";

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateCreateStudentDto = (data: CreateStudentDto) => {
  const errors: string[] = [];

  if (!data.name) {
    errors.push("Имя обязательно для заполнения");
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push("Неверный формат email");
  }

  if (data.hourlyRate && data.hourlyRate < 0) {
    errors.push("Почасовая ставка должна быть положительной");
  }

  if (
    typeof data.grade !== "undefined" &&
    data.grade !== null &&
    (typeof data.grade !== "number" || data.grade < 1 || data.grade > 11)
  ) {
    errors.push("Класс должен быть числом от 1 до 11");
  }

  return errors;
};

export const validateUpdateStudentDto = (data: UpdateStudentDto) => {
  const errors: string[] = [];

  if (data.email && !validateEmail(data.email)) {
    errors.push("Неверный формат email");
  }

  if (data.hourlyRate && data.hourlyRate < 0) {
    errors.push("Почасовая ставка должна быть положительной");
  }

  return errors;
};

export const prepareUpdateData = (updateData: UpdateStudentDto) => {
  const preparedData: any = { ...updateData };

  if ("email" in updateData) {
    preparedData.email = updateData.email === "" ? null : updateData.email;
  }
  if ("phone" in updateData) {
    preparedData.phone = updateData.phone === "" ? null : updateData.phone;
  }
  if ("notes" in updateData) {
    preparedData.notes = updateData.notes === "" ? null : updateData.notes;
  }
  if ("hourlyRate" in updateData) {
    preparedData.hourlyRate =
      updateData.hourlyRate === null || updateData.hourlyRate === undefined
        ? null
        : updateData.hourlyRate;
  }
  if ("grade" in updateData) {
    preparedData.grade =
      updateData.grade === null || updateData.grade === undefined
        ? null
        : updateData.grade;
  }

  return preparedData;
};
