import request from "supertest";
import fs from "fs";
import path from "path";
import os from "os";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateAdminToken, generateToken } from "../../../utils/auth";
import * as backupService from "../../../services/backup";

jest.mock("node-cron", () => ({ schedule: jest.fn() }));

describe("backup admin integration tests", () => {
  let adminToken: string;
  let tmpDir: string;
  const originalBackupDir = process.env.BACKUP_DIR;

  beforeAll(() => {
    process.env.ADMIN_EMAIL = "admin@test.com";
    process.env.ADMIN_PASSWORD = "TestAdmin123";
    adminToken = generateAdminToken({ email: "admin@test.com", isAdmin: true });
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
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    await prisma.backupSettings.deleteMany();
  });

  describe("GET /api/admin/backup/settings", () => {
    it("should return default settings when none exist", async () => {
      const res = await request(app)
        .get("/api/admin/backup/settings")
        .set("Authorization", `Bearer ${adminToken}`)
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
          id: "backup-settings-singleton",
          enabled: false,
          intervalHours: 12,
          maxStorageMb: 500,
        },
      });

      const res = await request(app)
        .get("/api/admin/backup/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.settings).toMatchObject({
        enabled: false,
        intervalHours: 12,
        maxStorageMb: 500,
      });
    });

    it("should return 401 without auth token", async () => {
      await request(app).get("/api/admin/backup/settings").expect(401);
    });

    it("should reject regular user token", async () => {
      const userToken = generateToken({
        userId: "test",
        email: "user@test.com",
      });

      await request(app)
        .get("/api/admin/backup/settings")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe("PUT /api/admin/backup/settings", () => {
    it("should update settings", async () => {
      const res = await request(app)
        .put("/api/admin/backup/settings")
        .set("Authorization", `Bearer ${adminToken}`)
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
          id: "backup-settings-singleton",
          enabled: true,
          intervalHours: 6,
          maxStorageMb: 300,
        },
      });

      const res = await request(app)
        .put("/api/admin/backup/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ intervalHours: 12 })
        .expect(200);

      expect(res.body.intervalHours).toBe(12);
      expect(res.body.enabled).toBe(true);
      expect(res.body.maxStorageMb).toBe(300);
    });

    it("should return 400 when intervalHours is out of range", async () => {
      const res = await request(app)
        .put("/api/admin/backup/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ intervalHours: 0 })
        .expect(400);

      expect(res.body.error).toBe(
        "Интервал должен быть от 1 до 168 часов"
      );
    });

    it("should return 400 when maxStorageMb is too small", async () => {
      const res = await request(app)
        .put("/api/admin/backup/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ maxStorageMb: 5 })
        .expect(400);

      expect(res.body.error).toBe(
        "Максимальный размер должен быть от 10 до 10000 МБ"
      );
    });

    it("should return 401 without auth token", async () => {
      await request(app)
        .put("/api/admin/backup/settings")
        .send({ enabled: false })
        .expect(401);
    });
  });

  describe("POST /api/admin/backup/create", () => {
    it("should create backup and return file info", async () => {
      const mockResult = {
        name: "backup-2026-03-30.sql.gz",
        sizeMb: 1.5,
        createdAt: new Date("2026-03-30T12:00:00Z"),
      };
      jest
        .spyOn(backupService, "createManualBackup")
        .mockResolvedValue(mockResult);

      const res = await request(app)
        .post("/api/admin/backup/create")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        name: "backup-2026-03-30.sql.gz",
        sizeMb: 1.5,
      });
      expect(res.body.createdAt).toBeDefined();
    });

    it("should return 500 when backup fails", async () => {
      jest
        .spyOn(backupService, "createManualBackup")
        .mockRejectedValue(new Error("pg_dump failed"));

      const res = await request(app)
        .post("/api/admin/backup/create")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(500);

      expect(res.body.error).toBe("Ошибка создания бэкапа");
    });

    it("should return 401 without auth token", async () => {
      await request(app).post("/api/admin/backup/create").expect(401);
    });

    it("should reject regular user token", async () => {
      const userToken = generateToken({
        userId: "test",
        email: "user@test.com",
      });

      await request(app)
        .post("/api/admin/backup/create")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
