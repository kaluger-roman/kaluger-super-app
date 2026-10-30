import { removeDevice } from "@entities";
import { notificationsApi, studentPushApi } from "@shared";

import type { CleanupParams } from "./sessionCleanup.types";

export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(undefined), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

// FR-024: the device stops receiving this account's notifications. Any server error is ignored
// (not this account's device or the server is unreachable): the logout goes on.
export const removeDeviceSubscription = async ({
  role,
  registration,
}: CleanupParams): Promise<void> => {
  if (!registration) return;
  const api = role === "tutor" ? notificationsApi : studentPushApi;
  await removeDevice(registration, api.unsubscribe, () => true);
};
