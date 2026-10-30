import { allSettled, fork } from "effector";
import { http, HttpResponse } from "msw";
import { describe, it, expect } from "vitest";

import { adminTokenInvalidated, notificationsModel } from "@shared";
import type { AdminSettings, BackupSettingsFullResponse } from "@shared";

import { server } from "../../../../__tests__/mocks/server";
import { getAlertsFx } from "../adminAlerts.model";
import { $adminToken, loggedOut } from "../adminAuth.model";
import { AdminPageGate, getBackupSettingsFx, getOverviewFx } from "../adminData.model";
import {
  $alertEmail,
  $alertEmailEnabled,
  $alertEmailError,
  $savedAlertEmail,
  alertEmailChanged,
  alertEmailToggled,
  sendTestEmailFx,
  settingsSaved,
  testEmailRequested,
} from "../adminSettings.model";

const BACKUP_SETTINGS: BackupSettingsFullResponse = {
  settings: { enabled: true, intervalHours: 6, maxStorageMb: 300, lastBackupAt: null },
  files: [],
  totalSizeMb: 0,
};

const settingsScope = (
  values: { alertEmail?: string; savedAlertEmail?: string | null; enabled?: boolean } = {}
) =>
  fork({
    values: [
      [$adminToken, "admin-token"],
      [$alertEmail, values.alertEmail ?? ""],
      [$savedAlertEmail, values.savedAlertEmail ?? null],
      [$alertEmailEnabled, values.enabled ?? true],
    ],
    handlers: [
      [getOverviewFx, () => Promise.resolve(null)],
      [getBackupSettingsFx, () => Promise.resolve(BACKUP_SETTINGS)],
      [getAlertsFx, () => Promise.resolve({ alerts: [], readRequests: 0 })],
    ],
  });

const answerSave = () => {
  const bodies: unknown[] = [];
  server.use(
    http.put("*/api/admin/settings", async ({ request }) => {
      const body = (await request.json()) as AdminSettings;
      bodies.push(body);
      return HttpResponse.json({ ...body });
    })
  );
  return bodies;
};

const notification = (scope: ReturnType<typeof fork>) =>
  scope.getState(notificationsModel.$notification);

describe("features/admin/models/adminSettings.model", () => {
  describe("loading", () => {
    it("should fill the form from the saved settings when the admin page opens", async () => {
      server.use(
        http.get("*/api/admin/settings", () =>
          HttpResponse.json({ alertEmail: "admin@example.com", alertEmailEnabled: false })
        )
      );
      const scope = settingsScope();

      await allSettled(AdminPageGate.open, { scope, params: {} });

      expect(scope.getState($alertEmail)).toBe("admin@example.com");
      expect(scope.getState($savedAlertEmail)).toBe("admin@example.com");
      expect(scope.getState($alertEmailEnabled)).toBe(false);
    });

    it("should show an empty field when no address is saved", async () => {
      server.use(
        http.get("*/api/admin/settings", () =>
          HttpResponse.json({ alertEmail: null, alertEmailEnabled: true })
        )
      );
      const scope = settingsScope({ alertEmail: "draft@example.com" });

      await allSettled(AdminPageGate.open, { scope, params: {} });

      expect(scope.getState($alertEmail)).toBe("");
      expect(scope.getState($savedAlertEmail)).toBeNull();
    });

    it("should not request the settings while the admin is not signed in", async () => {
      const scope = fork({ values: [[$adminToken, null]] });

      await allSettled(AdminPageGate.open, { scope, params: {} });

      expect(scope.getState($savedAlertEmail)).toBeNull();
    });

    it("should show a toast when the settings fail to load", async () => {
      server.use(
        http.get("*/api/admin/settings", () =>
          HttpResponse.json({ error: "Ошибка получения настроек" }, { status: 500 })
        )
      );
      const scope = settingsScope();

      await allSettled(AdminPageGate.open, { scope, params: {} });

      expect(notification(scope)).toMatchObject({
        message: "Ошибка загрузки настроек",
        type: "error",
      });
    });
  });

  describe("saving", () => {
    it("should block an invalid address and show the error until the field changes", async () => {
      const bodies = answerSave();
      const scope = settingsScope({ alertEmail: "admin@example" });

      await allSettled(settingsSaved, { scope });

      expect(bodies).toHaveLength(0);
      expect(scope.getState($alertEmailError)).toBe("Некорректный email");

      await allSettled(alertEmailChanged, { scope, params: "admin@example.com" });

      expect(scope.getState($alertEmailError)).toBeNull();
      expect(scope.getState($alertEmail)).toBe("admin@example.com");
    });

    it("should send the trimmed address and confirm the save", async () => {
      const bodies = answerSave();
      const scope = settingsScope({ alertEmail: "  admin@example.com " });

      await allSettled(settingsSaved, { scope });

      expect(bodies).toEqual([{ alertEmail: "admin@example.com", alertEmailEnabled: true }]);
      expect(scope.getState($savedAlertEmail)).toBe("admin@example.com");
      expect(scope.getState($alertEmail)).toBe("admin@example.com");
      expect(notification(scope)).toMatchObject({
        message: "Настройки сохранены",
        type: "success",
      });
    });

    it("should send an explicit null when the field is cleared", async () => {
      const bodies = answerSave();
      const scope = settingsScope({ alertEmail: "", savedAlertEmail: "admin@example.com" });

      await allSettled(settingsSaved, { scope });

      expect(bodies).toEqual([{ alertEmail: null, alertEmailEnabled: true }]);
      expect(scope.getState($savedAlertEmail)).toBeNull();
    });

    it("should save the switch only with the save button", async () => {
      const bodies = answerSave();
      const scope = settingsScope({ alertEmail: "admin@example.com" });

      await allSettled(alertEmailToggled, { scope, params: false });

      expect(bodies).toHaveLength(0);
      expect(scope.getState($alertEmailEnabled)).toBe(false);

      await allSettled(settingsSaved, { scope });

      expect(bodies).toEqual([{ alertEmail: "admin@example.com", alertEmailEnabled: false }]);
    });

    it("should show the server error text when the save fails", async () => {
      server.use(
        http.put("*/api/admin/settings", () =>
          HttpResponse.json({ error: "Некорректный email" }, { status: 400 })
        )
      );
      const scope = settingsScope({
        alertEmail: "new@example.com",
        savedAlertEmail: "admin@example.com",
      });

      await allSettled(settingsSaved, { scope });

      expect(scope.getState($savedAlertEmail)).toBe("admin@example.com");
      expect(notification(scope)).toMatchObject({ message: "Некорректный email", type: "error" });
    });
  });

  describe("test letter", () => {
    it("should send the letter and name the address", async () => {
      server.use(
        http.post("*/api/admin/settings/test-email", () =>
          HttpResponse.json({ sentTo: "admin@example.com" })
        )
      );
      const scope = settingsScope({ savedAlertEmail: "admin@example.com" });

      await allSettled(testEmailRequested, { scope });

      expect(notification(scope)).toMatchObject({
        message: "Письмо отправлено на admin@example.com",
        type: "success",
      });
    });

    it("should not send the letter without a saved address", async () => {
      let calls = 0;
      const scope = fork({
        values: [[$savedAlertEmail, null]],
        handlers: [
          [
            sendTestEmailFx,
            () => {
              calls += 1;
              return Promise.resolve({ sentTo: "" });
            },
          ],
        ],
      });

      await allSettled(testEmailRequested, { scope });

      expect(calls).toBe(0);
    });

    it("should send one letter for a double click", async () => {
      let calls = 0;
      let resolveSend: (value: { sentTo: string }) => void = () => undefined;
      const scope = fork({
        values: [[$savedAlertEmail, "admin@example.com"]],
        handlers: [
          [
            sendTestEmailFx,
            () => {
              calls += 1;
              return new Promise<{ sentTo: string }>((resolve) => {
                resolveSend = resolve;
              });
            },
          ],
        ],
      });

      const first = allSettled(testEmailRequested, { scope });
      const second = allSettled(testEmailRequested, { scope });
      resolveSend({ sentTo: "admin@example.com" });
      await Promise.all([first, second]);

      expect(calls).toBe(1);
    });

    it.each([
      [429, "Тестовое письмо можно отправлять не чаще раза в минуту"],
      [502, "Не удалось отправить письмо: API key is invalid"],
    ])("should show the server text for %i", async (status, error) => {
      server.use(
        http.post("*/api/admin/settings/test-email", () => HttpResponse.json({ error }, { status }))
      );
      const scope = settingsScope({ savedAlertEmail: "admin@example.com" });

      await allSettled(testEmailRequested, { scope });

      expect(notification(scope)).toMatchObject({ message: error, type: "error" });
    });
  });

  describe("session end", () => {
    it.each([
      ["logout", loggedOut],
      ["a rejected token", adminTokenInvalidated],
    ])("should clear the form on %s", async (_name, unit) => {
      const scope = fork({
        values: [
          [$alertEmail, "draft@example"],
          [$savedAlertEmail, "admin@example.com"],
          [$alertEmailEnabled, false],
          [$alertEmailError, "Некорректный email"],
        ],
      });

      await allSettled(unit, { scope });

      expect(scope.getState($alertEmail)).toBe("");
      expect(scope.getState($savedAlertEmail)).toBeNull();
      expect(scope.getState($alertEmailEnabled)).toBe(true);
      expect(scope.getState($alertEmailError)).toBeNull();
    });
  });
});
