import { attach, createEffect, createEvent, createStore, sample } from "effector";

import { adminApiMethods, adminTokenInvalidated, notificationsModel } from "@shared";
import type { AdminAlert } from "@shared";

import { ALERT_UPDATE_ERROR, ALERTS_LOAD_ERROR } from "./adminAlerts.constants";
import {
  countUnreadActiveAlerts,
  getActiveAlerts,
  getResolvedAlerts,
  hasCriticalAlert,
} from "./adminAlerts.helpers";
import type { AlertsFilter, AlertsLoad } from "./adminAlerts.types";
import * as adminAuthModel from "./adminAuth.model";
import * as adminDataModel from "./adminData.model";

export const $alerts = createStore<AdminAlert[]>([]);
export const $alertsFilter = createStore<AlertsFilter>("active");
export const $activeAlerts = $alerts.map(getActiveAlerts);
export const $resolvedAlerts = $alerts.map(getResolvedAlerts);
export const $activeAlertsCount = $activeAlerts.map((alerts) => alerts.length);
export const $unreadActiveAlertsCount = $alerts.map(countUnreadActiveAlerts);
export const $hasActiveCriticalAlerts = $activeAlerts.map(hasCriticalAlert);

// Counts «Прочитано» requests: a list loaded before one of them started is stale.
const $readRequests = createStore(0);

export const alertsFilterChanged = createEvent<AlertsFilter>();
export const alertMarkedRead = createEvent<string>();
export const allAlertsMarkedRead = createEvent();

export const getAlertsFx = attach({
  source: $readRequests,
  effect: async (readRequests): Promise<AlertsLoad> => {
    const { alerts } = await adminApiMethods.getAlerts();
    return { alerts, readRequests };
  },
});

export const markAlertReadFx = createEffect(async (id: string) => {
  const { alerts } = await adminApiMethods.markAlertRead(id);
  return alerts;
});

export const markAllAlertsReadFx = createEffect(async () => {
  const { alerts } = await adminApiMethods.markAllAlertsRead();
  return alerts;
});

// A manual backup (also a failed one) and toggling backups can open or close alerts.
sample({
  clock: [
    adminDataModel.AdminPageGate.open,
    adminAuthModel.loginFx.done,
    adminDataModel.tabChanged,
    adminDataModel.createBackupFx.finally,
    adminDataModel.updateBackupSettingsFx.done,
  ],
  source: adminAuthModel.$isAdminAuthenticated,
  filter: (isAuth) => isAuth,
  fn: () => undefined,
  target: getAlertsFx,
});

sample({
  clock: [markAlertReadFx, markAllAlertsReadFx],
  source: $readRequests,
  fn: (count) => count + 1,
  target: $readRequests,
});

sample({
  clock: getAlertsFx.doneData,
  source: $readRequests,
  filter: (readRequests, load) => load.readRequests === readRequests,
  fn: (_, { alerts }) => alerts,
  target: $alerts,
});

sample({
  clock: [markAlertReadFx.doneData, markAllAlertsReadFx.doneData],
  target: $alerts,
});

sample({ clock: alertsFilterChanged, target: $alertsFilter });

sample({ clock: alertMarkedRead, target: markAlertReadFx });

sample({
  clock: allAlertsMarkedRead,
  source: $unreadActiveAlertsCount,
  filter: (unreadCount) => unreadCount > 0,
  fn: () => undefined,
  target: markAllAlertsReadFx,
});

sample({
  clock: getAlertsFx.fail,
  fn: () => ALERTS_LOAD_ERROR,
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: [markAlertReadFx.fail, markAllAlertsReadFx.fail],
  fn: () => ALERT_UPDATE_ERROR,
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: [adminAuthModel.loggedOut, adminTokenInvalidated],
  fn: (): AdminAlert[] => [],
  target: $alerts,
});

sample({
  clock: [adminAuthModel.loggedOut, adminTokenInvalidated],
  fn: (): AlertsFilter => "active",
  target: $alertsFilter,
});
