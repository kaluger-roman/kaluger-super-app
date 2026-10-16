import { describe, it, expect } from "vitest";

import type { Student } from "@shared";

import {
  prepareFormDataForEdit,
  prepareEmptyFormData,
  prepareUpdateData,
  prepareCreateData,
  hasCommissionError,
  getCommissionError,
  getCommissionErrorText,
  isEditMode,
  isFormSubmittable,
} from "./studentForm.helpers";
import type { StudentFormData } from "../ui/StudentForm/StudentForm.types";

const mockStudent: Student = {
  id: "1",
  name: "Иван Иванов",
  phone: "+79991234567",
  contactMethod: "TELEGRAM",
  telegramNick: "@ivan",
  parentPhone: "+79997654321",
  parentName: "Родитель Иванов",
  parentContactMethod: "WHATSAPP",
  parentTelegramNick: "@parent",
  hourlyRate: 1500,
  grade: 9,
  notes: "Хороший ученик",
  archived: false,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-12-20T15:30:00Z",
};

describe("studentForm.helpers", () => {
  describe("prepareFormDataForEdit", () => {
    it("should convert student data to form data", () => {
      const formData = prepareFormDataForEdit(mockStudent);

      expect(formData).toEqual({
        name: "Иван Иванов",
        contactMethod: "TELEGRAM",
        parentPhone: "+79997654321",
        parentName: "Родитель Иванов",
        parentContactMethod: "WHATSAPP",
        telegramNick: "@ivan",
        parentTelegramNick: "@parent",
        phone: "+79991234567",
        hourlyRate: "1500",
        commissionAmount: "",
        grade: "9",
        notes: "Хороший ученик",
      });
    });

    it("should handle null values", () => {
      const studentWithNulls: Student = {
        id: "1",
        name: "Петр Петров",
        contactMethod: undefined,
        phone: null,
        telegramNick: null,
        parentPhone: null,
        parentName: null,
        parentContactMethod: null,
        parentTelegramNick: null,
        hourlyRate: null,
        grade: null,
        notes: null,
        archived: false,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      };

      const formData = prepareFormDataForEdit(studentWithNulls);

      expect(formData).toEqual({
        name: "Петр Петров",
        contactMethod: "WHATSAPP",
        parentPhone: "",
        parentName: "",
        parentContactMethod: "WHATSAPP",
        telegramNick: "",
        parentTelegramNick: "",
        phone: "",
        hourlyRate: "",
        commissionAmount: "",
        grade: "",
        notes: "",
      });
    });

    it("should convert numeric values to strings", () => {
      const formData = prepareFormDataForEdit(mockStudent);

      expect(typeof formData.hourlyRate).toBe("string");
      expect(formData.hourlyRate).toBe("1500");
      expect(typeof formData.grade).toBe("string");
      expect(formData.grade).toBe("9");
    });
  });

  describe("prepareEmptyFormData", () => {
    it("should return empty form data", () => {
      const formData = prepareEmptyFormData();

      expect(formData).toEqual({
        name: "",
        contactMethod: "WHATSAPP",
        parentPhone: "",
        parentName: "",
        parentContactMethod: "WHATSAPP",
        telegramNick: "",
        parentTelegramNick: "",
        phone: "",
        hourlyRate: "",
        commissionAmount: "",
        grade: "",
        notes: "",
      });
    });

    it("should use default contact method as WHATSAPP", () => {
      const formData = prepareEmptyFormData();
      expect(formData.contactMethod).toBe("WHATSAPP");
      expect(formData.parentContactMethod).toBe("WHATSAPP");
    });
  });

  describe("prepareUpdateData", () => {
    const formData: StudentFormData = {
      name: "  Иван Иванов  ",
      contactMethod: "TELEGRAM",
      parentPhone: "  +79997654321  ",
      parentName: "  Родитель Иванов  ",
      parentContactMethod: "WHATSAPP",
      telegramNick: "  @ivan  ",
      parentTelegramNick: "  @parent  ",
      phone: "  +79991234567  ",
      hourlyRate: "1500.50",
      commissionAmount: "",
      grade: "9",
      notes: "  Хороший ученик  ",
    };

    it("should trim whitespace from string fields", () => {
      const updateData = prepareUpdateData(formData);

      expect(updateData.name).toBe("Иван Иванов");
      expect(updateData.parentPhone).toBe("+79997654321");
      expect(updateData.parentName).toBe("Родитель Иванов");
      expect(updateData.telegramNick).toBe("@ivan");
      expect(updateData.parentTelegramNick).toBe("@parent");
      expect(updateData.phone).toBe("+79991234567");
      expect(updateData.notes).toBe("Хороший ученик");
    });

    it("should parse hourly rate as float", () => {
      const updateData = prepareUpdateData(formData);
      expect(updateData.hourlyRate).toBe(1500.5);
      expect(typeof updateData.hourlyRate).toBe("number");
    });

    it("should parse grade as integer", () => {
      const updateData = prepareUpdateData(formData);
      expect(updateData.grade).toBe(9);
      expect(typeof updateData.grade).toBe("number");
    });

    it("should convert empty hourly rate to null", () => {
      const emptyRateData = { ...formData, hourlyRate: "" };
      const updateData = prepareUpdateData(emptyRateData);
      expect(updateData.hourlyRate).toBeNull();
    });

    it("should convert empty grade to null", () => {
      const emptyGradeData = { ...formData, grade: "" };
      const updateData = prepareUpdateData(emptyGradeData);
      expect(updateData.grade).toBeNull();
    });

    it("should convert empty optional fields to empty strings", () => {
      const minimalData: StudentFormData = {
        name: "Петр",
        contactMethod: "WHATSAPP",
        parentPhone: "",
        parentName: "",
        parentContactMethod: "WHATSAPP",
        telegramNick: "",
        parentTelegramNick: "",
        phone: "",
        hourlyRate: "",
        commissionAmount: "",
        grade: "",
        notes: "",
      };

      const updateData = prepareUpdateData(minimalData);

      expect(updateData.parentPhone).toBe("");
      expect(updateData.parentName).toBe("");
      expect(updateData.telegramNick).toBe("");
      expect(updateData.parentTelegramNick).toBe("");
      expect(updateData.phone).toBe("");
      expect(updateData.notes).toBe("");
    });
  });

  describe("prepareCreateData", () => {
    const formData: StudentFormData = {
      name: "  Иван Иванов  ",
      contactMethod: "TELEGRAM",
      parentPhone: "  +79997654321  ",
      parentName: "  Родитель Иванов  ",
      parentContactMethod: "WHATSAPP",
      telegramNick: "  @ivan  ",
      parentTelegramNick: "  @parent  ",
      phone: "  +79991234567  ",
      hourlyRate: "1500",
      commissionAmount: "",
      grade: "9",
      notes: "  Хороший ученик  ",
    };

    it("should trim whitespace from string fields", () => {
      const createData = prepareCreateData(formData);

      expect(createData.name).toBe("Иван Иванов");
      expect(createData.parentPhone).toBe("+79997654321");
      expect(createData.parentName).toBe("Родитель Иванов");
      expect(createData.telegramNick).toBe("@ivan");
      expect(createData.parentTelegramNick).toBe("@parent");
      expect(createData.phone).toBe("+79991234567");
      expect(createData.notes).toBe("Хороший ученик");
    });

    it("should parse hourly rate as float", () => {
      const createData = prepareCreateData(formData);
      expect(createData.hourlyRate).toBe(1500);
      expect(typeof createData.hourlyRate).toBe("number");
    });

    it("should parse grade as integer", () => {
      const createData = prepareCreateData(formData);
      expect(createData.grade).toBe(9);
      expect(typeof createData.grade).toBe("number");
    });

    it("should convert empty optional fields to undefined", () => {
      const minimalData: StudentFormData = {
        name: "Петр",
        contactMethod: "WHATSAPP",
        parentPhone: "",
        parentName: "",
        parentContactMethod: "WHATSAPP",
        telegramNick: "",
        parentTelegramNick: "",
        phone: "",
        hourlyRate: "",
        commissionAmount: "",
        grade: "",
        notes: "",
      };

      const createData = prepareCreateData(minimalData);

      expect(createData.parentPhone).toBeUndefined();
      expect(createData.parentName).toBeUndefined();
      expect(createData.telegramNick).toBeUndefined();
      expect(createData.parentTelegramNick).toBeUndefined();
      expect(createData.phone).toBeUndefined();
      expect(createData.hourlyRate).toBeUndefined();
      expect(createData.grade).toBeUndefined();
      expect(createData.notes).toBeUndefined();
    });

    it("should not include undefined fields for required name", () => {
      const createData = prepareCreateData(formData);
      expect(createData.name).toBeDefined();
    });
  });

  describe("isEditMode", () => {
    it("should return true when editing student exists", () => {
      const state = {
        formData: prepareEmptyFormData(),
        editingStudent: mockStudent,
      };

      expect(isEditMode(state)).toBe(true);
    });

    it("should return false when editing student is undefined", () => {
      const state = {
        formData: prepareEmptyFormData(),
        editingStudent: undefined,
      };

      expect(isEditMode(state)).toBe(false);
    });
  });
  describe("commissionAmount", () => {
    const base: StudentFormData = {
      name: "Иван",
      contactMethod: "WHATSAPP",
      parentPhone: "",
      parentName: "",
      parentContactMethod: "WHATSAPP",
      telegramNick: "",
      parentTelegramNick: "",
      phone: "",
      hourlyRate: "",
      commissionAmount: "",
      grade: "",
      notes: "",
    };

    it("should start empty in a blank form", () => {
      expect(prepareEmptyFormData().commissionAmount).toBe("");
    });

    it("should convert a stored commission to a string when editing", () => {
      const student = { ...mockStudent, commissionAmount: 2500 };
      expect(prepareFormDataForEdit(student).commissionAmount).toBe("2500");
    });

    it("should leave a zero commission as an empty field when editing", () => {
      const student = { ...mockStudent, commissionAmount: 0 };
      expect(prepareFormDataForEdit(student).commissionAmount).toBe("");
    });

    it("should send undefined for an empty commission on create", () => {
      expect(prepareCreateData(base).commissionAmount).toBeUndefined();
    });

    it("should parse a filled commission on create", () => {
      expect(prepareCreateData({ ...base, commissionAmount: "1500.50" }).commissionAmount).toBe(
        1500.5
      );
    });

    it("should send zero for an empty commission on update", () => {
      expect(prepareUpdateData(base).commissionAmount).toBe(0);
    });

    it("should parse a filled commission on update", () => {
      expect(prepareUpdateData({ ...base, commissionAmount: "3000" }).commissionAmount).toBe(3000);
    });
  });

  describe("submit predicates", () => {
    const base: StudentFormData = {
      name: "Иван",
      contactMethod: "WHATSAPP",
      parentPhone: "",
      parentName: "",
      parentContactMethod: "WHATSAPP",
      telegramNick: "",
      parentTelegramNick: "",
      phone: "",
      hourlyRate: "",
      commissionAmount: "",
      grade: "",
      notes: "",
    };

    it("should allow a submit with a valid commission", () => {
      expect(isFormSubmittable(base)).toBe(true);
      expect(hasCommissionError(base)).toBe(false);
    });

    it("should block a submit with a negative commission", () => {
      const invalid = { ...base, commissionAmount: "-1" };
      expect(isFormSubmittable(invalid)).toBe(false);
      expect(hasCommissionError(invalid)).toBe(true);
    });

    it("should report no commission error when the name is missing", () => {
      const noName = { ...base, name: "", commissionAmount: "-1" };
      expect(hasCommissionError(noName)).toBe(false);
      expect(isFormSubmittable(noName)).toBe(false);
    });
  });
});

describe("getCommissionError", () => {
  it("should accept an empty value", () => {
    expect(getCommissionError("")).toBeNull();
    expect(getCommissionError("   ")).toBeNull();
  });

  it("should accept zero and positive values with either decimal separator", () => {
    expect(getCommissionError("0")).toBeNull();
    expect(getCommissionError("1500.50")).toBeNull();
    expect(getCommissionError("1500,50")).toBeNull();
  });

  it("should reject a negative value", () => {
    expect(getCommissionError("-1")).toBe("negative");
  });

  it("should reject a non-numeric value", () => {
    expect(getCommissionError("abc")).toBe("not-a-number");
  });

  // Regression: Number("Infinity") is finite-looking to Number.isNaN, so an
  // infinite value used to pass the form and reach the API as 0.
  it("should reject an infinite value", () => {
    expect(getCommissionError("Infinity")).toBe("not-a-number");
    expect(getCommissionError("-Infinity")).toBe("not-a-number");
  });

  it("should reject a value above the DECIMAL(10,2) ceiling", () => {
    expect(getCommissionError("100000000")).toBe("too-large");
    expect(getCommissionError("99999999.99")).toBeNull();
  });

  it("should reject more than two decimal places", () => {
    expect(getCommissionError("1500.555")).toBe("too-precise");
    expect(getCommissionError("1500.07")).toBeNull();
  });
});

describe("getCommissionErrorText", () => {
  it("should name the actual problem instead of always blaming a negative value", () => {
    const formData = { ...prepareEmptyFormData(), name: "Иван", commissionAmount: "abc" };
    expect(getCommissionErrorText(formData)).toBe("Комиссия должна быть числом");
  });
});
