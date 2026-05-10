import request from "supertest";
import { app } from "../index";
import prisma from "../lib/prisma";

describe("GET /health", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 200 OK when database is reachable", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toMatchObject({ status: "OK" });
    expect(typeof response.body.timestamp).toBe("string");
  });

  it("should return 503 with database_unavailable when prisma query fails", async () => {
    const queryRawSpy = jest
      .spyOn(prisma, "$queryRaw")
      .mockRejectedValueOnce(new Error("connection refused"));

    try {
      const response = await request(app).get("/health").expect(503);

      expect(response.body).toMatchObject({
        status: "ERROR",
        reason: "database_unavailable",
      });
      expect(typeof response.body.timestamp).toBe("string");
    } finally {
      queryRawSpy.mockRestore();
    }
  });
});
