import request from "supertest";
import { faker } from "@faker-js/faker";
import fs from "fs";
import path from "path";
import os from "os";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

jest.mock("node-cron", () => ({ schedule: jest.fn() }));

describe("backup integration tests", () => {
  let authToken: string;
  let userId: string;
  let tmpDir: string;
  const originalBackupDir = process.env.BACKUP_DIR;

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

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-int-test-"));
    process.env.BACKUP_DIR = tmpDir;
    await prisma.backupSettings.deleteMany();
  });

  afterEach(() => {
    process.env.BACKUP_DIR = originalBackupDir;
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  afterAll(async () => {
    await prisma.backupSettings.deleteMany();
    await prisma.user.delete({ where: { id: userId } });
  });

  describe("GET /api/backup/settings", () => {
    it("should return default settings when none exist", async () => {
      const res = await request(app)
        .get("/api/backup/settings")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.settings).toMatchObject({
        enabled: true,
        intervalHours: 6,
        maxStorageMb: 300,
        lastBackupAt: null,
      });
      expect(res.body.files).toEqual([]);
      expect(res.body.totalSizeMb).toBe(0);
    });

    it("should return existing settings", async () => {
      await prisma.backupSettings.create({
        data: {
          enabled: false,
          intervalHours: 12,
          maxStorageMb: 500,
        },
      });

      const res = await request(app)
        .get("/api/backup/settings")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.settings).toMatchObject({
        enabled: false,
        intervalHours: 12,
        maxStorageMb: 500,
      });
    });

    it("should return 401 without auth token", async () => {
      await request(app).get("/api/backup/settings").expect(401);
    });
  });

  describe("PUT /api/backup/settings", () => {
    it("should update settings", async () => {
      const res = await request(app)
        .put("/api/backup/settings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ enabled: false, intervalHours: 24, maxStorageMb: 500 })
        .expect(200);

      expect(res.body).toMatchObject({
        enabled: false,
        intervalHours: 24,
        maxStorageMb: 500,
      });
    });

    it("should partially update settings", async () => {
      await prisma.backupSettings.create({
        data: {
          enabled: true,
          intervalHours: 6,
          maxStorageMb: 300,
        },
      });

      const res = await request(app)
        .put("/api/backup/settings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ intervalHours: 12 })
        .expect(200);

      expect(res.body.intervalHours).toBe(12);
      expect(res.body.enabled).toBe(true);
      expect(res.body.maxStorageMb).toBe(300);
    });

    it("should return 400 when intervalHours is out of range", async () => {
      const res = await request(app)
        .put("/api/backup/settings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ intervalHours: 0 })
        .expect(400);

      expect(res.body.error).toBe(
        "Интервал должен быть от 1 до 168 часов"
      );
    });

    it("should return 400 when intervalHours exceeds 168", async () => {
      await request(app)
        .put("/api/backup/settings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ intervalHours: 200 })
        .expect(400);
    });

    it("should return 400 when maxStorageMb is too small", async () => {
      const res = await request(app)
        .put("/api/backup/settings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ maxStorageMb: 5 })
        .expect(400);

      expect(res.body.error).toBe(
        "Максимальный размер должен быть от 10 до 10000 МБ"
      );
    });

    it("should return 400 when maxStorageMb exceeds 10000", async () => {
      await request(app)
        .put("/api/backup/settings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ maxStorageMb: 20000 })
        .expect(400);
    });

    it("should return 401 without auth token", async () => {
      await request(app)
        .put("/api/backup/settings")
        .send({ enabled: false })
        .expect(401);
    });
  });
});
