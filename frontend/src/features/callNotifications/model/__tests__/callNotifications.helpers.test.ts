import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { INVITE_DISMISSED_KEY } from "../callNotifications.constants";
import {
  isInstallInstructionVisible,
  isInviteVisible,
  isNotFoundError,
  readInviteDismissed,
  readNotificationEnvironment,
  toCallNotificationsStatus,
  writeInviteDismissed,
} from "../callNotifications.helpers";
import type { CallNotificationsState, NotificationEnvironment } from "../callNotifications.types";

const ANDROID: NotificationEnvironment = {
  isIos: false,
  standalone: false,
  pushSupported: true,
  permission: "default",
};

const state = (overrides: Partial<CallNotificationsState> = {}): CallNotificationsState => ({
  vapidConfigured: true,
  environment: ANDROID,
  permission: "default",
  subscribed: false,
  ...overrides,
});

const axiosError = (status: number) =>
  new AxiosError("request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toCallNotificationsStatus", () => {
  it("should be unknown until the server keys and the device are read", () => {
    expect(toCallNotificationsStatus(state({ vapidConfigured: null }))).toBeNull();
    expect(toCallNotificationsStatus(state({ environment: null }))).toBeNull();
  });

  it("should hide notifications when the server has no push keys", () => {
    expect(toCallNotificationsStatus(state({ vapidConfigured: false }))).toBe("unsupported");
    expect(
      toCallNotificationsStatus(
        state({
          vapidConfigured: false,
          environment: { ...ANDROID, isIos: true, pushSupported: false },
        })
      )
    ).toBe("unsupported");
  });

  it("should ask an iPhone outside the installed app to install it before checking support", () => {
    const safari = { ...ANDROID, isIos: true, standalone: false, pushSupported: false };

    expect(toCallNotificationsStatus(state({ environment: safari }))).toBe("iosInstall");
    expect(toCallNotificationsStatus(state({ environment: safari, permission: "denied" }))).toBe(
      "iosInstall"
    );
  });

  it("should let the installed iPhone app subscribe", () => {
    const installed = { ...ANDROID, isIos: true, standalone: true };

    expect(toCallNotificationsStatus(state({ environment: installed }))).toBe("off");
  });

  it("should call a browser without push unsupported", () => {
    expect(
      toCallNotificationsStatus(state({ environment: { ...ANDROID, pushSupported: false } }))
    ).toBe("unsupported");
  });

  it("should report a refusal even when a subscription is left over", () => {
    expect(toCallNotificationsStatus(state({ permission: "denied", subscribed: true }))).toBe(
      "denied"
    );
  });

  it("should be on only with both the permission and the subscription", () => {
    expect(toCallNotificationsStatus(state({ permission: "granted", subscribed: true }))).toBe(
      "on"
    );
    expect(toCallNotificationsStatus(state({ permission: "granted", subscribed: false }))).toBe(
      "off"
    );
    expect(toCallNotificationsStatus(state({ permission: "default", subscribed: true }))).toBe(
      "off"
    );
  });
});

describe("readNotificationEnvironment", () => {
  it("should read an iPhone in Safari without push support", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
    );

    expect(readNotificationEnvironment()).toEqual({
      isIos: true,
      standalone: false,
      pushSupported: false,
      permission: "default",
    });
  });

  it("should read the permission of a browser with push", () => {
    vi.stubGlobal("PushManager", class {});
    vi.stubGlobal("Notification", { permission: "granted" });
    Object.defineProperty(navigator, "serviceWorker", { value: {}, configurable: true });

    try {
      expect(readNotificationEnvironment()).toMatchObject({
        pushSupported: true,
        permission: "granted",
      });
    } finally {
      Reflect.deleteProperty(navigator, "serviceWorker");
    }
  });
});

describe("isNotFoundError", () => {
  it("should recognize only a 404 response", () => {
    expect(isNotFoundError(axiosError(404))).toBe(true);
    expect(isNotFoundError(axiosError(500))).toBe(false);
    expect(isNotFoundError(new Error("network"))).toBe(false);
  });
});

describe("invite dismissal", () => {
  it("should remember the dismissed invite on the device", () => {
    expect(readInviteDismissed()).toBe(false);

    writeInviteDismissed();

    expect(localStorage.getItem(INVITE_DISMISSED_KEY)).toBe("1");
    expect(readInviteDismissed()).toBe(true);
  });

  it("should treat unavailable storage as not dismissed", () => {
    const blocked = () => {
      throw new Error("SecurityError");
    };
    vi.spyOn(window, "localStorage", "get").mockReturnValue({
      getItem: blocked,
      setItem: blocked,
    } as unknown as Storage);

    expect(() => writeInviteDismissed()).not.toThrow();
    expect(readInviteDismissed()).toBe(false);
  });
});

describe("isInviteVisible", () => {
  it.each(["off", "iosInstall", "denied"] as const)("should invite while %s", (status) => {
    expect(isInviteVisible(status, false)).toBe(true);
  });

  it.each(["on", "unsupported", null] as const)("should not invite when %s", (status) => {
    expect(isInviteVisible(status, false)).toBe(false);
  });

  it("should not invite on a device that closed the invite", () => {
    expect(isInviteVisible("off", true)).toBe(false);
  });
});

describe("isInstallInstructionVisible", () => {
  const closed = {
    status: "iosInstall" as const,
    inviteShown: true,
    inviteCardOpen: false,
    settingsSectionOpen: false,
  };

  it("should be visible on the invite card while it is shown", () => {
    expect(isInstallInstructionVisible({ ...closed, inviteCardOpen: true })).toBe(true);
  });

  it("should not be visible on a closed invite card", () => {
    expect(
      isInstallInstructionVisible({ ...closed, inviteCardOpen: true, inviteShown: false })
    ).toBe(false);
  });

  it("should be visible in the settings section whatever the invite card does", () => {
    expect(
      isInstallInstructionVisible({ ...closed, settingsSectionOpen: true, inviteShown: false })
    ).toBe(true);
  });

  it("should not be visible where neither surface is mounted", () => {
    expect(isInstallInstructionVisible(closed)).toBe(false);
  });

  it.each(["off", "on", "denied", "unsupported", null] as const)(
    "should not be visible when %s",
    (status) => {
      expect(
        isInstallInstructionVisible({
          status,
          inviteShown: true,
          inviteCardOpen: true,
          settingsSectionOpen: true,
        })
      ).toBe(false);
    }
  );
});
