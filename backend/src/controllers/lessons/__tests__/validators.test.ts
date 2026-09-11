import { validateLessonData } from "../../lessons/validators";
import { truncateToMinute } from "../../../utils/time";

type CreateLessonDto = {
  subject?: string;
  lessonType?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  studentId?: string;
  price?: number;
  prospectName?: string;
  prospectPhone?: string;
  prospectContactMethod?: string;
  isRecurring?: boolean;
};

describe("validateLessonData", () => {
  it("returns error when required fields are missing", () => {
    const data: CreateLessonDto = {};
    const res = validateLessonData(data as any);
    expect(res.isValid).toBe(false);
    expect(res.error).toBe(
      "Предмет, тип урока, время начала и время окончания обязательны"
    );
  });

  it("returns error when endTime is not after startTime", () => {
    const start = new Date("2025-01-01T10:00:30Z");
    const end = new Date("2025-01-01T10:00:40Z");
    // truncateToMinute will make them equal (both to 10:00)
    const data: CreateLessonDto = {
      subject: "MATHEMATICS",
      lessonType: "EGE",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      studentId: "s1",
    };

    // Ensure truncateToMinute behavior assumed
    expect(truncateToMinute(start).getTime()).toBe(
      truncateToMinute(end).getTime()
    );

    const res = validateLessonData(data as any);
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Время окончания должно быть позже времени начала");
  });

  it("returns error when price is negative", () => {
    const data: CreateLessonDto = {
      subject: "MATHEMATICS",
      lessonType: "EGE",
      startTime: new Date("2025-01-01T10:00:00Z").toISOString(),
      endTime: new Date("2025-01-01T11:00:00Z").toISOString(),
      studentId: "s1",
      price: -100,
    };

    const res = validateLessonData(data as any);
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Цена должна быть положительной");
  });

  it("returns valid for correct data", () => {
    const data: CreateLessonDto = {
      subject: "MATHEMATICS",
      lessonType: "EGE",
      startTime: new Date("2025-01-01T10:00:00Z").toISOString(),
      endTime: new Date("2025-01-01T11:00:00Z").toISOString(),
      studentId: "s1",
      price: 100,
    };

    const res = validateLessonData(data as any);
    expect(res.isValid).toBe(true);
    expect(res).not.toHaveProperty("error");
  });

  it("allows price 0 and omitted price (treated as valid)", () => {
    const base = {
      subject: "MATHEMATICS",
      lessonType: "EGE",
      startTime: new Date("2025-01-01T10:00:00Z").toISOString(),
      endTime: new Date("2025-01-01T11:00:00Z").toISOString(),
      studentId: "s1",
    };

    const withZeroPrice = validateLessonData({ ...base, price: 0 } as any);
    expect(withZeroPrice.isValid).toBe(true);

    const withoutPrice = validateLessonData(base as any);
    expect(withoutPrice.isValid).toBe(true);
  });

  describe("prospect (trial lesson without student)", () => {
    const base = {
      subject: "MATHEMATICS",
      lessonType: "EGE",
      startTime: new Date("2025-01-01T10:00:00Z").toISOString(),
      endTime: new Date("2025-01-01T11:00:00Z").toISOString(),
    };

    it("returns error when neither studentId nor prospectName is given", () => {
      const res = validateLessonData(base as any);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe(
        "Укажите ученика или имя для пробного урока без ученика"
      );
    });

    it("returns error when prospect fields are combined with studentId", () => {
      const res = validateLessonData({
        ...base,
        studentId: "s1",
        prospectName: "Иван",
      } as any);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe(
        "Данные пробного ученика нельзя указывать вместе с учеником"
      );
    });

    it("returns error when prospectName is blank", () => {
      const res = validateLessonData({
        ...base,
        prospectName: "   ",
      } as any);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Имя ученика для пробного урока обязательно");
    });

    it("returns error when prospect lesson is recurring", () => {
      const res = validateLessonData({
        ...base,
        prospectName: "Иван",
        isRecurring: true,
      } as any);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe(
        "Пробный урок без ученика не может быть повторяющимся"
      );
    });

    it("returns error when prospectContactMethod is not in allowed list", () => {
      const res = validateLessonData({
        ...base,
        prospectName: "Иван",
        prospectContactMethod: "VIBER",
      } as any);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe(
        "Недопустимый способ связи (WhatsApp, Telegram или MAX)"
      );
    });

    it("returns valid for prospect lesson with name and MAX contact", () => {
      const res = validateLessonData({
        ...base,
        prospectName: "Иван",
        prospectPhone: "+79991234567",
        prospectContactMethod: "MAX",
      } as any);
      expect(res.isValid).toBe(true);
    });
  });
});
