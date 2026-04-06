import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { adminApiMethods, notificationsModel } from "@shared";
import type { BackupSettingsFullResponse } from "@shared";

import {
  getOverviewFx,
  getBackupSettingsFx,
  updateBackupSettingsFx,
  tabChanged,
  intervalHoursChanged,
  maxStorageMbChanged,
  backupSettingsSaved,
  backupCreated,
  $tabIndex,
  $overview,
  $backupSettings,
  $backupFiles,
  $totalSizeMb,
  $intervalHours,
  $maxStorageMb,
} from "../admin-data.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    adminApiMethods: {
      getOverview: vi.fn(),
      getBackupSettings: vi.fn(),
      updateBackupSettings: vi.fn(),
      createBackup: vi.fn(),
    },
  };
});

const mockBackupSettingsResponse: BackupSettingsFullResponse = {
  settings: {
    enabled: true,
    intervalHours: 6,
    maxStorageMb: 300,
    lastBackupAt: null,
  },
  files: [
    {
      name: "backup-2026-03-30.sql.gz",
      sizeMb: 1.5,
      createdAt: "2026-03-30T12:00:00Z",
    },
  ],
  totalSizeMb: 1.5,
};

describe("features/admin/models/admin-data.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tabChanged", () => {
    it("should update tab index", async () => {
      const scope = fork();

      await allSettled(tabChanged, { scope, params: 1 });

      expect(scope.getState($tabIndex)).toBe(1);
    });
  });

  describe("getOverviewFx", () => {
    it("should set overview data on success", async () => {
      const mockOverview = {
        usersCount: 5,
        studentsCount: 10,
        lessonsCount: 100,
        serverUptime: 3600,
      };
      vi.mocked(adminApiMethods.getOverview).mockResolvedValue(mockOverview);

      const scope = fork();
      await allSettled(getOverviewFx, { scope });

      expect(scope.getState($overview)).toEqual(mockOverview);
    });

    it("should show error notification on failure", async () => {
      vi.mocked(adminApiMethods.getOverview).mockRejectedValue(
        new Error("fail")
      );

      const scope = fork();
      await allSettled(getOverviewFx, { scope });

      expect(scope.getState(notificationsModel.$notification)).toMatchObject({
        message: "Ошибка загрузки обзора системы",
        type: "error",
      });
    });
  });

  describe("getBackupSettingsFx", () => {
    it("should populate backup stores on success", async () => {
      vi.mocked(adminApiMethods.getBackupSettings).mockResolvedValue(
        mockBackupSettingsResponse
      );

      const scope = fork();
      await allSettled(getBackupSettingsFx, { scope });

      expect(scope.getState($backupSettings)).toEqual(
        mockBackupSettingsResponse.settings
      );
      expect(scope.getState($backupFiles)).toEqual(
        mockBackupSettingsResponse.files
      );
      expect(scope.getState($totalSizeMb)).toBe(1.5);
      expect(scope.getState($intervalHours)).toBe("6");
      expect(scope.getState($maxStorageMb)).toBe("300");
    });

    it("should show error notification on failure", async () => {
      vi.mocked(adminApiMethods.getBackupSettings).mockRejectedValue(
        new Error("fail")
      );

      const scope = fork();
      await allSettled(getBackupSettingsFx, { scope });

      expect(scope.getState(notificationsModel.$notification)).toMatchObject({
        message: "Ошибка загрузки настроек бэкапов",
        type: "error",
      });
    });
  });

  describe("form fields", () => {
    it("should update intervalHours", async () => {
      const scope = fork();

      await allSettled(intervalHoursChanged, { scope, params: "12" });

      expect(scope.getState($intervalHours)).toBe("12");
    });

    it("should update maxStorageMb", async () => {
      const scope = fork();

      await allSettled(maxStorageMbChanged, { scope, params: "500" });

      expect(scope.getState($maxStorageMb)).toBe("500");
    });
  });

  describe("backupSettingsSaved", () => {
    it("should call updateBackupSettingsFx with valid data", async () => {
      vi.mocked(adminApiMethods.updateBackupSettings).mockResolvedValue({
        enabled: true,
        intervalHours: 12,
        maxStorageMb: 500,
        lastBackupAt: null,
      });
      vi.mocked(adminApiMethods.getBackupSettings).mockResolvedValue(
        mockBackupSettingsResponse
      );

      const scope = fork({
        values: [
          [$intervalHours, "12"],
          [$maxStorageMb, "500"],
        ],
      });

      await allSettled(backupSettingsSaved, { scope });

      expect(adminApiMethods.updateBackupSettings).toHaveBeenCalledWith({
        intervalHours: 12,
        maxStorageMb: 500,
      });
    });

    it("should not call updateBackupSettingsFx with invalid data", async () => {
      const scope = fork({
        values: [
          [$intervalHours, "0"],
          [$maxStorageMb, "5"],
        ],
      });

      await allSettled(backupSettingsSaved, { scope });

      expect(adminApiMethods.updateBackupSettings).not.toHaveBeenCalled();
    });
  });

  describe("backupCreated", () => {
    it("should call createBackupFx", async () => {
      vi.mocked(adminApiMethods.createBackup).mockResolvedValue({
        name: "backup.sql.gz",
        sizeMb: 1,
        createdAt: "2026-03-30T12:00:00Z",
      });
      vi.mocked(adminApiMethods.getBackupSettings).mockResolvedValue(
        mockBackupSettingsResponse
      );

      const scope = fork();
      await allSettled(backupCreated, { scope });

      expect(adminApiMethods.createBackup).toHaveBeenCalled();
    });

    it("should show error notification on failure", async () => {
      vi.mocked(adminApiMethods.createBackup).mockRejectedValue(
        new Error("fail")
      );

      const scope = fork();
      await allSettled(backupCreated, { scope });

      expect(scope.getState(notificationsModel.$notification)).toMatchObject({
        message: "Ошибка создания бэкапа",
        type: "error",
      });
    });
  });

  describe("updateBackupSettingsFx", () => {
    it("should show error notification on failure", async () => {
      vi.mocked(adminApiMethods.updateBackupSettings).mockRejectedValue(
        new Error("fail")
      );

      const scope = fork();
      await allSettled(updateBackupSettingsFx, {
        scope,
        params: { intervalHours: 12 },
      });

      expect(scope.getState(notificationsModel.$notification)).toMatchObject({
        message: "Ошибка обновления настроек бэкапов",
        type: "error",
      });
    });
  });
});
