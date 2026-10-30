import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createWatch } from "effector";
import type { Scope } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, expect, it, vi } from "vitest";

import { theme } from "@shared";

import { scopeWithStatus } from "./callNotificationsScope";
import {
  DENIED_TITLE,
  ENABLE_LABEL,
  INVITE_TITLE,
  IOS_INSTALL_REASON,
  IOS_SHARE_LABEL,
} from "../../callNotifications.constants";
import { callNotificationsModel } from "../../model";
import { INVITE_DISMISSED_KEY } from "../../model/callNotifications.constants";
import { CallNotificationsCard } from "../CallNotificationsCard";

const renderCard = (scope: Scope) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <CallNotificationsCard />
      </ThemeProvider>
    </EffectorProvider>
  );

describe("CallNotificationsCard", () => {
  it("should invite the student to turn on notifications", () => {
    renderCard(scopeWithStatus("off"));

    expect(screen.getByText(INVITE_TITLE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ENABLE_LABEL })).toBeInTheDocument();
  });

  it("should turn notifications on from the button", async () => {
    const scope = scopeWithStatus("off");
    const enabled = vi.fn();
    createWatch({ unit: callNotificationsModel.enableClicked, fn: enabled, scope });
    renderCard(scope);

    await userEvent.click(screen.getByRole("button", { name: ENABLE_LABEL }));

    expect(enabled).toHaveBeenCalledTimes(1);
  });

  it("should show the install instruction instead of the button on an iPhone in Safari", () => {
    renderCard(scopeWithStatus("iosInstall"));

    expect(screen.getByText(IOS_INSTALL_REASON)).toBeInTheDocument();
    expect(screen.getByText(IOS_SHARE_LABEL)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ENABLE_LABEL })).not.toBeInTheDocument();
  });

  it("should explain how to allow notifications after a refusal", () => {
    renderCard(scopeWithStatus("denied"));

    expect(screen.getByText(DENIED_TITLE)).toBeInTheDocument();
    expect(screen.getByText(/Уведомления запрещены в настройках браузера/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ENABLE_LABEL })).not.toBeInTheDocument();
  });

  it.each(["on", "unsupported"] as const)("should not show the card when %s", (status) => {
    renderCard(scopeWithStatus(status));

    expect(screen.queryByText(INVITE_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(DENIED_TITLE)).not.toBeInTheDocument();
  });

  it("should not show a card the student closed on this device", () => {
    renderCard(scopeWithStatus("off", true));

    expect(screen.queryByText(INVITE_TITLE)).not.toBeInTheDocument();
  });

  it("should close the card and remember it", async () => {
    renderCard(scopeWithStatus("off"));

    await userEvent.click(screen.getByRole("button", { name: "Скрыть" }));

    expect(screen.queryByText(INVITE_TITLE)).not.toBeInTheDocument();
    expect(localStorage.getItem(INVITE_DISMISSED_KEY)).toBe("1");
  });
});
