import type { Prisma } from "@prisma/client";

import {
  attachCommissionToLessons,
  attachCommissionToStudents,
  tryAttachCommissionToLessons,
  tryAttachCommissionToStudents,
} from "../commission";

// A row whose amount blows up on read stands in for any failure inside the
// enrichment path — the point of the wrappers is that the caller survives it.
const brokenStudents = [
  {
    id: "s1",
    get commissionAmount(): Prisma.Decimal {
      throw new Error("commission lookup failed");
    },
  },
];

const brokenLessons = [
  {
    id: "l1",
    get studentId(): string {
      throw new Error("commission lookup failed");
    },
  },
];

describe("fail-soft commission wrappers", () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    consoleError.mockClear();
  });

  afterAll(() => {
    consoleError.mockRestore();
  });

  it("should return the students untouched and log instead of throwing", async () => {
    await expect(tryAttachCommissionToStudents("tutor-1", brokenStudents)).resolves.toBe(
      brokenStudents
    );
    expect(consoleError).toHaveBeenCalled();
  });

  it("should keep the strict student variant throwing", async () => {
    await expect(attachCommissionToStudents("tutor-1", brokenStudents)).rejects.toThrow(
      "commission lookup failed"
    );
  });

  it("should return the lessons untouched and log instead of throwing", async () => {
    await expect(tryAttachCommissionToLessons("tutor-1", brokenLessons)).resolves.toBe(
      brokenLessons
    );
    expect(consoleError).toHaveBeenCalled();
  });

  it("should keep the strict lesson variant throwing", async () => {
    await expect(attachCommissionToLessons("tutor-1", brokenLessons)).rejects.toThrow(
      "commission lookup failed"
    );
  });
});
