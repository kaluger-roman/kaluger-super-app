import { createEffect, createEvent, sample } from "effector";

import { taxRatePeriodModel, userModel } from "@entities";
import { authApi, notificationsModel } from "@shared";

import {
  NO_PERIODS_ERROR,
  extractFinancesErrorMessage,
  isInvalidEnableAttempt,
} from "./finances.helpers";

export const taxEnabledRequested = createEvent<boolean>();

export const setTaxEnabledFx = createEffect(async (target: boolean) =>
  authApi.updateProfile({ taxEnabled: target }),
);

// Guard: enabling without any period — show notification, do not call API
sample({
  clock: taxEnabledRequested,
  source: taxRatePeriodModel.$periods,
  filter: (periods, target) => isInvalidEnableAttempt({ target, periods }),
  fn: () => NO_PERIODS_ERROR,
  target: notificationsModel.showErrorEvent,
});

// Otherwise — send to server
sample({
  clock: taxEnabledRequested,
  source: taxRatePeriodModel.$periods,
  filter: (periods, target) => !isInvalidEnableAttempt({ target, periods }),
  fn: (_periods, target) => target,
  target: setTaxEnabledFx,
});

// On success — sync user store
sample({
  clock: setTaxEnabledFx.doneData,
  target: userModel.updateUser,
});

sample({
  clock: setTaxEnabledFx.doneData,
  fn: (user) =>
    user.taxEnabled ? "Учёт налога включён" : "Учёт налога выключен",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: setTaxEnabledFx.failData,
  fn: extractFinancesErrorMessage,
  target: notificationsModel.showErrorEvent,
});
