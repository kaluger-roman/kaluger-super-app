import { createEffect, createEvent, createStore, sample } from "effector";

import {
  adminApiMethods,
  adminTokenInvalidated,
  extractAxiosError,
  notificationsModel,
} from "@shared";
import type { AdminSettings } from "@shared";

import * as adminAuthModel from "./adminAuth.model";
import * as adminDataModel from "./adminData.model";
import {
  SETTINGS_LOAD_ERROR,
  SETTINGS_SAVE_ERROR,
  SETTINGS_SAVED_MESSAGE,
  TEST_EMAIL_ERROR,
} from "./adminSettings.constants";
import {
  formatTestEmailSent,
  getAlertEmailError,
  isAlertEmailValid,
  toSettingsPayload,
} from "./adminSettings.helpers";

export const $alertEmail = createStore("");
export const $alertEmailEnabled = createStore(true);
export const $savedAlertEmail = createStore<string | null>(null);
export const $alertEmailError = createStore<string | null>(null);

export const alertEmailChanged = createEvent<string>();
export const alertEmailToggled = createEvent<boolean>();
export const settingsSaved = createEvent();
export const testEmailRequested = createEvent();

export const getAdminSettingsFx = createEffect(async () => adminApiMethods.getAdminSettings());

export const updateAdminSettingsFx = createEffect(async (data: AdminSettings) =>
  adminApiMethods.updateAdminSettings(data)
);

export const sendTestEmailFx = createEffect(async () => adminApiMethods.sendTestEmail());

const settingsReceived = sample({
  clock: [getAdminSettingsFx.doneData, updateAdminSettingsFx.doneData],
});

const settingsCleared = sample({
  clock: [adminAuthModel.loggedOut, adminTokenInvalidated],
  fn: (): AdminSettings => ({ alertEmail: null, alertEmailEnabled: true }),
});

sample({
  clock: [adminDataModel.AdminPageGate.open, adminAuthModel.loginFx.done],
  source: adminAuthModel.$isAdminAuthenticated,
  filter: (isAuth) => isAuth,
  fn: () => undefined,
  target: getAdminSettingsFx,
});

sample({
  clock: [settingsReceived, settingsCleared],
  fn: ({ alertEmail }) => alertEmail ?? "",
  target: $alertEmail,
});

sample({
  clock: [settingsReceived, settingsCleared],
  fn: ({ alertEmail }) => alertEmail,
  target: $savedAlertEmail,
});

sample({
  clock: [settingsReceived, settingsCleared],
  fn: ({ alertEmailEnabled }) => alertEmailEnabled,
  target: $alertEmailEnabled,
});

sample({
  clock: [settingsReceived, settingsCleared, alertEmailChanged],
  fn: () => null,
  target: $alertEmailError,
});

sample({ clock: alertEmailChanged, target: $alertEmail });

sample({ clock: alertEmailToggled, target: $alertEmailEnabled });

sample({
  clock: settingsSaved,
  source: $alertEmail,
  fn: getAlertEmailError,
  target: $alertEmailError,
});

sample({
  clock: settingsSaved,
  source: {
    alertEmail: $alertEmail,
    alertEmailEnabled: $alertEmailEnabled,
    isSaving: updateAdminSettingsFx.pending,
  },
  filter: (input) => !input.isSaving && isAlertEmailValid(input),
  fn: toSettingsPayload,
  target: updateAdminSettingsFx,
});

sample({
  clock: updateAdminSettingsFx.done,
  fn: () => SETTINGS_SAVED_MESSAGE,
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: testEmailRequested,
  source: { savedAlertEmail: $savedAlertEmail, isSending: sendTestEmailFx.pending },
  filter: ({ savedAlertEmail, isSending }) => Boolean(savedAlertEmail) && !isSending,
  fn: () => undefined,
  target: sendTestEmailFx,
});

sample({
  clock: sendTestEmailFx.doneData,
  fn: ({ sentTo }) => formatTestEmailSent(sentTo),
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: getAdminSettingsFx.fail,
  fn: () => SETTINGS_LOAD_ERROR,
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: updateAdminSettingsFx.failData,
  fn: (error) => extractAxiosError(error, SETTINGS_SAVE_ERROR),
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: sendTestEmailFx.failData,
  fn: (error) => extractAxiosError(error, TEST_EMAIL_ERROR),
  target: notificationsModel.showErrorEvent,
});
