"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareUpdateData = exports.validateUpdateStudentDto = exports.validateCreateStudentDto = exports.validateEmail = void 0;
const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
exports.validateEmail = validateEmail;
const validateCreateStudentDto = (data) => {
    const errors = [];
    if (!data.name) {
        errors.push("Имя обязательно для заполнения");
    }
    if (data.email && !(0, exports.validateEmail)(data.email)) {
        errors.push("Неверный формат email");
    }
    if (data.hourlyRate && data.hourlyRate < 0) {
        errors.push("Почасовая ставка должна быть положительной");
    }
    return errors;
};
exports.validateCreateStudentDto = validateCreateStudentDto;
const validateUpdateStudentDto = (data) => {
    const errors = [];
    if (data.email && !(0, exports.validateEmail)(data.email)) {
        errors.push("Неверный формат email");
    }
    if (data.hourlyRate && data.hourlyRate < 0) {
        errors.push("Почасовая ставка должна быть положительной");
    }
    return errors;
};
exports.validateUpdateStudentDto = validateUpdateStudentDto;
const prepareUpdateData = (updateData) => {
    const preparedData = { ...updateData };
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
exports.prepareUpdateData = prepareUpdateData;
//# sourceMappingURL=validators.js.map