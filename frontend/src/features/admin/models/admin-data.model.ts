import { createStore, createEvent, createEffect, sample } from "effector";
import { createGate } from "effector-react";

import { adminApiMethods, notificationsModel } from "@shared";
import type {
  AdminOverviewResponse,
  BackupSettingsFullResponse,
  BackupSettingsData,
  BackupFileData,
} from "@shared";

import * as adminAuthModel from "./admin-auth.model";
import {
  isBackupSettingsValid,
  prepareBackupSettings,
} from "./admin-data.helpers";

// Gates
export const AdminPageGate = createGate();

// Stores
export const $tabIndex = createStore(0);
export const $overview = createStore<AdminOverviewResponse | null>(null);
export const $backupSettings = createStore<BackupSettingsData | null>(null);
export const $backupFiles = createStore<BackupFileData[]>([]);
export const $totalSizeMb = createStore<number>(0);
export const $intervalHours = createStore<string>("");
export const $maxStorageMb = createStore<string>("");

// Events
export const tabChanged = createEvent<number>();
export const overviewRequested = createEvent();
export const backupSettingsRequested = createEvent();
export const backupToggled = createEvent();
export const backupSettingsSaved = createEvent();
export const backupCreated = createEvent();
export const intervalHoursChanged = createEvent<string>();
export const maxStorageMbChanged = createEvent<string>();

// Effects
export const getOverviewFx = createEffect(async () => {
  return adminApiMethods.getOverview();
});

export const getBackupSettingsFx = createEffect(async () => {
  return adminApiMethods.getBackupSettings();
});

export const updateBackupSettingsFx = createEffect(
  async (data: {
    enabled?: boolean;
    intervalHours?: number;
    maxStorageMb?: number;
  }) => {
    return adminApiMethods.updateBackupSettings(data);
  }
);

export const createBackupFx = createEffect(async () => {
  return adminApiMethods.createBackup();
});

// Samples
sample({ clock: tabChanged, target: $tabIndex });

sample({
  clock: [AdminPageGate.open, adminAuthModel.loginFx.done, overviewRequested],
  source: adminAuthModel.$isAdminAuthenticated,
  filter: (isAuth) => isAuth,
  target: getOverviewFx,
});

sample({
  clock: getOverviewFx.doneData,
  target: $overview,
});

sample({
  clock: [
    AdminPageGate.open,
    adminAuthModel.loginFx.done,
    backupSettingsRequested,
  ],
  source: adminAuthModel.$isAdminAuthenticated,
  filter: (isAuth) => isAuth,
  target: getBackupSettingsFx,
});

sample({
  clock: getBackupSettingsFx.doneData,
  fn: (data: BackupSettingsFullResponse) => data.settings,
  target: $backupSettings,
});

sample({
  clock: getBackupSettingsFx.doneData,
  fn: (data: BackupSettingsFullResponse) => data.files,
  target: $backupFiles,
});

sample({
  clock: getBackupSettingsFx.doneData,
  fn: (data: BackupSettingsFullResponse) => data.totalSizeMb,
  target: $totalSizeMb,
});

sample({ clock: intervalHoursChanged, target: $intervalHours });

sample({ clock: maxStorageMbChanged, target: $maxStorageMb });

sample({
  clock: getBackupSettingsFx.doneData,
  fn: (data: BackupSettingsFullResponse) =>
    String(data.settings.intervalHours),
  target: $intervalHours,
});

sample({
  clock: getBackupSettingsFx.doneData,
  fn: (data: BackupSettingsFullResponse) =>
    String(data.settings.maxStorageMb),
  target: $maxStorageMb,
});

sample({
  clock: backupToggled,
  source: $backupSettings,
  filter: Boolean,
  fn: (settings) => ({ enabled: !settings.enabled }),
  target: updateBackupSettingsFx,
});

sample({
  clock: backupSettingsSaved,
  source: { intervalHours: $intervalHours, maxStorageMb: $maxStorageMb },
  filter: isBackupSettingsValid,
  fn: prepareBackupSettings,
  target: updateBackupSettingsFx,
});

sample({
  clock: updateBackupSettingsFx.done,
  target: backupSettingsRequested,
});

sample({ clock: backupCreated, target: createBackupFx });

sample({
  clock: createBackupFx.done,
  target: backupSettingsRequested,
});

sample({
  clock: getOverviewFx.failData,
  fn: () => "Ошибка загрузки обзора системы",
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: getBackupSettingsFx.failData,
  fn: () => "Ошибка загрузки настроек бэкапов",
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: updateBackupSettingsFx.failData,
  fn: () => "Ошибка обновления настроек бэкапов",
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: createBackupFx.failData,
  fn: () => "Ошибка создания бэкапа",
  target: notificationsModel.showErrorEvent,
});
