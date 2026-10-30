import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createWatch, fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { notificationsModel } from "@entities";
import type { PushPermissionState } from "@entities";
import { theme } from "@shared";

import { server } from "../../../../../__tests__/mocks/server";
import { CallNotificationSettings } from "../CallNotificationSettings";
import {
  CALL_NOTIFICATIONS_DESCRIPTION,
  CALL_NOTIFICATIONS_LABEL,
  CALL_NOTIFICATIONS_TITLE,
} from "../CallNotificationSettings.constants";

type Setup = {
  supported?: boolean;
  vapidKey?: string | null;
  enabled?: boolean;
  permission?: PushPermissionState;
};

const DENIED_HELP = /Уведомления запрещены в настройках браузера/;

const settingsScope = ({
  supported = true,
  vapidKey = "key",
  enabled = true,
  permission = "default",
}: Setup = {}) =>
  fork({
    values: [
      [notificationsModel.$isPushSupported, supported],
      [notificationsModel.$vapidKey, vapidKey],
      [notificationsModel.$pushPermission, permission],
      [
        notificationsModel.$reminderSettings,
        {
          enabled: false,
          intervals: [],
          muteWhenInLesson: false,
          callNotificationsEnabled: enabled,
        },
      ],
    ],
  });

const renderSettings = (scope: Scope) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <CallNotificationSettings />
      </ThemeProvider>
    </EffectorProvider>
  );

describe("CallNotificationSettings", () => {
  it("should show the incoming call switch on by default", () => {
    renderSettings(settingsScope());

    expect(screen.getByText(CALL_NOTIFICATIONS_TITLE)).toBeInTheDocument();
    expect(screen.getByText(CALL_NOTIFICATIONS_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: CALL_NOTIFICATIONS_LABEL })).toBeChecked();
  });

  it("should show the switch off when the tutor turned calls off", () => {
    renderSettings(settingsScope({ enabled: false }));

    expect(screen.getByRole("checkbox", { name: CALL_NOTIFICATIONS_LABEL })).not.toBeChecked();
  });

  it("should toggle call notifications on a click", async () => {
    server.use(
      http.put("*/api/reminder-settings", () =>
        HttpResponse.json({
          enabled: false,
          intervals: [],
          muteWhenInLesson: false,
          callNotificationsEnabled: false,
        })
      )
    );
    const scope = settingsScope();
    const toggled = vi.fn();
    createWatch({ unit: notificationsModel.callNotificationsToggled, fn: toggled, scope });
    renderSettings(scope);

    await userEvent.click(screen.getByRole("checkbox", { name: CALL_NOTIFICATIONS_LABEL }));

    expect(toggled).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("checkbox", { name: CALL_NOTIFICATIONS_LABEL, checked: false })
    ).toBeInTheDocument();
  });

  it("should show calls off on a device without a subscription and subscribe it in one tap", async () => {
    const subscribe = vi.fn();
    const scope = fork({
      values: [
        [notificationsModel.$isPushSupported, true],
        [notificationsModel.$vapidKey, "key"],
        [notificationsModel.$serviceWorkerRegistration, {} as ServiceWorkerRegistration],
        [notificationsModel.$isPushSubscribed, false],
      ],
      handlers: [[notificationsModel.subscribePushFx, subscribe]],
    });
    renderSettings(scope);
    const toggle = screen.getByRole("checkbox", { name: CALL_NOTIFICATIONS_LABEL });
    expect(toggle).not.toBeChecked();

    await userEvent.click(toggle);

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("checkbox", { name: CALL_NOTIFICATIONS_LABEL, checked: true })
    ).toBeInTheDocument();
  });

  it("should explain how to allow notifications the browser denied", () => {
    renderSettings(settingsScope({ permission: "denied" }));

    expect(screen.getByText(DENIED_HELP)).toBeInTheDocument();
    expect(screen.getByText("Android — Настройки сайта → Уведомления")).toBeInTheDocument();
  });

  it.each(["default", "granted"] as const)("should not show the help when %s", (permission) => {
    renderSettings(settingsScope({ permission }));

    expect(screen.queryByText(DENIED_HELP)).not.toBeInTheDocument();
  });

  it("should explain how to allow notifications once the browser refuses them on turning calls on", async () => {
    vi.stubGlobal("Notification", {
      permission: "denied",
      requestPermission: vi.fn().mockResolvedValue("denied"),
    });
    const scope = fork({
      values: [
        [notificationsModel.$isPushSupported, true],
        [notificationsModel.$vapidKey, "key"],
        [notificationsModel.$serviceWorkerRegistration, {} as ServiceWorkerRegistration],
        [notificationsModel.$isPushSubscribed, false],
        [notificationsModel.$pushPermission, "default"],
      ],
    });
    renderSettings(scope);
    expect(screen.queryByText(DENIED_HELP)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: CALL_NOTIFICATIONS_LABEL }));

    expect(await screen.findByText(DENIED_HELP)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: CALL_NOTIFICATIONS_LABEL })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: CALL_NOTIFICATIONS_LABEL })).toBeDisabled();
  });

  it("should lock the switch while the browser denies notifications (regression)", () => {
    renderSettings(settingsScope({ permission: "denied" }));

    expect(screen.getByRole("checkbox", { name: CALL_NOTIFICATIONS_LABEL })).toBeDisabled();
    expect(screen.getByText(DENIED_HELP)).toBeInTheDocument();
  });

  it.each(["default", "granted"] as const)(
    "should keep the switch usable when %s",
    (permission) => {
      renderSettings(settingsScope({ permission }));

      expect(screen.getByRole("checkbox", { name: CALL_NOTIFICATIONS_LABEL })).toBeEnabled();
    }
  );

  it("should be hidden where the browser has no push", () => {
    renderSettings(settingsScope({ supported: false }));

    expect(screen.queryByText(CALL_NOTIFICATIONS_TITLE)).not.toBeInTheDocument();
  });

  it("should be hidden while the server has no push keys", () => {
    renderSettings(settingsScope({ vapidKey: null }));

    expect(screen.queryByText(CALL_NOTIFICATIONS_TITLE)).not.toBeInTheDocument();
  });
});
