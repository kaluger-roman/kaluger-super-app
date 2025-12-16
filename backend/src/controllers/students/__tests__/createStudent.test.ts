import request from "supertest";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { faker } from "@faker-js/faker";

describe("createStudent integration tests", () => {
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

  it("returns 400 when validation fails (missing name)", async () => {
    const payload = {
      contactMethod: "WHATSAPP",
      phone: "+79990001122",
    };

    await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload)
      .expect(400)
      .then((res) => {
        expect(res.body.error).toBeDefined();
      });
  });

  it("creates student and returns 201 with student", async () => {
    const payload = {
      name: "Test Student",
      contactMethod: "WHATSAPP",
      phone: "+79990001122",
      grade: 10,
    };

    await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload)
      .expect(201)
      .then(async (res) => {
        expect(res.body.message).toBe("Ученик успешно создан");
        expect(res.body.student).toBeDefined();

        const created = await prisma.student.findUnique({
          where: { id: res.body.student.id },
        });
        expect(created).toBeTruthy();
        expect(created?.tutorId).toBe(userId);
      });
  });

  it("returns 400 when creating duplicate phone for same tutor", async () => {
    const payload = {
      name: "Dup Student",
      contactMethod: "WHATSAPP",
      phone: "+79990009999",
    };

    // first create should succeed
    await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload)
      .expect(201);

    // second create with same phone should trigger unique constraint
    await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload)
      .expect(400)
      .then((res) => {
        expect(res.body.error).toBe(
          "У вас уже есть ученик с таким номером телефона"
        );
      });
  });

  it("returns 400 when contactMethod is missing", async () => {
    const payload: any = {
      name: "NoContact",
      // contactMethod missing
    };

    await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${authToken}`)
      .send(payload)
      .expect(400)
      .then((res) => {
        expect(res.body.error).toBe(
          "Не выбран способ связи (WhatsApp или Telegram)"
        );
      });
  });
});
