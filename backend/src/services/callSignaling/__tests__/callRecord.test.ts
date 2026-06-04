import { faker } from "@faker-js/faker";

import prisma from "../../../lib/prisma";
import { createFinalizedCallRecord } from "../callRecord";

describe("createFinalizedCallRecord", () => {
  let tutorId: string;
  let studentId: string;

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Tutor",
      },
    });
    tutorId = tutor.id;
    const student = await prisma.student.create({
      data: { name: "Student", tutorId },
    });
    studentId = student.id;
  });

  afterEach(async () => {
    await prisma.callRecord.deleteMany({ where: { tutorId } });
  });

  afterAll(async () => {
    await prisma.callRecord.deleteMany({ where: { tutorId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.user.deleteMany({ where: { id: tutorId } });
    await prisma.$disconnect();
  });

  it("should set endedAt and durationSeconds for a COMPLETED call", async () => {
    const startedAt = new Date("2026-06-04T10:00:00.000Z");
    const connectedAt = new Date("2026-06-04T10:00:05.000Z");
    const endedAt = new Date("2026-06-04T10:05:05.000Z");

    await createFinalizedCallRecord({
      tutorId,
      studentId,
      callerKind: "tutor",
      status: "COMPLETED",
      startedAt,
      connectedAt,
      endedAt,
    });

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId } });
    expect(record.status).toBe("COMPLETED");
    expect(record.callerKind).toBe("TUTOR");
    expect(record.durationSeconds).toBe(300);
    expect(record.endedAt?.toISOString()).toBe(endedAt.toISOString());
  });

  it("should leave endedAt and durationSeconds null for a MISSED call", async () => {
    await createFinalizedCallRecord({
      tutorId,
      studentId,
      callerKind: "tutor",
      status: "MISSED",
      startedAt: new Date(),
    });

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId } });
    expect(record.status).toBe("MISSED");
    expect(record.endedAt).toBeNull();
    expect(record.durationSeconds).toBeNull();
  });

  it("should store callerKind STUDENT for student-initiated calls", async () => {
    await createFinalizedCallRecord({
      tutorId,
      studentId,
      callerKind: "student",
      status: "REJECTED",
      startedAt: new Date(),
    });

    const record = await prisma.callRecord.findFirstOrThrow({ where: { tutorId } });
    expect(record.callerKind).toBe("STUDENT");
    expect(record.durationSeconds).toBeNull();
  });
});
