import { describe, it, expect } from "vitest";

import type { Student } from "@shared";

import {
  prepareFormDataForEdit,
  prepareEmptyFormData,
  prepareUpdateData,
  prepareCreateData,
  isEditMode,
} from "./student-form.helpers";
import type { StudentFormData } from "../ui/StudentForm/types";

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
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-12-20T15:30:00Z",
};

describe("student-form.helpers", () => {
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
});
