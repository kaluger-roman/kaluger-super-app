import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allSettled, fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect } from "vitest";

import { adminSettingsModel } from "@features/admin";
import type { AdminSettings } from "@shared";
import { notificationsModel, theme } from "@shared";

import { SettingsSection } from "../SettingsSection";

const EMAIL_LABEL = "Email для уведомлений";
const SWITCH_LABEL = "Отправлять алерты на почту";

const renderSection = (saved: AdminSettings = { alertEmail: null, alertEmailEnabled: true }) => {
  const savedPayloads: AdminSettings[] = [];
  const testEmails: string[] = [];
  const scope = fork({
    values: [
      [adminSettingsModel.$alertEmail, saved.alertEmail ?? ""],
      [adminSettingsModel.$savedAlertEmail, saved.alertEmail],
      [adminSettingsModel.$alertEmailEnabled, saved.alertEmailEnabled],
    ],
    handlers: [
      [
        adminSettingsModel.updateAdminSettingsFx,
        (data: AdminSettings) => {
          savedPayloads.push(data);
          return Promise.resolve(data);
        },
      ],
      [
        adminSettingsModel.sendTestEmailFx,
        () => {
          testEmails.push("admin@example.com");
          return Promise.resolve({ sentTo: "admin@example.com" });
        },
      ],
    ],
  });
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <SettingsSection />
      </ThemeProvider>
    </EffectorProvider>
  );
  return { scope, savedPayloads, testEmails };
};

const emailField = () => screen.getByLabelText(EMAIL_LABEL);
const saveButton = () => screen.getByRole("button", { name: "Сохранить" });
const testEmailButton = () => screen.getByRole("button", { name: "Отправить тестовое письмо" });
const emailSwitch = () => screen.getByRole("checkbox", { name: SWITCH_LABEL });

describe("SettingsSection", () => {
  it("should show the saved settings", () => {
    renderSection({ alertEmail: "admin@example.com", alertEmailEnabled: false });

    expect(emailField()).toHaveValue("admin@example.com");
    expect(emailSwitch()).not.toBeChecked();
    expect(testEmailButton()).toBeEnabled();
  });

  it("should save the typed address and confirm it", async () => {
    const { scope, savedPayloads } = renderSection();

    await userEvent.type(emailField(), "admin@example.com");
    await userEvent.click(saveButton());
    await allSettled(scope);

    expect(savedPayloads).toEqual([{ alertEmail: "admin@example.com", alertEmailEnabled: true }]);
    expect(scope.getState(notificationsModel.$notification)).toMatchObject({
      message: "Настройки сохранены",
      type: "success",
    });
  });

  it("should show «Некорректный email» and not save an invalid address", async () => {
    const { scope, savedPayloads } = renderSection();

    await userEvent.type(emailField(), "admin@example");
    await userEvent.click(saveButton());
    await allSettled(scope);

    expect(savedPayloads).toHaveLength(0);
    expect(screen.getByText("Некорректный email")).toBeInTheDocument();
    expect(emailField()).toHaveAttribute("aria-invalid", "true");

    await userEvent.type(emailField(), ".com");

    expect(screen.queryByText("Некорректный email")).not.toBeInTheDocument();
  });

  it("should enable the test letter only after the address is saved", async () => {
    const { scope, testEmails } = renderSection();

    await userEvent.type(emailField(), "admin@example.com");

    expect(testEmailButton()).toBeDisabled();

    await userEvent.click(saveButton());
    await allSettled(scope);

    expect(testEmailButton()).toBeEnabled();

    await userEvent.click(testEmailButton());
    await allSettled(scope);

    expect(testEmails).toHaveLength(1);
    expect(scope.getState(notificationsModel.$notification)).toMatchObject({
      message: "Письмо отправлено на admin@example.com",
      type: "success",
    });
  });

  it("should send the switch state on save", async () => {
    const { scope, savedPayloads } = renderSection({
      alertEmail: "admin@example.com",
      alertEmailEnabled: true,
    });

    await userEvent.click(emailSwitch());

    expect(savedPayloads).toHaveLength(0);

    await userEvent.click(saveButton());
    await allSettled(scope);

    expect(savedPayloads).toEqual([{ alertEmail: "admin@example.com", alertEmailEnabled: false }]);
    expect(emailSwitch()).not.toBeChecked();
  });
});
