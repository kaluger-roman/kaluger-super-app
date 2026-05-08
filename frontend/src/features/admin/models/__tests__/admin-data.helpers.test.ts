import { describe, it, expect } from "vitest";

import {
  isBackupSettingsValid,
  prepareBackupSettings,
} from "../admin-data.helpers";

describe("features/admin/models/admin-data.helpers", () => {
  describe("isBackupSettingsValid", () => {
    it("should return true for valid settings", () => {
      expect(
        isBackupSettingsValid({ intervalHours: "6", maxStorageMb: "300" })
      ).toBe(true);
    });

    it("should return false when intervalHours is too small", () => {
      expect(
        isBackupSettingsValid({ intervalHours: "0", maxStorageMb: "300" })
      ).toBe(false);
    });

    it("should return false when intervalHours is too large", () => {
      expect(
        isBackupSettingsValid({ intervalHours: "169", maxStorageMb: "300" })
      ).toBe(false);
    });

    it("should return false when maxStorageMb is too small", () => {
      expect(
        isBackupSettingsValid({ intervalHours: "6", maxStorageMb: "5" })
      ).toBe(false);
    });

    it("should return false when maxStorageMb is too large", () => {
      expect(
        isBackupSettingsValid({ intervalHours: "6", maxStorageMb: "10001" })
      ).toBe(false);
    });

    it("should return false for non-numeric input", () => {
      expect(
        isBackupSettingsValid({ intervalHours: "abc", maxStorageMb: "300" })
      ).toBe(false);
    });
  });

  describe("prepareBackupSettings", () => {
    it("should parse string values to numbers", () => {
      const result = prepareBackupSettings({
        intervalHours: "12",
        maxStorageMb: "500",
      });

      expect(result).toEqual({ intervalHours: 12, maxStorageMb: 500 });
    });
  });
});
