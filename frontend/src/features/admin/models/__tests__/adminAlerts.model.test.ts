import { allSettled, fork } from "effector";
import { http, HttpResponse } from "msw";
import { describe, it, expect, vi } from "vitest";

import { adminTokenInvalidated, notificationsModel } from "@shared";
import type { AdminAlert, BackupSettingsFullResponse } from "@shared";

import { makeAlert, READ_AT, RESOLVED } from "./adminAlerts.fixtures";
import { server } from "../../../../__tests__/mocks/server";
import {
  $activeAlerts,
  $activeAlertsCount,
  $alerts,
  $alertsFilter,
  $hasActiveCriticalAlerts,
  $resolvedAlerts,
  $unreadActiveAlertsCount,
  alertMarkedRead,
  alertsFilterChanged,
  allAlertsMarkedRead,
  getAlertsFx,
} from "../adminAlerts.model";
import { $adminToken, loggedOut, loginFx } from "../adminAuth.model";
import {
  $backupSettings,
  AdminPageGate,
  backupCreated,
  backupToggled,
  createBackupFx,
  getBackupSettingsFx,
  getOverviewFx,
  tabChanged,
  updateBackupSettingsFx,
} from "../adminData.model";
import { getAdminSettingsFx } from "../adminSettings.model";

const BACKUP_SETTINGS: BackupSettingsFullResponse = {
  settings: { enabled: true, intervalHours: 6, maxStorageMb: 300, lastBackupAt: null },
  files: [],
  totalSizeMb: 0,
};

const unreadCritical = makeAlert({ id: "a1" });
const unreadWarning = makeAlert({ id: "a2", severity: "warning" });
const readCritical = makeAlert({ id: "a3", readAt: READ_AT });
const readWarning = makeAlert({ id: "a4", severity: "warning", readAt: READ_AT });
const resolved = makeAlert({ id: "r1", ...RESOLVED });
const ALERTS = [unreadCritical, unreadWarning, readCritical, readWarning, resolved];

type ScopeOptions = { token?: string | null; alerts?: AdminAlert[] };

const adminScope = ({ token = "admin-token", alerts = [] }: ScopeOptions = {}) =>
  fork({
    values: [
      [$adminToken, token],
      [$alerts, alerts],
    ],
    handlers: [
      [getOverviewFx, () => Promise.resolve(null)],
      [getBackupSettingsFx, () => Promise.resolve(BACKUP_SETTINGS)],
      [getAdminSettingsFx, () => Promise.resolve({ alertEmail: null, alertEmailEnabled: true })],
    ],
  });

const answerAlertsList = (alerts: AdminAlert[]) => {
  const requests: string[] = [];
  server.use(
    http.get("*/api/admin/alerts", ({ request }) => {
      requests.push(request.url);
      return HttpResponse.json({ alerts });
    })
  );
  return requests;
};

describe("features/admin/models/adminAlerts.model", () => {
  describe("loading", () => {
    it("should load the alerts when the admin page opens", async () => {
      const requests = answerAlertsList(ALERTS);
      const scope = adminScope();

      await allSettled(AdminPageGate.open, { scope, params: {} });

      expect(requests).toHaveLength(1);
      expect(scope.getState($alerts)).toEqual(ALERTS);
    });

    it("should not request the alerts while the admin is not signed in", async () => {
      const requests = answerAlertsList(ALERTS);
      const scope = adminScope({ token: null });

      await allSettled(AdminPageGate.open, { scope, params: {} });
      await allSettled(tabChanged, { scope, params: 2 });

      expect(requests).toHaveLength(0);
      expect(scope.getState($alerts)).toEqual([]);
    });

    it("should load the alerts after a successful login", async () => {
      const requests = answerAlertsList(ALERTS);
      const scope = fork({
        values: [[$adminToken, null]],
        handlers: [
          [loginFx, () => Promise.resolve("admin-token")],
          [getOverviewFx, () => Promise.resolve(null)],
          [getBackupSettingsFx, () => Promise.resolve(BACKUP_SETTINGS)],
          [
            getAdminSettingsFx,
            () => Promise.resolve({ alertEmail: null, alertEmailEnabled: true }),
          ],
        ],
      });

      await allSettled(loginFx, { scope, params: { email: "admin@test.com", password: "pass" } });

      expect(requests).toHaveLength(1);
      expect(scope.getState($alerts)).toEqual(ALERTS);
    });

    it("should reload the alerts on every tab change", async () => {
      const requests = answerAlertsList(ALERTS);
      const scope = adminScope();

      await allSettled(tabChanged, { scope, params: 2 });
      await allSettled(tabChanged, { scope, params: 0 });

      expect(requests).toHaveLength(2);
    });

    it("should reload the alerts after a manual backup, also a failed one", async () => {
      const requests = answerAlertsList([unreadCritical]);
      const scope = fork({
        values: [[$adminToken, "admin-token"]],
        handlers: [[createBackupFx, () => Promise.reject(new Error("pg_dump"))]],
      });

      await allSettled(backupCreated, { scope });

      expect(requests).toHaveLength(1);
      expect(scope.getState($alerts)).toEqual([unreadCritical]);
    });

    it("should reload the alerts after the backup settings change", async () => {
      const requests = answerAlertsList([]);
      const scope = fork({
        values: [
          [$adminToken, "admin-token"],
          [
            $backupSettings,
            { enabled: true, intervalHours: 6, maxStorageMb: 300, lastBackupAt: null },
          ],
        ],
        handlers: [
          [updateBackupSettingsFx, () => Promise.resolve(BACKUP_SETTINGS.settings)],
          [getBackupSettingsFx, () => Promise.resolve(BACKUP_SETTINGS)],
        ],
      });

      await allSettled(backupToggled, { scope });

      expect(requests).toHaveLength(1);
    });

    it("should show a toast when the alerts fail to load", async () => {
      server.use(
        http.get("*/api/admin/alerts", () =>
          HttpResponse.json({ error: "Ошибка получения алертов" }, { status: 500 })
        )
      );
      const scope = adminScope({ alerts: [unreadCritical] });

      await allSettled(getAlertsFx, { scope });

      expect(scope.getState($alerts)).toEqual([unreadCritical]);
      expect(scope.getState(notificationsModel.$notification)).toMatchObject({
        message: "Ошибка загрузки алертов",
        type: "error",
      });
    });
  });

  describe("derived stores", () => {
    it("should split the list and count active and unread alerts", () => {
      const scope = adminScope({ alerts: ALERTS });

      expect(scope.getState($activeAlerts)).toEqual([
        unreadCritical,
        unreadWarning,
        readCritical,
        readWarning,
      ]);
      expect(scope.getState($resolvedAlerts)).toEqual([resolved]);
      expect(scope.getState($activeAlertsCount)).toBe(4);
      expect(scope.getState($unreadActiveAlertsCount)).toBe(2);
    });

    it("should flag a critical alert only among the active ones", () => {
      expect(fork({ values: [[$alerts, ALERTS]] }).getState($hasActiveCriticalAlerts)).toBe(true);
      expect(
        fork({ values: [[$alerts, [unreadWarning, resolved]]] }).getState($hasActiveCriticalAlerts)
      ).toBe(false);
    });

    it("should start with the active filter and switch it", async () => {
      const scope = fork();
      expect(scope.getState($alertsFilter)).toBe("active");

      await allSettled(alertsFilterChanged, { scope, params: "all" });

      expect(scope.getState($alertsFilter)).toBe("all");
    });
  });

  describe("marking as read", () => {
    it("should mark one alert as read and take the list from the response", async () => {
      const ids: unknown[] = [];
      const updated = [{ ...unreadCritical, readAt: READ_AT }, unreadWarning];
      server.use(
        http.post("*/api/admin/alerts/:id/read", ({ params }) => {
          ids.push(params.id);
          return HttpResponse.json({ alerts: updated });
        })
      );
      const scope = adminScope({ alerts: [unreadCritical, unreadWarning] });

      await allSettled(alertMarkedRead, { scope, params: "a1" });

      expect(ids).toEqual(["a1"]);
      expect(scope.getState($alerts)).toEqual(updated);
      expect(scope.getState($unreadActiveAlertsCount)).toBe(1);
    });

    it("should ignore a list that started loading before «Прочитано»", async () => {
      let answerList: () => void = () => undefined;
      server.use(
        http.get(
          "*/api/admin/alerts",
          () =>
            new Promise<Response>((resolve) => {
              answerList = () => resolve(HttpResponse.json({ alerts: [unreadCritical] }));
            })
        ),
        http.post("*/api/admin/alerts/:id/read", () =>
          HttpResponse.json({ alerts: [{ ...unreadCritical, readAt: READ_AT }] })
        )
      );
      const scope = adminScope({ alerts: [unreadCritical] });

      const loading = allSettled(getAlertsFx, { scope });
      const marking = allSettled(alertMarkedRead, { scope, params: "a1" });
      await vi.waitFor(() => expect(scope.getState($alerts)[0].readAt).toBe(READ_AT));
      answerList();
      await Promise.all([loading, marking]);

      expect(scope.getState($alerts)).toEqual([{ ...unreadCritical, readAt: READ_AT }]);
      expect(scope.getState($unreadActiveAlertsCount)).toBe(0);
    });

    it("should mark all alerts as read and take the list from the response", async () => {
      let calls = 0;
      const updated = [
        { ...unreadCritical, readAt: READ_AT },
        { ...unreadWarning, readAt: READ_AT },
      ];
      server.use(
        http.post("*/api/admin/alerts/read-all", () => {
          calls += 1;
          return HttpResponse.json({ alerts: updated });
        })
      );
      const scope = adminScope({ alerts: [unreadCritical, unreadWarning] });

      await allSettled(allAlertsMarkedRead, { scope });

      expect(calls).toBe(1);
      expect(scope.getState($alerts)).toEqual(updated);
      expect(scope.getState($unreadActiveAlertsCount)).toBe(0);
    });

    it("should not send read-all when nothing is unread", async () => {
      const scope = adminScope({ alerts: [readCritical, resolved] });

      await allSettled(allAlertsMarkedRead, { scope });

      expect(scope.getState($alerts)).toEqual([readCritical, resolved]);
    });

    it("should show a toast and keep the list when marking fails", async () => {
      server.use(
        http.post("*/api/admin/alerts/:id/read", () =>
          HttpResponse.json({ error: "Алерт не найден" }, { status: 404 })
        ),
        http.post("*/api/admin/alerts/read-all", () =>
          HttpResponse.json({ error: "Ошибка обновления алертов" }, { status: 500 })
        )
      );
      const scope = adminScope({ alerts: [unreadCritical] });

      await allSettled(alertMarkedRead, { scope, params: "a1" });

      expect(scope.getState($alerts)).toEqual([unreadCritical]);
      expect(scope.getState(notificationsModel.$notification)).toMatchObject({
        message: "Ошибка обновления алерта",
        type: "error",
      });

      await allSettled(notificationsModel.hideNotification, { scope });
      await allSettled(allAlertsMarkedRead, { scope });

      expect(scope.getState(notificationsModel.$notification)).toMatchObject({
        message: "Ошибка обновления алерта",
        type: "error",
      });
    });
  });

  describe("session end", () => {
    it("should clear the alerts and the filter on logout", async () => {
      const scope = fork({
        values: [
          [$adminToken, "admin-token"],
          [$alerts, ALERTS],
          [$alertsFilter, "all"],
        ],
      });

      await allSettled(loggedOut, { scope });

      expect(scope.getState($alerts)).toEqual([]);
      expect(scope.getState($alertsFilter)).toBe("active");
    });

    it("should clear the alerts when the admin token is rejected", async () => {
      const scope = fork({ values: [[$alerts, ALERTS]] });

      await allSettled(adminTokenInvalidated, { scope });

      expect(scope.getState($alerts)).toEqual([]);
    });
  });
});
