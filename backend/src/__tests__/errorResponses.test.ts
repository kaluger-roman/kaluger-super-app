import request from "supertest";
import { app } from "../index";
import { prisma } from "../lib/prisma";

describe("App-level error responses", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should answer an unknown route with a Russian message", async () => {
    const response = await request(app).get("/api/definitely-unknown-route").expect(404);

    expect(response.body).toEqual({ error: "Маршрут не найден" });
  });

  it("should answer a malformed JSON body with 400 and a Russian message", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": ')
      .expect(400);

    expect(response.body).toEqual({ error: "Некорректный запрос" });
  });
});
