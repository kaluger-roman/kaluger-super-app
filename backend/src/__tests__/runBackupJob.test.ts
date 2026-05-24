import prisma from "../lib/prisma";

jest.mock("child_process", () => ({
  exec: (
    _cmd: string,
    _opts: unknown,
    cb: (err: Error & { stderr?: string }, stdout: string, stderr: string) => void
  ) => {
    const err = new Error("pg_dump: command not found") as Error & {
      stderr?: string;
    };
    err.stderr = "pg_dump: command not found";
    cb(err, "", err.stderr);
  },
}));

import { runBackupJob } from "../services/backup";

describe("runBackupJob error logging", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    await prisma.backupSettings.deleteMany();
    await prisma.backupSettings.create({
      data: {
        id: "backup-settings-singleton",
        enabled: true,
        intervalHours: 6,
        maxStorageMb: 300,
      },
    });
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  afterAll(async () => {
    await prisma.backupSettings.deleteMany();
    await prisma.$disconnect();
  });

  it("should log structured error with name, message, stack and re-throw when pg_dump fails", async () => {
    await expect(runBackupJob()).rejects.toThrow(/Ошибка pg_dump/);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Backup job failed:",
      expect.objectContaining({
        name: expect.any(String),
        message: expect.stringMatching(/Ошибка pg_dump/),
        stack: expect.any(String),
      })
    );
  });

  it("should release backupRunning guard so the next tick can start after a failure", async () => {
    await expect(runBackupJob()).rejects.toThrow(/Ошибка pg_dump/);
    await expect(runBackupJob()).rejects.toThrow(/Ошибка pg_dump/);
  });
});
