import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createWatch, fork } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

import { scopeWithStatus } from "./callNotificationsScope";
import {
  IOS_INSTALL_REASON,
  SETTING_DESCRIPTION,
  SETTING_OFF_LABEL,
  SETTING_ON_LABEL,
  SETTING_SWITCH_LABEL,
  SETTINGS_TITLE,
  UNSUPPORTED_TEXT,
} from "../../callNotifications.constants";
import { callNotificationsModel } from "../../model";
import { CallNotificationsSection } from "../CallNotificationsSection";

const renderSection = (scope: Scope) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <CallNotificationsSection />
      </ThemeProvider>
    </EffectorProvider>
  );

const notificationSwitch = () => screen.getByRole("checkbox", { name: SETTING_SWITCH_LABEL });

describe("CallNotificationsSection", () => {
  it("should say notifications are on with the switch on", () => {
    renderSection(scopeWithStatus("on"));

    expect(screen.getByText(SETTINGS_TITLE)).toBeInTheDocument();
    expect(screen.getByText(SETTING_ON_LABEL)).toBeInTheDocument();
    expect(screen.getByText(SETTING_DESCRIPTION)).toBeInTheDocument();
    expect(notificationSwitch()).toBeChecked();
    expect(notificationSwitch()).toBeEnabled();
  });

  it("should say notifications are off with the switch off", () => {
    renderSection(scopeWithStatus("off"));

    expect(screen.getByText(SETTING_OFF_LABEL)).toBeInTheDocument();
    expect(notificationSwitch()).not.toBeChecked();
  });

  it("should toggle notifications from the switch", async () => {
    const scope = scopeWithStatus("on");
    const toggled = vi.fn();
    createWatch({ unit: callNotificationsModel.toggled, fn: toggled, scope });
    renderSection(scope);

    await userEvent.click(notificationSwitch());

    expect(toggled).toHaveBeenCalledTimes(1);
  });

  it("should lock the switch and explain the refusal", () => {
    renderSection(scopeWithStatus("denied"));

    expect(notificationSwitch()).toBeDisabled();
    expect(screen.getByText(/Уведомления запрещены в настройках браузера/)).toBeInTheDocument();
  });

  it("should lock the switch and show the install instruction on an iPhone in Safari", () => {
    renderSection(scopeWithStatus("iosInstall"));

    expect(notificationSwitch()).toBeDisabled();
    expect(screen.getByText(IOS_INSTALL_REASON)).toBeInTheDocument();
  });

  it("should say notifications are unavailable on this device", () => {
    renderSection(scopeWithStatus("unsupported"));

    expect(screen.getByText(UNSUPPORTED_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("should render nothing until the status is known", () => {
    renderSection(fork());

    expect(screen.queryByText(SETTINGS_TITLE)).not.toBeInTheDocument();
  });
});
