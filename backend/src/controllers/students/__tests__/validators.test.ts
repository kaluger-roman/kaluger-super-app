import {
  validateUpdateStudentDto,
  prepareUpdateData,
  validateCreateStudentDto,
} from "../validators";

describe("students validators unit tests", () => {
  it("validateUpdateStudentDto should return error when contactMethod provided empty", () => {
    const errors = validateUpdateStudentDto({ contactMethod: "" as any });
    expect(errors).toContain("Не выбран способ связи (WhatsApp или Telegram)");
  });

  it("validateUpdateStudentDto should return error when hourlyRate negative", () => {
    const errors = validateUpdateStudentDto({ hourlyRate: -5 as any });
    expect(errors).toContain("Почасовая ставка должна быть положительной");
  });

  it("prepareUpdateData should convert empty strings to null and keep undefined fields unchanged", () => {
    const input: any = {
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

    const prepared = prepareUpdateData(input);

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
    const input: any = {
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

    const prepared = prepareUpdateData(input);

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
    const errors = validateUpdateStudentDto({} as any);
    expect(errors).toHaveLength(0);
  });

  it("validateUpdateStudentDto should allow hourlyRate = 0", () => {
    const errors = validateUpdateStudentDto({ hourlyRate: 0 } as any);
    expect(errors).toHaveLength(0);
  });

  describe("validateCreateStudentDto coverage", () => {
    it("returns error when name missing", () => {
      const errors = validateCreateStudentDto({} as any);
      expect(errors).toContain("Имя обязательно для заполнения");
    });

    it("returns error when contactMethod missing", () => {
      const errors = validateCreateStudentDto({ name: "A" } as any);
      expect(errors).toContain(
        "Не выбран способ связи (WhatsApp или Telegram)"
      );
    });

    it("returns error when hourlyRate negative", () => {
      const errors = validateCreateStudentDto({
        name: "A",
        contactMethod: "WHATSAPP",
        hourlyRate: -1,
      } as any);
      expect(errors).toContain("Почасовая ставка должна быть положительной");
    });

    it("returns error when grade invalid (out of range)", () => {
      const errors = validateCreateStudentDto({
        name: "A",
        contactMethod: "WHATSAPP",
        grade: 12,
      } as any);
      expect(errors).toContain("Класс должен быть числом от 1 до 11");
    });

    it("returns error when grade invalid (non-number)", () => {
      const errors = validateCreateStudentDto({
        name: "A",
        contactMethod: "WHATSAPP",
        grade: "five" as any,
      } as any);
      expect(errors).toContain("Класс должен быть числом от 1 до 11");
    });

    it("returns no errors for valid create dto", () => {
      const errors = validateCreateStudentDto({
        name: "A",
        contactMethod: "WHATSAPP",
        hourlyRate: 1000,
        grade: 10,
      } as any);
      expect(errors).toHaveLength(0);
    });
  });
});
