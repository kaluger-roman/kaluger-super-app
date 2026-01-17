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

    const originalDelete = prisma.student.delete;
    prisma.student.delete = jest
      .fn()
      .mockRejectedValueOnce(new Error("DB error"));

    await request(app)
      .delete(`/api/students/${student.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(500);

    prisma.student.delete = originalDelete;
  });
});
