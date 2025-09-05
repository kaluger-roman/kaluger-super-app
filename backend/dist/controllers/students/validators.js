"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareUpdateData = exports.validateUpdateStudentDto = exports.validateCreateStudentDto = void 0;
const validateCreateStudentDto = (data) => {
    const errors = [];
    if (!data.name) {
        errors.push("Имя обязательно для заполнения");
    }
    if (!data.contactMethod) {
        errors.push("Не выбран способ связи (WhatsApp или Telegram)");
    }
    if (data.hourlyRate && data.hourlyRate < 0) {
        errors.push("Почасовая ставка должна быть положительной");
    }
    if (typeof data.grade !== "undefined" &&
        data.grade !== null &&
        (typeof data.grade !== "number" || data.grade < 1 || data.grade > 11)) {
        errors.push("Класс должен быть числом от 1 до 11");
    }
    return errors;
};
exports.validateCreateStudentDto = validateCreateStudentDto;
const validateUpdateStudentDto = (data) => {
    const errors = [];
    if ("contactMethod" in data && !data.contactMethod) {
        errors.push("Не выбран способ связи (WhatsApp или Telegram)");
    }
    if (data.hourlyRate && data.hourlyRate < 0) {
        errors.push("Почасовая ставка должна быть положительной");
    }
    return errors;
};
exports.validateUpdateStudentDto = validateUpdateStudentDto;
const prepareUpdateData = (updateData) => {
    const preparedData = { ...updateData };
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
exports.prepareUpdateData = prepareUpdateData;
//# sourceMappingURL=validators.js.map