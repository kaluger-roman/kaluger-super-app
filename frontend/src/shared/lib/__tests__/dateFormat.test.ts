import { describe, it, expect } from "vitest";

import {
  formatDate,
  formatDateShort,
  formatDateTime,
  formatDay,
  formatMonth,
  formatWeekRange,
} from "../dateFormat";

describe("formatDate", () => {
  it("should format Date object as 'день месяц год'", () => {
    const date = new Date("2024-01-15T12:00:00.000Z");
    const result = formatDate(date);
    expect(result).toMatch(/15 января 2024/);
  });

  it("should format ISO string as 'день месяц год'", () => {
    const dateString = "2024-01-15T12:00:00.000Z";
    const result = formatDate(dateString);
    expect(result).toMatch(/15 января 2024/);
  });

  it("should format beginning of year correctly", () => {
    const date = new Date("2024-01-01T00:00:00.000Z");
    const result = formatDate(date);
    expect(result).toMatch(/1 января 2024/);
  });

  it("should format end of year correctly", () => {
    const date = new Date("2024-12-31T10:00:00.000Z");
    const result = formatDate(date);
    expect(result).toMatch(/31 декабря 2024/);
  });

  it("should format different months correctly", () => {
    const march = new Date("2024-03-15T12:00:00.000Z");
    const june = new Date("2024-06-15T12:00:00.000Z");
    const september = new Date("2024-09-15T12:00:00.000Z");

    expect(formatDate(march)).toMatch(/15 марта 2024/);
    expect(formatDate(june)).toMatch(/15 июня 2024/);
    expect(formatDate(september)).toMatch(/15 сентября 2024/);
  });

  it("should format leap year date correctly", () => {
    const leapDay = new Date("2024-02-29T12:00:00.000Z");
    const result = formatDate(leapDay);
    expect(result).toMatch(/29 февраля 2024/);
  });
});

describe("formatDateShort", () => {
  it("should format Date object with short month", () => {
    const date = new Date("2024-01-15T12:00:00.000Z");
    const result = formatDateShort(date);
    expect(result).toMatch(/15 янв\. 2024/);
  });

  it("should format ISO string with short month", () => {
    const dateString = "2024-01-15T12:00:00.000Z";
    const result = formatDateShort(dateString);
    expect(result).toMatch(/15 янв\. 2024/);
  });

  it("should format different months with short names", () => {
    const february = new Date("2024-02-15T12:00:00.000Z");
    const april = new Date("2024-04-15T12:00:00.000Z");
    const november = new Date("2024-11-15T12:00:00.000Z");

    expect(formatDateShort(february)).toMatch(/15 февр\. 2024/);
    expect(formatDateShort(april)).toMatch(/15 апр\. 2024/);
    expect(formatDateShort(november)).toMatch(/15 нояб\. 2024/);
  });

  it("should format beginning of month with short name", () => {
    const date = new Date("2024-05-01T00:00:00.000Z");
    const result = formatDateShort(date);
    expect(result).toMatch(/1 мая 2024/);
  });

  it("should format end of month with short name", () => {
    const date = new Date("2024-07-31T10:00:00.000Z");
    const result = formatDateShort(date);
    expect(result).toMatch(/31 июл\. 2024/);
  });
});

describe("formatDateTime", () => {
  it("should format Date object with time", () => {
    const date = new Date("2024-01-15T14:30:00.000Z");
    const result = formatDateTime(date);
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/);
  });

  it("should format ISO string with time", () => {
    const dateString = "2024-01-15T14:30:00.000Z";
    const result = formatDateTime(dateString);
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/);
  });

  it("should format midnight correctly", () => {
    const date = new Date("2024-01-15T00:00:00.000Z");
    const result = formatDateTime(date);
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/);
  });

  it("should format end of day correctly", () => {
    const date = new Date("2024-01-15T23:59:00.000Z");
    const result = formatDateTime(date);
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/);
  });

  it("should format time with single digit minutes correctly", () => {
    const date = new Date("2024-01-15T14:05:00.000Z");
    const result = formatDateTime(date);
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:05/);
  });

  it("should format different times of day", () => {
    const morning = new Date("2024-01-15T09:15:00.000Z");
    const afternoon = new Date("2024-01-15T15:45:00.000Z");
    const evening = new Date("2024-01-15T20:30:00.000Z");

    expect(formatDateTime(morning)).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:15/);
    expect(formatDateTime(afternoon)).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:45/);
    expect(formatDateTime(evening)).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:30/);
  });
});

describe("formatMonth", () => {
  it("should format Date object as 'месяц год'", () => {
    const date = new Date("2024-01-15T12:00:00.000Z");
    const result = formatMonth(date);
    expect(result).toMatch(/январь 2024/);
  });

  it("should format ISO string as 'месяц год'", () => {
    const dateString = "2024-01-15T12:00:00.000Z";
    const result = formatMonth(dateString);
    expect(result).toMatch(/январь 2024/);
  });

  it("should format different months correctly", () => {
    const january = new Date("2024-01-01T12:00:00.000Z");
    const june = new Date("2024-06-01T12:00:00.000Z");
    const december = new Date("2024-12-01T12:00:00.000Z");

    expect(formatMonth(january)).toMatch(/январь 2024/);
    expect(formatMonth(june)).toMatch(/июнь 2024/);
    expect(formatMonth(december)).toMatch(/декабрь 2024/);
  });

  it("should format same month in different years", () => {
    const jan2023 = new Date("2023-01-15T12:00:00.000Z");
    const jan2024 = new Date("2024-01-15T12:00:00.000Z");
    const jan2025 = new Date("2025-01-15T12:00:00.000Z");

    expect(formatMonth(jan2023)).toMatch(/январь 2023/);
    expect(formatMonth(jan2024)).toMatch(/январь 2024/);
    expect(formatMonth(jan2025)).toMatch(/январь 2025/);
  });

  it("should format all months of year correctly", () => {
    const months = [
      { date: new Date("2024-01-01T12:00:00.000Z"), expected: /январь 2024/ },
      { date: new Date("2024-02-01T12:00:00.000Z"), expected: /февраль 2024/ },
      { date: new Date("2024-03-01T12:00:00.000Z"), expected: /март 2024/ },
      { date: new Date("2024-04-01T12:00:00.000Z"), expected: /апрель 2024/ },
      { date: new Date("2024-05-01T12:00:00.000Z"), expected: /май 2024/ },
      { date: new Date("2024-06-01T12:00:00.000Z"), expected: /июнь 2024/ },
      { date: new Date("2024-07-01T12:00:00.000Z"), expected: /июль 2024/ },
      { date: new Date("2024-08-01T12:00:00.000Z"), expected: /август 2024/ },
      { date: new Date("2024-09-01T12:00:00.000Z"), expected: /сентябрь 2024/ },
      { date: new Date("2024-10-01T12:00:00.000Z"), expected: /октябрь 2024/ },
      { date: new Date("2024-11-01T12:00:00.000Z"), expected: /ноябрь 2024/ },
      { date: new Date("2024-12-01T12:00:00.000Z"), expected: /декабрь 2024/ },
    ];

    months.forEach(({ date, expected }) => {
      expect(formatMonth(date)).toMatch(expected);
    });
  });
});

describe("formatDay", () => {
  it("should format Date object as 'день недели, день месяц'", () => {
    const date = new Date("2024-01-15T12:00:00.000Z");
    const result = formatDay(date);
    expect(result).toMatch(/[а-яё]+, 15 января/);
  });

  it("should format ISO string as 'день недели, день месяц'", () => {
    const dateString = "2024-01-15T12:00:00.000Z";
    const result = formatDay(dateString);
    expect(result).toMatch(/[а-яё]+, 15 января/);
  });

  it("should format different days of week correctly", () => {
    // January 1, 2024 is Monday
    const monday = new Date("2024-01-01T12:00:00.000Z");
    const tuesday = new Date("2024-01-02T12:00:00.000Z");
    const wednesday = new Date("2024-01-03T12:00:00.000Z");
    const thursday = new Date("2024-01-04T12:00:00.000Z");
    const friday = new Date("2024-01-05T12:00:00.000Z");
    const saturday = new Date("2024-01-06T12:00:00.000Z");
    const sunday = new Date("2024-01-07T12:00:00.000Z");

    expect(formatDay(monday)).toMatch(/понедельник, 1 января/);
    expect(formatDay(tuesday)).toMatch(/вторник, 2 января/);
    expect(formatDay(wednesday)).toMatch(/среда, 3 января/);
    expect(formatDay(thursday)).toMatch(/четверг, 4 января/);
    expect(formatDay(friday)).toMatch(/пятница, 5 января/);
    expect(formatDay(saturday)).toMatch(/суббота, 6 января/);
    expect(formatDay(sunday)).toMatch(/воскресенье, 7 января/);
  });

  it("should format beginning of month with day of week", () => {
    const date = new Date("2024-02-01T12:00:00.000Z");
    const result = formatDay(date);
    expect(result).toMatch(/[а-яё]+, 1 февраля/);
  });

  it("should format end of month with day of week", () => {
    const date = new Date("2024-03-31T12:00:00.000Z");
    const result = formatDay(date);
    expect(result).toMatch(/[а-яё]+, 31 марта/);
  });

  it("should format different months with day of week", () => {
    const april = new Date("2024-04-15T12:00:00.000Z");
    const august = new Date("2024-08-20T12:00:00.000Z");
    const november = new Date("2024-11-25T12:00:00.000Z");

    expect(formatDay(april)).toMatch(/[а-яё]+, 15 апреля/);
    expect(formatDay(august)).toMatch(/[а-яё]+, 20 августа/);
    expect(formatDay(november)).toMatch(/[а-яё]+, 25 ноября/);
  });
});

describe("formatWeekRange", () => {
  it("should format week range with Date objects", () => {
    const start = new Date("2024-01-01T12:00:00.000Z");
    const end = new Date("2024-01-07T12:00:00.000Z");
    const result = formatWeekRange(start, end);
    expect(result).toMatch(/1 января — 7 января 2024/);
  });

  it("should format week range with ISO strings", () => {
    const start = "2024-01-01T12:00:00.000Z";
    const end = "2024-01-07T12:00:00.000Z";
    const result = formatWeekRange(start, end);
    expect(result).toMatch(/1 января — 7 января 2024/);
  });

  it("should format week range with mixed Date and string", () => {
    const start = new Date("2024-01-01T12:00:00.000Z");
    const end = "2024-01-07T12:00:00.000Z";
    const result = formatWeekRange(start, end);
    expect(result).toMatch(/1 января — 7 января 2024/);
  });

  it("should format week range spanning two months", () => {
    const start = new Date("2024-01-29T12:00:00.000Z");
    const end = new Date("2024-02-04T12:00:00.000Z");
    const result = formatWeekRange(start, end);
    expect(result).toMatch(/29 января — 4 февраля 2024/);
  });

  it("should format week range spanning two years", () => {
    const start = new Date("2023-12-28T12:00:00.000Z");
    const end = new Date("2024-01-03T12:00:00.000Z");
    const result = formatWeekRange(start, end);
    expect(result).toMatch(/28 декабря — 3 января 2024/);
  });

  it("should format same day range", () => {
    const start = new Date("2024-01-15T12:00:00.000Z");
    const end = new Date("2024-01-15T12:00:00.000Z");
    const result = formatWeekRange(start, end);
    expect(result).toMatch(/15 января — 15 января 2024/);
  });

  it("should format mid-month week range", () => {
    const start = new Date("2024-03-11T12:00:00.000Z");
    const end = new Date("2024-03-17T12:00:00.000Z");
    const result = formatWeekRange(start, end);
    expect(result).toMatch(/11 марта — 17 марта 2024/);
  });

  it("should format end-of-year week range", () => {
    const start = new Date("2024-12-25T12:00:00.000Z");
    const end = new Date("2024-12-31T12:00:00.000Z");
    const result = formatWeekRange(start, end);
    expect(result).toMatch(/25 декабря — 31 декабря 2024/);
  });

  it("should format beginning-of-year week range", () => {
    const start = new Date("2024-01-01T12:00:00.000Z");
    const end = new Date("2024-01-07T12:00:00.000Z");
    const result = formatWeekRange(start, end);
    expect(result).toMatch(/1 января — 7 января 2024/);
  });

  it("should format week range in different months", () => {
    const spring = formatWeekRange(
      new Date("2024-04-15T12:00:00.000Z"),
      new Date("2024-04-21T12:00:00.000Z")
    );
    const summer = formatWeekRange(
      new Date("2024-07-08T12:00:00.000Z"),
      new Date("2024-07-14T12:00:00.000Z")
    );
    const autumn = formatWeekRange(
      new Date("2024-10-21T12:00:00.000Z"),
      new Date("2024-10-27T12:00:00.000Z")
    );

    expect(spring).toMatch(/15 апреля — 21 апреля 2024/);
    expect(summer).toMatch(/8 июля — 14 июля 2024/);
    expect(autumn).toMatch(/21 октября — 27 октября 2024/);
  });
});
