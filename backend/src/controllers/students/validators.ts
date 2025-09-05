import { CreateStudentDto, UpdateStudentDto } from "../../types";

export const validateCreateStudentDto = (data: CreateStudentDto) => {
  const errors: string[] = [];

  if (!data.name) {
    errors.push("Имя обязательно для заполнения");
  }

  if (!data.contactMethod) {
    errors.push("Не выбран способ связи (WhatsApp или Telegram)");
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

  if ("contactMethod" in data && !data.contactMethod) {
    errors.push("Не выбран способ связи (WhatsApp или Telegram)");
  }

  return errors;
};

export const prepareUpdateData = (updateData: UpdateStudentDto) => {
  const preparedData: any = { ...updateData };
  if ("contactMethod" in updateData) {
    preparedData.contactMethod = updateData.contactMethod || undefined;
  }
  if ("parentPhone" in updateData) {
    preparedData.parentPhone =
      updateData.parentPhone === "" ? null : updateData.parentPhone;
  }
  if ("parentContactMethod" in updateData) {
    preparedData.parentContactMethod = updateData.parentContactMethod || null;
  }
  if ("telegramNick" in updateData) {
    preparedData.telegramNick =
      updateData.telegramNick === "" ? null : updateData.telegramNick;
  }
  if ("parentTelegramNick" in updateData) {
    preparedData.parentTelegramNick =
      updateData.parentTelegramNick === ""
        ? null
        : updateData.parentTelegramNick;
  }
  if ("parentName" in updateData) {
    preparedData.parentName =
      updateData.parentName === "" ? null : updateData.parentName;
  }
  if ("phone" in updateData) {
    preparedData.phone = updateData.phone === "" ? null : updateData.phone;
  }
  if ("notes" in updateData) {
    preparedData.notes = updateData.notes === "" ? null : updateData.notes;
  }

  if ("grade" in updateData) {
    preparedData.grade =
      updateData.grade === null || updateData.grade === undefined
        ? null
        : updateData.grade;
  }

  return preparedData;
};
