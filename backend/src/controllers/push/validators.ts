import type { PushSubscriptionDto } from "../../types";

const INVALID_SUBSCRIPTION_ERROR = "Некорректные данные подписки";
const MAX_DEVICE_NAME_LENGTH = 100;

const isValidUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export const validateSubscriptionData = (
  data: PushSubscriptionDto | undefined
): { isValid: true } | { isValid: false; error: string } => {
  const endpoint = data?.subscription?.endpoint;
  if (typeof endpoint !== "string" || !endpoint || !isValidUrl(endpoint)) {
    return { isValid: false, error: INVALID_SUBSCRIPTION_ERROR };
  }

  const keys = data?.subscription?.keys;
  if (
    typeof keys?.p256dh !== "string" ||
    !keys.p256dh ||
    typeof keys.auth !== "string" ||
    !keys.auth
  ) {
    return { isValid: false, error: INVALID_SUBSCRIPTION_ERROR };
  }

  if (data?.deviceName !== undefined && data.deviceName !== null) {
    if (typeof data.deviceName !== "string") {
      return { isValid: false, error: INVALID_SUBSCRIPTION_ERROR };
    }
    if (data.deviceName.length > MAX_DEVICE_NAME_LENGTH) {
      return { isValid: false, error: "Название устройства слишком длинное" };
    }
  }

  return { isValid: true };
};
