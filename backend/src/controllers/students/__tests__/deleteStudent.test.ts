import request from "supertest";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { faker } from "@faker-js/faker";

describe("deleteStudent integration tests", () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: "hashed",
        name: faker.person.fullName(),
      },
    });

    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });
  });

  afterAll(async () => {
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("deletes student and returns success message", async () => {
    const student = await prisma.student.create({
      data: {
        name: "ToDelete",
        contactMethod: "WHATSAPP",
        phone: "+79990007777",
        tutorId: userId,
      },
    });

    await request(app)
      .delete(`/api/students/${student.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then(async (res) => {
        expect(res.body.message).toBe("Ученик успешно удален");

        const found = await prisma.student.findUnique({
          where: { id: student.id },
        });
        expect(found).toBeNull();
      });
  });

  it("returns 404 when student not found or belongs to another tutor", async () => {
    await request(app)
      .delete("/api/students/non-existent-id")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(404);
  });

  it("handles database errors gracefully", async () => {
    const student = await prisma.student.create({
      data: {
        name: "TestStudent",
        contactMethod: "WHATSAPP",
        phone: faker.phone.number(),
        tutorId: userId,
      },
    });

    const originalDeleteMany = prisma.student.deleteMany;
    prisma.student.deleteMany = jest
      .fn()
      .mockRejectedValueOnce(new Error("DB error"));

    await request(app)
      .delete(`/api/students/${student.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(500);

    prisma.student.deleteMany = originalDeleteMany;
  });

  it("returns 404 on second DELETE when first already removed the student (regression: bug-hunt 2026-05-24 #6)", async () => {
    const student = await prisma.student.create({
      data: {
        name: "DoubleDeleted",
        contactMethod: "WHATSAPP",
        phone: faker.phone.number(),
        tutorId: userId,
      },
    });

    await request(app)
      .delete(`/api/students/${student.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    await request(app)
      .delete(`/api/students/${student.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(404);
  });

  it("returns 404 when student belongs to another tutor and does not delete it", async () => {
    const otherUser = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: "hashed",
        name: faker.person.fullName(),
      },
    });
    const otherStudent = await prisma.student.create({
      data: {
        name: "OtherTutorStudent",
        contactMethod: "WHATSAPP",
        phone: faker.phone.number(),
        tutorId: otherUser.id,
      },
    });

    await request(app)
      .delete(`/api/students/${otherStudent.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(404);

    const stillExists = await prisma.student.findUnique({
      where: { id: otherStudent.id },
    });
    expect(stillExists).not.toBeNull();

    await prisma.student.delete({ where: { id: otherStudent.id } });
    await prisma.user.delete({ where: { id: otherUser.id } });
  });
});
