"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validators_1 = require("../validators");
describe("students validators unit tests", () => {
    it("validateUpdateStudentDto should return error when contactMethod provided empty", () => {
        const errors = (0, validators_1.validateUpdateStudentDto)({ contactMethod: "" });
        expect(errors).toContain("Не выбран способ связи (WhatsApp или Telegram)");
    });
    it("validateUpdateStudentDto should return error when hourlyRate negative", () => {
        const errors = (0, validators_1.validateUpdateStudentDto)({ hourlyRate: -5 });
        expect(errors).toContain("Почасовая ставка должна быть положительной");
    });
    it("prepareUpdateData should convert empty strings to null and keep undefined fields unchanged", () => {
        const input = {
            parentPhone: "",
            parentContactMethod: "",
            telegramNick: "",
            parentTelegramNick: "",
            parentName: "",
            phone: "",
            notes: "",
            hourlyRate: null,
            grade: null,
            contactMethod: "",
        };
        const prepared = (0, validators_1.prepareUpdateData)(input);
        expect(prepared.parentPhone).toBeNull();
        expect(prepared.parentContactMethod).toBeNull();
        expect(prepared.telegramNick).toBeNull();
        expect(prepared.parentTelegramNick).toBeNull();
        expect(prepared.parentName).toBeNull();
        expect(prepared.phone).toBeNull();
        expect(prepared.notes).toBeNull();
        expect(prepared.hourlyRate).toBeNull();
        expect(prepared.grade).toBeNull();
        // contactMethod empty becomes undefined (per validator implementation)
        expect(prepared.contactMethod).toBeUndefined();
    });
    it("prepareUpdateData should keep non-empty values unchanged and handle hourlyRate=0", () => {
        const input = {
            parentPhone: "+70000000000",
            parentContactMethod: "WHATSAPP",
            telegramNick: "nick",
            parentTelegramNick: "pnick",
            parentName: "Parent",
            phone: "+79990000000",
            notes: "note",
            hourlyRate: 0,
            grade: 5,
        };
        const prepared = (0, validators_1.prepareUpdateData)(input);
        expect(prepared.parentPhone).toBe("+70000000000");
        expect(prepared.parentContactMethod).toBe("WHATSAPP");
        expect(prepared.telegramNick).toBe("nick");
        expect(prepared.parentTelegramNick).toBe("pnick");
        expect(prepared.parentName).toBe("Parent");
        expect(prepared.phone).toBe("+79990000000");
        expect(prepared.notes).toBe("note");
        // hourlyRate 0 should be preserved (not treated as falsy to convert to null)
        expect(prepared.hourlyRate).toBe(0);
        expect(prepared.grade).toBe(5);
    });
    it("validateUpdateStudentDto should return no errors for empty object and omitted fields", () => {
        const errors = (0, validators_1.validateUpdateStudentDto)({});
        expect(errors).toHaveLength(0);
    });
    it("validateUpdateStudentDto should allow hourlyRate = 0", () => {
        const errors = (0, validators_1.validateUpdateStudentDto)({ hourlyRate: 0 });
        expect(errors).toHaveLength(0);
    });
    describe("validateCreateStudentDto coverage", () => {
        it("returns error when name missing", () => {
            const errors = (0, validators_1.validateCreateStudentDto)({});
            expect(errors).toContain("Имя обязательно для заполнения");
        });
        it("returns error when contactMethod missing", () => {
            const errors = (0, validators_1.validateCreateStudentDto)({ name: "A" });
            expect(errors).toContain("Не выбран способ связи (WhatsApp или Telegram)");
        });
        it("returns error when hourlyRate negative", () => {
            const errors = (0, validators_1.validateCreateStudentDto)({
                name: "A",
                contactMethod: "WHATSAPP",
                hourlyRate: -1,
            });
            expect(errors).toContain("Почасовая ставка должна быть положительной");
        });
        it("returns error when grade invalid (out of range)", () => {
            const errors = (0, validators_1.validateCreateStudentDto)({
                name: "A",
                contactMethod: "WHATSAPP",
                grade: 12,
            });
            expect(errors).toContain("Класс должен быть числом от 1 до 11");
        });
        it("returns error when grade invalid (non-number)", () => {
            const errors = (0, validators_1.validateCreateStudentDto)({
                name: "A",
                contactMethod: "WHATSAPP",
                grade: "five",
            });
            expect(errors).toContain("Класс должен быть числом от 1 до 11");
        });
        it("returns no errors for valid create dto", () => {
            const errors = (0, validators_1.validateCreateStudentDto)({
                name: "A",
                contactMethod: "WHATSAPP",
                hourlyRate: 1000,
                grade: 10,
            });
            expect(errors).toHaveLength(0);
        });
    });
});
//# sourceMappingURL=validators.test.js.map