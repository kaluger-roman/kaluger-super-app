import { createStore, createEvent, createEffect, sample } from "effector";
import { createGate } from "effector-react";

import { adminApiMethods } from "@shared";
import type {
  AdminOverviewResponse,
  BackupSettingsFullResponse,
  BackupSettingsData,
  BackupFileData,
} from "@shared";

const ADMIN_TOKEN_KEY = "adminToken";

// Gates
export const AdminPageGate = createGate();

// Stores
export const $adminToken = createStore<string | null>(
  localStorage.getItem(ADMIN_TOKEN_KEY)
);
export const $isAdminAuthenticated = $adminToken.map((token) => token !== null);
export const $loginError = createStore<string | null>(null);
export const $email = createStore("");
export const $password = createStore("");
export const $overview = createStore<AdminOverviewResponse | null>(null);
export const $backupSettings = createStore<BackupSettingsData | null>(null);
export const $backupFiles = createStore<BackupFileData[]>([]);
export const $totalSizeMb = createStore<number>(0);
export const $intervalHours = createStore<string>("");
export const $maxStorageMb = createStore<string>("");

// Events
export const emailChanged = createEvent<string>();
export const passwordChanged = createEvent<string>();
export const loginSubmitted = createEvent();
export const loggedOut = createEvent();
export const overviewRequested = createEvent();
export const backupSettingsRequested = createEvent();
export const backupSettingsUpdated = createEvent<{
  enabled?: boolean;
  intervalHours?: number;
  maxStorageMb?: number;
}>();
export const backupCreated = createEvent();
export const intervalHoursChanged = createEvent<string>();
export const maxStorageMbChanged = createEvent<string>();

// Effects
export const loginFx = createEffect(
  async ({ email, password }: { email: string; password: string }) => {
    const result = await adminApiMethods.login(email, password);
    localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
    return result.token;
  }
);

export const logoutFx = createEffect(async () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
});

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
sample({
  clock: emailChanged,
  target: $email,
});

sample({
  clock: passwordChanged,
  target: $password,
});

sample({
  clock: loginSubmitted,
  source: { email: $email, password: $password },
  target: loginFx,
});

sample({
  clock: loginFx.doneData,
  target: [$adminToken, getOverviewFx, getBackupSettingsFx],
});

sample({
  clock: loginFx.failData,
  fn: (error) => {
    const axiosError = error as { response?: { data?: { error?: string } } };
    return axiosError.response?.data?.error ?? "Ошибка авторизации";
  },
  target: $loginError,
});

sample({
  clock: loginSubmitted,
  fn: () => null,
  target: $loginError,
});

sample({
  clock: loggedOut,
  target: logoutFx,
});

sample({
  clock: logoutFx.done,
  fn: () => null,
  target: $adminToken,
});

sample({
  clock: [AdminPageGate.open, overviewRequested],
  source: $isAdminAuthenticated,
  filter: (isAuth) => isAuth,
  target: getOverviewFx,
});

sample({
  clock: getOverviewFx.doneData,
  target: $overview,
});

sample({
  clock: [AdminPageGate.open, backupSettingsRequested],
  source: $isAdminAuthenticated,
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

sample({
  clock: intervalHoursChanged,
  target: $intervalHours,
});

sample({
  clock: maxStorageMbChanged,
  target: $maxStorageMb,
});

sample({
  clock: getBackupSettingsFx.doneData,
  fn: (data: BackupSettingsFullResponse) => String(data.settings.intervalHours),
  target: $intervalHours,
});

sample({
  clock: getBackupSettingsFx.doneData,
  fn: (data: BackupSettingsFullResponse) => String(data.settings.maxStorageMb),
  target: $maxStorageMb,
});

sample({
  clock: backupSettingsUpdated,
  target: updateBackupSettingsFx,
});

sample({
  clock: updateBackupSettingsFx.done,
  target: backupSettingsRequested,
});

sample({
  clock: backupCreated,
  target: createBackupFx,
});

sample({
  clock: createBackupFx.done,
  target: backupSettingsRequested,
});
